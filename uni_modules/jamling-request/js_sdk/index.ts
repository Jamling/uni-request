import {
  CombineRequestOptions,
  CombineUploadOptions,
  GlobalRequestOptions,
  Interceptor,
  RequestState,
  SuccessCallbackResult,
  UniMpOptions,
} from "./types";
/** 全局拦截器 */
const globalInterceptor : Interceptor = {};
/** 全局配置 */
const globalOptions : GlobalRequestOptions = {
  encoding: "UTF-8",
  business: "data",
  contentType: "json",
  header: {},
};

/**
 * 设置并合并配置
 *
 * @param config - GlobalRequestOptions
 *
 * @example
 * setConfig({
 *   timeout: 5000,
 *   interceptor: {
 *     request: (req) => { // modify request },
 *     response: (res) => { // handle response }
 *   }
 * });
 */
export function setConfig(config : GlobalRequestOptions) : void {
  Object.assign(globalOptions, config);
  Object.assign(globalInterceptor, config.interceptor);
}

export function setMPConfig(config : UniMpOptions) : void {
  Object.assign(globalOptions, config);
}

export function get<T = any>(
  options : CombineRequestOptions
) : UniApp.RequestTask | Promise<T> {
  options.method = "GET";
  return request<T>(options);
}
export function post<T = any>(
  options : CombineRequestOptions
) : UniApp.RequestTask | Promise<T> {
  options.method = "POST";
  return request<T>(options);
}
export function put<T = any>(
  options : CombineRequestOptions
) : UniApp.RequestTask | Promise<T> {
  options.method = "PUT";
  return request<T>(options);
}
export function del<T = any>(
  options : CombineRequestOptions
) : UniApp.RequestTask | Promise<T> {
  options.method = "DELETE";
  return request<T>(options);
}
/**
 * 发起网络请求
 *
 * @template T - T
 * @param options - CombineRequestOptions
 * @returns UniApp.RequestTask | Promise<T>
 *
 * @example
 * // Promise-style
 * request<MyData>({ url: '/api/resource' })
 *   .then(res => { // response typed as MyData })
 *   .catch(err => { // handle error })
 *
 * @example
 * // Callback-style (intended to return a UniApp.RequestTask)
 * const task = request({
 *   url: '/api/resource',
 *   success: res => { // custom callback (will be replaced by internal handler) }
 * })
 */
export function request<T = any>(
  options : CombineRequestOptions
) : UniApp.RequestTask | Promise<T> {
  return send<T>(options, "request");
}

export function upload<T = any>(
  options : CombineUploadOptions
) : UniApp.UploadTask | Promise<T> {
  if (options.contentType !== "file") {
    options.contentType = "file";
    options.debug && console.warn("文件上传contentType已自动修改为file");
  }
  if (options.method !== "POST") {
    options.method = "POST";
    options.debug && console.warn("文件上传method已自动修改为POST");
  }
  return send<T>(options, "uploadFile") as UniApp.UploadTask | Promise<T>;
}

function send<T>(
  options : CombineRequestOptions | CombineUploadOptions,
  method : "request" | "uploadFile" = "request"
) : Promise<T> | UniApp.RequestTask | UniApp.UploadTask {
  let _options : CombineRequestOptions | CombineUploadOptions = {
    ...globalOptions,
    ...options,
  };
  callback(globalInterceptor.request, _options);
  handleRequestOptions(_options);
  callback(globalInterceptor.prepare, _options);
  let state : Partial<RequestState> = {
    config: _options,
    startTime: Date.now(),
  };

  if (_options.success && typeof _options.success === "function") {
    let task = execute<T>(options, method, state, null, null);
    return task;
  }

  let promise = new Promise<T>((resolve, reject) => {
    let task = execute<T>(options, method, state, resolve, reject);
    state.abort = task.abort;
  });
  return promise;
}

function execute<T>(
  options : CombineRequestOptions | CombineUploadOptions,
  method : "request" | "uploadFile" = "request",
  state : Partial<RequestState>,
  resolve : ResolveType<T>,
  reject : RejectType
) : UniApp.RequestTask | UniApp.UploadTask {
  let _options : CombineRequestOptions | CombineUploadOptions = {
    ...options,
    success: (
      res : UniApp.UploadFileSuccessCallbackResult | UniApp.UploadFileSuccessCallbackResult
    ) => {
      _handleSuccessCallback<T>(state, res, resolve, reject);
    },
    fail: (res : UniApp.GeneralCallbackResult) => {
      _handleFailCallback<T>(state, res, resolve, reject);
    },
    complete: (res : UniApp.GeneralCallbackResult) => {
      _handleCompleteCallback(state, res, resolve, reject);
    },
  };
  let task = callback(uni[method], _options);
  if (method === "uploadFile") {
    return task as UniApp.UploadTask;
  }
  return task as UniApp.RequestTask;
}

function callback(fn : any, ...args : any[]) {
  if (fn && typeof fn === "function") {
    return fn(...args);
  }
}

