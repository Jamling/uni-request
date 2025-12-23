import { CombineRequestOptions, CombineUploadOptions, GlobalRequestOptions, RequestState, UniMpOptions } from "./types";

let globalInterceptor : Partial<Record<'request' | 'response' | 'error' | 'complete', any>>;
let globalOptions : Record<string, any>;
export function setConfig(config : GlobalRequestOptions) {
    globalOptions = {
        encoding: 'UTF-8',
        business: 'data',
        contentType: 'json',
        header: {},
        ...globalOptions ?? {},
        ...config
    }
    globalInterceptor = { ...config.interceptor ?? {} }
}

export function setMPConfig(config : UniMpOptions) {
    globalOptions = {
        ...globalOptions ?? {},
        ...config
    }
}

export function get(options : CombineRequestOptions) {
    options.method = 'GET'
    return request(options)
}
export function post(options : CombineRequestOptions) {
    options.method = 'POST'
    return request(options)
}

export function request<T = any>(options : CombineRequestOptions) : UniApp.RequestTask | Promise<T> {
    let _options : CombineRequestOptions = { ...globalOptions, ...options }
    callback(globalInterceptor.request, _options)
    //callback(_options.interceptor?.request)
    handleRequestOptions(_options)
    let state : Partial<RequestState> = {
        config: _options,
        startTime: Date.now()
    }
    

    let task
    
    let promise = new Promise<T>((resolve, reject) => {
        let resolvedOption : CombineRequestOptions = {
            ..._options,
            success: (res : UniApp.RequestSuccessCallbackResult) => {
                _handleSuccessCallback(state, res, resolve, reject)
            },
            fail: (res : UniApp.GeneralCallbackResult) => {
                _handleFailCallback(state, res, resolve, reject)
            },
            complete: (res : UniApp.GeneralCallbackResult) => {
                _handleCompleteCallback(state, res, resolve, reject)
            },
        }
        task = uni.request(resolvedOption) as any as UniApp.RequestTask
        return task
    })
    if (_options.success || _options.fail || _options.complete) {
        //return task;
    }
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
    if (options.loadingTip) {
        uni.showLoading({
            title: options.loadingTip
        })
    }
}

type SuccessCallbackResult = Partial<UniApp.UploadFileSuccessCallbackResult> | Partial<UniApp.RequestSuccessCallbackResult>
function _handleSuccessCallback(state : Partial<RequestState>, res : SuccessCallbackResult, resolve : (value : any) => void, reject : (reason ?: any) => void) {
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
        console.debug('自动解析文件上传响应为json对象')
        try {
            result = JSON.parse(res.data as string);
        } catch (e) {
            console.warn('自动解析文件上传响应为json对象失败')
        }
    }

    if (!state.config?.skipInterceptorResponse && typeof result === 'object') {
        result = callback(globalInterceptor.response, result, state.config)
        result = getData(result as object, state.config?.business)
    }
    console.log(`request (${state.config?.url}) success, data: `, result)
    state.config?.success ? callback(state.config?.success, result) : resolve(result)
}

function _handleFailCallback(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult | any, resolve : (value : any) => void, reject : (reason ?: any) => void) {
    if (res.errMsg === 'request:fail abort') {
        return
    }
    let result = callback(globalInterceptor.error, res, state.config) || res
    state.config?.fail ? callback(state.config?.fail, result) : reject(result)
}

function _handleCompleteCallback(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult, resolve : (value : any) => void, reject : (reason ?: any) => void) {
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