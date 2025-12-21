/**允许定义的uni-app全局选项*/
type UniGlobalOptions = Omit<UniApp.RequestOptions, 'url' | 'data' | 'success' | 'fail' | 'complete'>

type UniMpOptions = Pick<UniApp.RequestOptions, 'enableHttp2' | 'enableHttpDNS' | 'enableQuic' | 'enableCache' | 'httpDNSServiceId' | 'forceCellularNetwork' | 'enableCookie' | 'cloudCache' | 'defer'>

/**本库定义的额外全局选项*/
interface ExtGlobalOptions {
    /**请求基地址，使用/结尾*/
    baseUrl ?: string
    contentType ?: 'json' | 'form' | 'file'
    business : string
    encoding ?: string
    debug ?: boolean
    /** 请求头 */
    header ?: Record<string, any>
    /** 是否启用防抖（毫秒） */
    debounce ?: number
    /** 是否启用节流（毫秒） */
    throttle ?: number
    /** 是否立即执行（在组件挂载时） */
    immediate ?: boolean
    /** 是否启用重试 */
    retry ?: {
        /** 重试次数 */
        count : number
        /** 重试延迟（毫秒） */
        delay : number | ((count : number) => number)
    }
    interceptor ?: {
        request : RequestInterceptor

    }
}
interface ExtRequestOptions {
    /** 是否在请求前显示文字为参数值的loading提示，如果是，会在请求结束后自动关闭loading提示 */
    loadingTip : string,
    /** 设置loadingTip时的最小loading显示时间 */
    loadingDuration : number,
    /** 是否跳过响应过滤器，如需跳过，请置true */
    skipInterceptorResponse : boolean
}
interface RequestInterceptor {
    (config : GlobalRequestOptions) : GlobalRequestOptions | Promise<GlobalRequestOptions> | any
}

type GlobalRequestOptions = UniGlobalOptions & ExtGlobalOptions
type CombineRequestOptions = UniApp.RequestOptions & Omit<ExtGlobalOptions, 'interceptor'> & UniApp.UploadFileOption & Partial<ExtRequestOptions>



const defaultOptions : GlobalRequestOptions = {
    encoding: 'UTF-8',
    business: 'data',
    contentType: 'json',
}

let globalInterceptor;
let globalOptions;
export function setConfig(config : GlobalRequestOptions) {
    globalOptions = {
        ...globalOptions ?? defaultOptions,
        ...config
    }
    globalInterceptor = { ...config.interceptor ?? {} }
}

export function setMPConfig(config : UniMpOptions) {
    globalOptions = {
        ...globalOptions ?? defaultOptions,
        ...config
    }
}

export function request(options : CombineRequestOptions) {
    let _options : CombineRequestOptions = Object.assign(globalOptions, options)
    callback(globalInterceptor.request)
    //callback(_options.interceptor?.request)
    handleRequestOptions(_options)
    let state : Partial<RequestState> = {
        config: _options,
        startTime: Date.now()
    }
    if (_options.loadingTip) {
        uni.showLoading({
            title: _options.loadingTip
        })
    }
    let task

    let promise = new Promise((resolve, reject) => {
        let resolvedOption = {
            ..._options,
            success: undefined,
            fail: (res : UniApp.GeneralCallbackResult) => {
                _fail(state, res, resolve, reject)
            },
            complete: (res : UniApp.GeneralCallbackResult) => {
                _complete(state, res, resolve, reject)
            },
        }
        if (_options.contentType === 'file') {
            resolvedOption.success = (res : UniApp.UploadFileSuccessCallbackResult) => handleSuccessCallback(state, res, resolve, reject)
            task = uni.uploadFile(resolvedOption)
            task.onProgressUpdate(uploadProgressCallback)
        } else {
            resolvedOption.success = (res : UniApp.RequestSuccessCallbackResult) => handleSuccessCallback(state, res, resolve, reject)
            task = uni.request(resolvedOption)
            state.abort = task.abort
        }
    })
    if (_options.success || _options.fail || _options.complete) {
        return task;
    }
    return promise;
}

type CombineUploadOptions = UniApp.UploadFileOption & CombineRequestOptions

export function upload(options : CombineUploadOptions) {
    options.contentType = 'file'

}

function callback(fn : any, ...args : any[]) {
    if (fn && typeof fn === 'function') {
        return fn(args)
    }
}

type ContentType = [string, string | null]
function handleRequestOptions(options : CombineRequestOptions) {
    let type = options.contentType
    let contentType = []

    if (type === 'json') {
        contentType[0] = 'application/json'
    } else if (type === 'form') {
        contentType[0] = 'application/x-www-form-urlencoded'
    } else if (type === 'file') {
        contentType[0] = 'multipart/form-data'
        if (options.method !== 'POST') {
            console.warn('文件上传，请求方法不对，已自动修正');
        }
        if (options.data && typeof options === 'object') {
            let data = options.data as object
            options.formData = {
                ...options.formData,
                ...data
            }
            delete options.data
        }
    } else {
        throw new Error('unsupported content type : ' + type)
    }

    contentType[1] = options.encoding ? `charset=${options.encoding}` : ''
    if (contentType[0]) {
        options.header['Content-Type'] = contentType.join(';')
    }

    if (options.header['Referer']) {
        console.warn('header 中不能设置 Referer，已自动删除');
        delete options.header['Referer']
    }

}

