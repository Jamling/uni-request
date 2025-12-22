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

export function request(options : CombineRequestOptions) {
    let _options : CombineRequestOptions = { ...globalOptions, ...options }
    callback(globalInterceptor.request, _options)
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
    let task : UniApp.UploadTask | UniApp.RequestTask

    let promise = new Promise((resolve, reject) => {
        let resolvedOption : CombineRequestOptions = {
            ..._options,
            success: (res : UniApp.RequestSuccessCallbackResult) => {
                handleSuccessCallback(state, res, resolve, reject)
            },
            fail: (res : UniApp.GeneralCallbackResult) => {
                _handleFailCallback(state, res, resolve, reject)
            },
            complete: (res : UniApp.GeneralCallbackResult) => {
                _handleCompleteCallback(state, res, resolve, reject)
            },
        }
        uni.request(resolvedOption)
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

function handleRequestOptions(options : CombineRequestOptions | CombineUploadOptions | any) {
    let type = options.contentType
    let contentType : ContentType = [null, null]

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

function handleSuccessCallback(state : Partial<RequestState>, res : SuccessCallbackResult, resolve : (value : unknown) => void, reject : (reason ?: any) => void) {
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
        result = callback(globalInterceptor.response, res, state.config)
        result = getData(result as object, state.config?.business)
    }
    console.log(`request (${state.config?.url}) success, data: `, result)
    state.config?.success ? callback(state.config?.success, result) : resolve(result)
}

function _handleFailCallback(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult | any, resolve : (value : unknown) => void, reject : (reason ?: any) => void) {
    if (res.errMsg === 'request:fail abort') {
        return
    }
    let result = callback(globalInterceptor.error, res, state.config) || res
    state.config?.fail ? callback(state.config?.fail, result) : reject(result)
}

function _handleCompleteCallback(state : Partial<RequestState>, res : UniApp.GeneralCallbackResult, resolve : (value : unknown) => void, reject : (reason ?: any) => void) {
    callback(globalInterceptor.complete, res, state.config)
    let cost = Date.now() - state.startTime
    if (state.config?.debug) {
        console.log(`request cost in ${cost} ms of ${state.config.url}`)
    }
    let delay = Math.min(0, (state.config?.loadingDuration || 500) - cost)
    setTimeout(() => uni.hideLoading(), delay)
    callback(state.config?.complete, res)
}

function getData(data : Record<string, any>, dataPath : string | undefined | null, defaultValue ?: any) {
    if (!dataPath) {
        return data
    }
    return dataPath.split('.').reduce((obj, key) => obj?.[key], data) || defaultValue
}

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