/** 允许定义的uni-app全局选项 */
type UniGlobalOptions = Omit<UniApp.RequestOptions, 'url' | 'data' | 'success' | 'fail' | 'complete'>;
/** 允许定义的适用于小程序等uni-app全局选项 */
type UniMpOptions = Pick<UniApp.RequestOptions, 'enableHttp2' | 'enableHttpDNS' | 'enableQuic' | 'enableCache' | 'httpDNSServiceId' | 'forceCellularNetwork' | 'enableCookie' | 'cloudCache' | 'defer'>

/**本库定义的额外全局选项*/
interface ExtGlobalOptions {
    /**请求基地址，使用/结尾*/
    baseUrl ?: string
    /**
     * 请求类型　json：application/json； form：application/x-www-form-urlencoded； file：multipart/form-data
     */
    contentType ?: 'json' | 'form' | 'file'
    /**
     * 请求业务数据路径，支持多级，用于从响应数据中提取业务数据，默认为｀data｀。如响应数据为 { code: 0, data: { list: [] } }，则 business 可设置为 'data'
     */
    business ?: string
    /** 请求编码 */
    encoding ?: string
    /** 是否开启调试模式，开启后会打印请求日志 */
    debug ?: boolean
    /** 是否在请求失败时弹出错误提示 */
    toastError ?: boolean
    /** 请求头 */
    header ?: Record<string, any>
    /** 请求拦截器 */
    interceptor ?: Interceptor
    // /** 是否启用防抖（毫秒） */
    // debounce ?: number
    // /** 是否启用节流（毫秒） */
    // throttle ?: number
    // /** 是否立即执行（在组件挂载时） */
    // immediate ?: boolean
    // /** 是否启用重试 */
    // retry ?: {
    //     /** 重试次数 */
    //     count : number
    //     /** 重试延迟（毫秒） */
    //     delay : number | ((count : number) => number)
    // }
}
interface ExtRequestOptions {
    /** 是否在请求前显示文字为参数值的loading提示，如果是，会在请求结束后自动关闭loading提示 */
    loadingTip ?: string,
    /** 设置loadingTip时的最小loading显示时间 */
    loadingDuration ?: number,
    /** 是否跳过响应过滤器，如需跳过，请置true */
    skipInterceptorResponse ?: boolean
    [key : string] : any
}

export interface Interceptor {
    /**
     * 请求拦截器
     */
    request ?: RequestInterceptor
    /** 响应拦截器 */
    response ?: ResponseInterceptor
    /** 失败拦截器 */
    fail ?: (
        res : UniApp.GeneralCallbackResult | UniApp.RequestSuccessCallbackResult | UniApp.UploadFileSuccessCallbackResult,
        state : Pick<RequestState, 'isSuccess' | 'isError' | 'data' | 'response' | 'error' | 'config'>
    ) => void
    /** 发送前的回调 */
    prepare ?: (options : UniApp.RequestSuccessCallbackResult | UniApp.UploadFileSuccessCallbackResult) => void
    /** 完成回调 */
    complete ?: (res : UniApp.GeneralCallbackResult) => void
}

export interface RequestInterceptor {
    (config : GlobalRequestOptions) : GlobalRequestOptions | Promise<GlobalRequestOptions> | any
}

type UniResultDataType = UniApp.RequestSuccessCallbackResult['data']

export interface ResponseInterceptor {
    (res : Record<string, any>, state : Pick<RequestState, 'isSuccess'>) : any
}

export type GlobalRequestOptions = UniGlobalOptions & ExtGlobalOptions
export type CombineRequestOptions = UniApp.RequestOptions & GlobalRequestOptions & ExtRequestOptions

export type CombineUploadOptions = UniApp.UploadFileOption & GlobalRequestOptions & ExtRequestOptions
export type SuccessCallbackResult = UniApp.RequestSuccessCallbackResult | UniApp.UploadFileSuccessCallbackResult

// 请求状态接口
export interface RequestState<T = any> {
    /** 响应数据 */
    data ?: T | null
    /** 响应对象（原始） */
    response ?: SuccessCallbackResult | null
    /** 错误信息 */
    error ?: any | null
    /** 是否正在加载 */
    isLoading ?: boolean
    /** 是否已加载完成（无论成功失败） */
    isFinished ?: boolean
    /** 是否加载成功 */
    isSuccess ?: boolean
    /** 是否加载失败 */
    isError ?: boolean
    /** 是否无数据 */
    isEmpty ?: boolean
    /** 请求状态码 */
    statusCode ?: number | null
    /** 请求取消函数 */
    abort ?: (() => void) | null
    /** 请求配置 */
    config : CombineRequestOptions | CombineUploadOptions
    [key : string] : any
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