// 请求状态接口
export interface RequestState<T = any> {
    /** 响应数据 */
    data : T | null
    /** 响应对象（原始） */
    response : any | null
    /** 错误信息 */
    error : any | null
    /** 是否正在加载 */
    isLoading : boolean
    /** 是否已加载完成（无论成功失败） */
    isFinished : boolean
    /** 是否加载成功 */
    isSuccess : boolean
    /** 是否加载失败 */
    isError : boolean
    /** 是否无数据 */
    isEmpty : boolean
    /** 请求状态码 */
    statusCode : number | null
    /** 请求取消函数 */
    abort : (() => void) | null
    /** 请求配置 */
    config : CombineRequestOptions
    [key : string] : any
}

type SuccessCallbackResult = Partial<UniApp.UploadFileSuccessCallbackResult> | Partial<UniApp.RequestSuccessCallbackResult>

type CallbackOptions = Pick<UniApp.RequestOptions, 'success' | 'fail' | 'complete'> & Pick<UniApp.UploadFileOption, 'success' | 'fail' | 'complete'>

interface RequestSuccessCallback {
    (res : UniApp.RequestSuccessCallbackResult) : void
}

function handleSuccessCallback(state : Partial<RequestState>, res : SuccessCallbackResult, resolve : (value : unknown) => void, reject : (reason ?: any) => void) {
    // TODO handle MP POST redirect
    if (res.statusCode !== 200) {
        _fail(state, res, resolve, reject)
        return
    }
    let result = res.data // 响应数据
    // 文件上传自动
    let parseFileJson = state.config.contentType === 'file' && typeof result === 'string' && (state.config.dataType ===
        undefined || state.config.dataType === 'json')
    if (parseFileJson) {
        console.debug('自动解析文件上传响应为json对象')
        try {
            result = JSON.parse(res.data as string);
        } catch (e) {
            console.warn('自动解析文件上传响应为json对象失败')
        }
    }

    if (!state.config.skipInterceptorResponse && typeof result === 'object') {
        result = callback(globalInterceptor.response, res, state.config)
        result = getData(result as object, state.config.business)
    }
    console.log(`request (${state.config.url}) success, data: `, result)
    state.config.success ? callback(state.config.success, result) : resolve(result)
}

function _fail(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult, resolve : (value : unknown) => void, reject : (reason ?: any) => void) {
    if (res.errMsg === 'request:fail abort') {
        return
    }
    let result = callback(globalInterceptor.error, res, state.config) || res
    state.config.fail ? callback(state.config.fail, result) : reject(result)
}

function _complete(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult, resolve : (value : unknown) => void, reject : (reason ?: any) => void) {
    callback(globalInterceptor.complete, res, state.config)
    let cost = Date.now() - state.startTime
    if (state.config.debug) {
        console.log(`request cost in ${cost} ms of ${state.config.url}`)
    }
    let delay = Math.min(0, (state.config.loadingDuration || 500) - cost)
    setTimeout(() => uni.hideLoading(), delay)
    callback(state.config.complete, res)
}

function uploadProgressCallback(result : UniApp.OnProgressUpdateResult) : void {

}

function getData(data : Record<string, any>, dataPath : string | undefined | null, defaultValue ?: any) {
    if (!dataPath) {
        return data
    }
    return dataPath.split('.').reduce((obj, key) => obj?.[key], data) || defaultValue
}

type PathImpl<T, K extends keyof T> =
    K extends string
    ? T[K] extends Record<string, any>
    ? `${K}.${PathImpl<T[K], Exclude<keyof T[K], symbol>>}`
    : K
    : never;

type Path<T> = PathImpl<T, keyof T> | keyof T;

type PathValue<T, P extends Path<T>> =
    P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
    ? Rest extends Path<T[K]>
    ? PathValue<T[K], Rest>
    : never
    : never
    : P extends keyof T
    ? T[P]
    : never;

/**
 * 类型安全的嵌套路径提取方法
 */
function safeGet<
    T extends Record<string, any>,
    P extends Path<T>,
    D = undefined
>(
    obj : T | null | undefined,
    path : P,
    defaultValue ?: D
) : PathValue<T, P> | D {
    // 实现逻辑与基础版本相同，但具有类型安全
    if (obj == null || typeof obj !== 'object') {
        return defaultValue as D;
    }

    const pathArray = (typeof path === 'string'
        ? path
            .replace(/\[(\w+)\]/g, '.$1')
            .replace(/^\./, '')
            .split('.')
        : path) as string[];

    let current : any = obj;

    for (let i = 0; i < pathArray.length; i++) {
        const key = pathArray[i];

        if (current == null) {
            return defaultValue as D;
        }

        current = current[key];

        if (current === undefined && i < pathArray.length - 1) {
            return defaultValue as D;
        }
    }

    return current === undefined ? (defaultValue as D) : current;
}