type ContentType = [string | null, string | null];
function handleRequestOptions(
  options : CombineRequestOptions | CombineUploadOptions | any
) {
  if (options.responseType === "arraybuffer") {
    if (options.debug) {
      console.debug(
        "响应类型为 arraybuffer, dataType 自动设置为 arraybuffer, 避免uni-app对响应数据进行错误的编码转换"
      );
    }
    options.dataType = "arraybuffer";
  }
  let contentType : ContentType = [null, null];
  switch (options.contentType) {
    case "json":
      contentType[0] = "application/json";
      break;
    case "form":
      contentType[0] = "application/x-www-form-urlencoded";
      break;
    case "file":
      contentType[0] = "multipart/form-data";
      if (options.method !== "POST") {
        options.debug && console.warn("文件上传，method已自动设置为POST");
        options.method = "POST";
      }
      if (options.data && typeof options === "object") {
        options.debug && console.warn("文件上传，data参数已自动转为formData");
        let data = options.data as object;
        options.formData = {
          ...(options.formData ?? {}),
          ...data,
        };
        delete options.data;
      }
      break;
    default:
      options.debug &&
        console.warn("unsupported content type : " + options.contentType);
      break;
  }

  contentType[1] = options.encoding ? "charset=" + options.encoding : "";
  if (contentType[0]) {
    options.header["Content-Type"] = contentType.join(";");
  }

  if (options.header["Referer"]) {
    options.debug && console.warn("header 中不能设置 Referer，已自动删除");
    delete options.header["Referer"];
  }

  if (!/^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(options.url) && options.baseUrl) {
    if (options.baseUrl.endsWith("/") && options.url.startsWith("/")) {
      options.url = options.url.substring(1);
    } else if (!options.baseUrl.endsWith("/") && !options.url.startsWith("/")) {
      options.url = "/" + options.url;
    }
    options.url = options.baseUrl + options.url;
  }
  if (options.loadingTip) {
    uni.showLoading({
      title: options.loadingTip,
    });
  }
}

type ResolveType<T> = null | ((value : T | PromiseLike<T>) => void);
type RejectType = null | ((reason ?: any) => void);
function _handleSuccessCallback<T>(
  state : Partial<RequestState>,
  res : SuccessCallbackResult,
  resolve : ResolveType<T>,
  reject : RejectType
) {
  // TODO handle MP POST redirect
  if (res.statusCode < 200 || res.statusCode >= 300) {
    _handleFailCallback(state, res, resolve, reject);
    return;
  }
  let result = res.data; // 响应数据
  // 二进制
  if (
    state.config?.responseType === "arraybuffer" &&
    result instanceof ArrayBuffer
  ) {
    state.config?.debug &&
      console.debug("响应数据为 ArrayBuffer 二进制数据，跳过后续处理");
    callback(state.config?.success || resolve, result);
    return;
  }
  // 文件上传自动
  let parseFileJson =
    state.config?.contentType === "file" &&
    typeof result === "string" &&
    (state.config?.dataType === undefined || state.config?.dataType === "json");
  if (parseFileJson) {
    state.config?.debug && console.debug("文件上传响应数据进行一次JSON.parse");
    try {
      result = JSON.parse(res.data as string);
    } catch (e) {
      state.config?.debug && console.warn("文件上传响应数据JSON.parse失败:", e);
    }
  }

  if (!state.config?.skipInterceptorResponse && typeof result === "object") {
    callback(globalInterceptor.response, result, state);
  } else if (state.config?.debug) {
    state.config?.debug &&
      console.debug(
        "请求已设置跳过全局响应拦截或不满足拦截条件 skip:",
        state.config?.skipInterceptorResponse
      );
  }
  if (state.config?.skipInterceptorResponse || state.isSuccess) {
    result = getData(result as object, state.config?.business);
    state.isEmpty = isEmpty(result);
    state.config?.debug &&
      console.log(`request (${state.config?.url}) success, data: `, result);
    callback(state.config?.success || resolve, result);
    return;
  }
  state.config?.debug &&
    console.warn("请求未标记为成功，跳过 success 回调，进入 fail 处理流程");
  _handleFailCallback<T>(state, result, resolve, reject);
}

function _handleFailCallback<T>(
  state : Partial<RequestState>,
  res : UniApp.GeneralCallbackResult | any,
  resolve : ResolveType<T>,
  reject : RejectType
) {
  state.response = res;
  state.error = res.errMsg;
  if (res.errMsg === "request:fail abort") {
    state.config?.debug &&
      console.log(`request (${state.config?.url}) abort, abort called? `);
    return;
  }
  callback(globalInterceptor.fail, res, state);
  callback(state.config?.fail || reject, res);
}

function _handleCompleteCallback<T>(
  state : Partial<RequestState>,
  res : UniApp.GeneralCallbackResult,
  resolve : ResolveType<T>,
  reject : RejectType
) {
  callback(globalInterceptor.complete, res, state);
  let cost = Date.now() - state.startTime;
  state.config?.debug &&
    console.debug(`request (${state.config?.url}) cost in ${cost} ms`);
  let delay = Math.max(0, (state.config?.loadingDuration || 500) - cost);
  setTimeout(() => uni.hideLoading(), delay);
  callback(state.config?.complete, res);
}

function getData(
  data : Record<string, any>,
  dataPath : string | undefined | null,
  defaultValue ?: any
) {
  if (!dataPath) {
    return data;
  }
  let path = dataPath.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  return path.split(".").reduce((obj, key) => obj?.[key], data) || defaultValue;
}

function isEmpty(data : any) : boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data).length === 0;
  return false;
}
const version = "2.0.0";
export default {
  version,
  setConfig,
  get,
  post,
  put,
  delete: del,
  request,
  upload,
  getData,
  interceptor: globalInterceptor,
};