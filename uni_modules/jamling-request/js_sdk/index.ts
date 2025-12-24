import { CombineRequestOptions, CombineUploadOptions, GlobalRequestOptions, Interceptor, RequestState, UniMpOptions } from "./types";
/** 全局拦截器 */
const globalInterceptor : Interceptor = {}
/** 全局配置 */
const globalOptions : GlobalRequestOptions = {
    encoding: 'UTF-8',
    business: 'data',
    contentType: 'json',
    header: {},
};

/**
 * 设置并合并配置
 *
 * @param config - GlobalRequestOptions 
 *
 * @example ```ts
 * setConfig({
 *   timeout: 5000,
 *   interceptor: {
 *     request: (req) => { // modify request },
 *     response: (res) => { // handle response }
 *   }
 * });
 * ```
 */
export function setConfig(config : GlobalRequestOptions): void {
    Object.assign(globalOptions, config)
    Object.assign(globalInterceptor, config.interceptor)
}

export function setMPConfig(config : UniMpOptions) : void{
    Object.assign(globalOptions, config)
}

export function get(options : CombineRequestOptions) {
    options.method = 'GET'
    return request(options)
}
export function post(options : CombineRequestOptions) {
    options.method = 'POST'
    return request(options)
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
 * request<{ data: MyData }>({ url: '/api/resource' })
 *   .then(response => { // response typed as MyData })
 *   .catch(err => { // handle error })
 *
 * @example
 * // Callback-style (intended to return a UniApp.RequestTask)
 * const task = request({
 *   url: '/api/resource',
 *   success: res => { // custom callback (will be replaced by internal handler) }
 * })
 */
export function request<T = any>(options : CombineRequestOptions) : UniApp.RequestTask | Promise<T> {
    let _options : CombineRequestOptions = { ...globalOptions, ...options }
    callback(globalInterceptor.request, _options)
    //callback(_options.interceptor?.request)
    handleRequestOptions(_options)
    let state : Partial<RequestState> = {
        config: _options,
        startTime: Date.now()
    }
    
    if (_options.success && typeof _options.success === 'function') {
        let resolvedOption : CombineRequestOptions = {
            ..._options,
            success: (res : UniApp.RequestSuccessCallbackResult) => {
                _handleSuccessCallback(state, res, null, null)
            },
            fail: (res : UniApp.GeneralCallbackResult) => {
                _handleFailCallback(state, res, null, null)
            },
            complete: (res : UniApp.GeneralCallbackResult) => {
                _handleCompleteCallback(state, res, null, null)
            },
        }
        let task = uni.request(resolvedOption) as any as UniApp.RequestTask
        return task
    }
    
    let promise = new Promise<T>((resolve, reject) => {
        if (state.isError) {
            reject(state.error)
        } else {
            resolve(state.data as T)
        }
    })
    return promise;
}


export function upload(options : CombineUploadOptions) {
    options.contentType = 'file'

}

function callback(fn : any, ...args : any[]) {
    if (fn && typeof fn === 'function') {
        return fn(...args)
    }
}

type ContentType = [string | null, string | null]
function handleRequestOptions(options : CombineRequestOptions | CombineUploadOptions | any) {
    if (options.responseType === 'arraybuffer') {
        if (options.debug) {
            console.debug('响应类型为 arraybuffer, dataType 自动设置为 arraybuffer, 避免uni-app对响应数据进行错误的编码转换')
        }
        options.dataType = 'arraybuffer'
    }
    let contentType : ContentType = [null, null]
    switch (options.contentType) {
        case 'json':
            contentType[0] = 'application/json'
            break
        case 'form':
            contentType[0] = 'application/x-www-form-urlencoded'
            break
        case 'file':
            contentType[0] = 'multipart/form-data'
            if (options.method !== 'POST') {
                console.warn('文件上传，method已自动设置为POST');
                options.method = 'POST'
            }
            if (options.data && typeof options === 'object') {
                console.warn('文件上传，data参数已自动转为formData');
                let data = options.data as object
                options.formData = {
                    ...options.formData ?? {},
                    ...data
                }
                delete options.data
            }
            break
        default:
            //throw new Error('unsupported content type : ' + type)
            break
    }

    contentType[1] = options.encoding ? `charset=${options.encoding}` : ''
    if (contentType[0]) {
        options.header['Content-Type'] = contentType.join(';')
    }

    if (options.header['Referer']) {
        console.warn('header 中不能设置 Referer，已自动删除');
        delete options.header['Referer']
    }

    if (options.baseUrl) {
        if (options.baseUrl.endsWith('/') && options.url.startsWith('/')) {
            options.url = options.url.substring(1)
        } else if (!options.baseUrl.endsWith('/') && !options.url.startsWith('/')) {
            options.url = '/' + options.url
        }
        options.url = options.baseUrl + options.url
    }
    if (options.loadingTip) {
        uni.showLoading({
            title: options.loadingTip
        })
    }
}

type SuccessCallbackResult = Partial<UniApp.UploadFileSuccessCallbackResult> | Partial<UniApp.RequestSuccessCallbackResult>
type ResolveType = null | ((value : any) => void)
type RejectType = null | ((reason ?: any) => void)
function _handleSuccessCallback(state : Partial<RequestState>, res : SuccessCallbackResult, resolve : ResolveType, reject : RejectType) {
    // TODO handle MP POST redirect
    if (res.statusCode !== 200) {
        _handleFailCallback(state, res, resolve, reject)
        return
    }
    let result = res.data // 响应数据
    // 文件上传自动
    let parseFileJson = state.config?.contentType === 'file' && typeof result === 'string' && (state.config?.dataType ===
        undefined || state.config?.dataType === 'json')
    if (parseFileJson) {
        console.debug('文件上传响应数据进行一次JSON.parse')
        try {
            result = JSON.parse(res.data as string);
        } catch (e) {
            console.warn('文件上传响应数据JSON.parse失败:', e)
        }
    }

    if (!state.config?.skipInterceptorResponse && typeof result === 'object') {
        callback(globalInterceptor.response, result, state.config)
        result = getData(result as object, state.config?.business)
    } else if (state.config?.debug) {
        console.debug('请求已设置跳过全局响应拦截或不满足拦截条件 skip:', state.config?.skipInterceptorResponse)
    }
    console.log(`request (${state.config?.url}) success, data: `, result)
    //state.config?.success ? callback(state.config?.success, result) : resolve(result)
}

function _handleFailCallback(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult | any, resolve : ResolveType, reject : RejectType) {
    state.response = res
    if (res.errMsg === 'request:fail abort') {
        return
    }
    let result = callback(globalInterceptor.error, res, state.config) || res
    //state.config?.fail ? callback(state.config?.fail, result) : reject(result)
}

function _handleCompleteCallback(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult, resolve : ResolveType, reject : RejectType) {
    callback(globalInterceptor.complete, res, state.config)
    let cost = Date.now() - state.startTime
    if (state.config?.debug) {
        console.log(`request cost in ${cost} ms of ${state.config.url}`)
    }
    let delay = Math.max(0, (state.config?.loadingDuration || 500) - cost)
    setTimeout(() => uni.hideLoading(), delay)
    callback(state.config?.complete, res)
}

function getData(data : Record<string, any>, dataPath : string | undefined | null, defaultValue ?: any) {
    if (!dataPath) {
        return data
    }
    let path = dataPath.replace(/\[(\w+)\]/g, '.$1')
        .replace(/^\./, '')
    return path.split('.').reduce((obj, key) => obj?.[key], data) || defaultValue
}

export default {
    setConfig,
    get,
    post,
    request,
    upload,
    getData
}