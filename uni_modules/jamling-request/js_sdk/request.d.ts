/** 允许定义的uni-app全局选项 */
type UniGlobalOptions = Omit<UniApp.RequestOptions, 'url' | 'data' | 'success' | 'fail' | 'complete'>
/** 允许定义的适用于小程序等uni-app全局选项 */
type UniMpOptions = Pick<UniApp.RequestOptions, 'enableHttp2' | 'enableHttpDNS' | 'enableQuic' | 'enableCache' | 'httpDNSServiceId' | 'forceCellularNetwork' | 'enableCookie' | 'cloudCache' | 'defer'>

/**本库定义的额外全局选项*/
 interface ExtGlobalOptions {
    /**请求基地址，使用/结尾*/
    baseUrl ?: string
    contentType ?: 'json' | 'form' | 'file'
    business ?: string
    encoding ?: string
    debug ?: boolean
    toastError ?: boolean
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
        request ?: RequestInterceptor

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

declare interface RequestInterceptor {
    (config : GlobalRequestOptions) : GlobalRequestOptions | Promise<GlobalRequestOptions> | any
}

declare interface ResponseInterceptor {
    (res: any)
}

type GlobalRequestOptions = UniGlobalOptions & ExtGlobalOptions
type CombineRequestOptions = UniApp.RequestOptions & GlobalRequestOptions & ExtRequestOptions

type CombineUploadOptions = UniApp.UploadFileOption & GlobalRequestOptions & ExtRequestOptions

type ContentType = [string | null, string | null]

// 请求状态接口
declare interface RequestState<T = any> {
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