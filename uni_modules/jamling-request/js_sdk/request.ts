/**
 * A Request useing App network request design {@link http://ext.dcloud.net.cn/plugin?id=709}
 * @author Jamling <li.jamling@gmail.com>
 * @version 2.0.0
 * 
 **/
class Request {

    /**
     * @description 网络请求的默认配置
     * @property {Object} config - 默认参数配置
     * @property {string} config.baseUrl - 接口基地址
     * @property {string} config.business - 接口响应的业务数据对象字段名，默认为data
     */
    config : Config = new Config()

    /**
     * 判断url是否为绝对路径
     * @param url Url
     */
    static posUrl(url : string) {
        return /(http|https):\/\/([\w.]+\/?)\S*/.test(url)
    }

    private getContentType(config : Config) {
        let type = config.contentType || 'json'
        let charset = config.encoding || 'UTF-8'
        if (type === 'json') {
            return 'application/json;charset=' + charset
        } else if (type === 'form') {
            return 'application/x-www-form-urlencoded;charset=' + charset
        } else if (type === 'file') {
            return 'multipart/form-data;charset=' + charset
        } else if (type === 'text') {
            return 'text/plain;charset=' + charset
        } else if (type === 'html') {
            return 'text/html;charset=' + charset
        } else {
            throw new Error('unsupported content type : ' + type)
        }
    }

    /**
     * @property {Object} interceptor 拦截器
     *  
     */
    interceptor = {
        /**
         * @description define the interceptor before request
         * @param {function} 
         */
        request: undefined,
        response: undefined,
        fail: undefined,
        complete: undefined // since 1.2.0
    }

    /**
     * set global request config
     * @param {Config} config - the global config
     */
    public setConfig(config : Config) : void {
        this.config = Object.assign(this.config, config)
    }

    request(options : RequestOption) {
        var that = this;
        if (options.data === undefined) {
            options.data = {}
        }
        if (options.header === undefined) {
            options.header = {}
        }

        // 合并请求选项
        let _options = Object.assign({}, this.config, options);
        //　对url请求地址规范化
        (_options as RequestOption).normalizeUrl()

        _options.url = Request.getUrl(_options)
        if (!_options.header['Content-Type']) {
            _options.header['Content-Type'] = Request.getContentType(_options)
        }
        let _config = _options
        if (that.interceptor.request && typeof that.interceptor.request === 'function') {
            _config = that.interceptor.request(_options)
        }
        let task = undefined
        let promise = new Promise((resolve, reject) => {
            let extras = {}
            that._prepare(that, _config, extras)
            if (_config.contentType === 'file') {
                task = uni.uploadFile({
                    ..._config,
                    success: res => {
                        that._success(that, _config, res, resolve, reject)
                    },
                    fail: res => {
                        that._fail(that, _config, res, resolve, reject)
                    },
                    complete: (res) => {
                        that._complete(that, _config, res, extras)
                    }
                })
                if (_config.progress && typeof _config.progress === 'function') {
                    task.onProgressUpdate(_res => {
                        _config.progress(_res, task)
                    })
                }
            } else {
                task = uni.request({
                    ..._config,
                    success: res => {
                        that._success(that, _config, res, resolve, reject)
                    },
                    fail: res => {
                        that._fail(that, _config, res, resolve, reject)
                    },
                    complete: (res) => {
                        that._complete(that, _config, res, extras)
                    }
                })
            }
        })
        if (_config.success || _config.fail || _config.complete) {
            return task;
        }
        return promise;
    }

    /**
     * @method
     * @description execute a get request
     * @param {Object} options - 参数选项
     * @param {string} options.url - 请求地址
     * @param {string} [options.method=GET] - 请求方法 GET|POST
     * @param {string} [options.contentType=json] - 请求类型，为json(默认)，form
     * @param {Object} [options.data] - 请求参数
     * @param {string} [options.encoding] - 请求编码，默认为utf-8
     * @param {string} [options.dataType] - 如果设为 json（默认），会尝试对返回的数据做一次 JSON.parse
     * @param {string} [options.business] - 接口响应的业务数据对象字段名，默认为data，如果返回整个业务对象，则需要设置为undefined
     * @param {string} [options.skipInterceptorResponse] - 是否跳过响应过滤器，如需跳过，请置true
     * @param {string} [options.slashAbsoluteUrl] - 
     * @param {string} [options.loadingTip] - 是否在请求前显示文字为参数值的loading提示，如果是，会在请求结束后自动关闭loading提示
     * @param {string} [options.loadingDuration] - 设置loadingTip时的最小loading显示时间
     * 
     * @return {Promise} promise
     * @example
     * $request.get({
         url: 'foo/bar',
         data: {
             param1: value1
         }
     })
     * @see {@link https://uniapp.dcloud.io/api/request/request}
     */
    get(options : RequestOption) {
        options.method = 'GET'
        return this.request(options)
    }

    /**
         * @method
         * @description execute a post request
         * @param {Object} options - 参数选项
         * @param {string} options.url - 请求地址
         * @param {string} [options.method=POST] - 请求方法 GET|POST
         * @param {string} [options.contentType=json] - 请求类型，为json(默认)，form
         * @param {Object} [options.data] - 请求参数
         * @param {string} [options.encoding] - 请求编码，默认为utf-8
         * @param {string} [options.dataType] - 如果设为 json（默认），会尝试对返回的数据做一次 JSON.parse
         * @param {string} [options.business] - 接口响应的业务数据对象字段名，默认为data，如果返回整个业务对象，则需要设置为undefined
         * @param {string} [options.skipInterceptorResponse] - 是否跳过响应过滤器，如需跳过，请置true
         * @param {string} [options.slashAbsoluteUrl] - 是否视以/开头的url为绝对地址，默认为false，此设置仅当初步判断url为非绝对地址时有效
         * @param {string} [options.loadingTip] - 是否在请求前显示文字为参数值的loading提示，如果是，会在请求结束后自动关闭loading提示
         * @param {string} [options.loadingDuration] - 设置loadingTip时的最小loading显示时间
         * 
         * @return {Promise} promise
         * @example
         * $request.post({
            url: 'foo/bar',
            data: {
                param1: value1
            }
        })
        * @see {@link https://uniapp.dcloud.io/api/request/request}
        */
    post(options : RequestOption) {
        //options.method = 'POST'
        return this.request({ ...options, method: 'POST' })
    }

    /**
     * author by wyh
     */
    put(options : RequestOption) {
        options.method = 'PUT'
        return this.request(options)
    }
    /**
     * author by wyh
     */
    delete(options : RequestOption) {
        options.method = 'DELETE'
        return this.request(options)
    }

    /**
     * @method
     * @description execute a get request
     * @param {Object} options - 参数选项
     * @param {string} options.url - 请求地址
     * @param {string} [options.method=GET] - 请求方法 GET|POST
     * @param {string} [options.contentType=json] - 请求类型，为json(默认)，form
     * @param {Object} [options.data] - 请求参数
     * @param {string} [options.encoding] - 请求编码，默认为utf-8
     * @param {string} [options.dataType] - 如果设为 json（默认），会尝试对返回的数据做一次 JSON.parse
     * @param {string} [options.business] - 接口响应的业务数据对象字段名，默认为data，如果返回整个业务对象，则需要设置为undefined
     * @param {string} [options.skipInterceptorResponse] - 是否跳过响应过滤器，如需跳过，请置true
     * @param {string} [options.slashAbsoluteUrl] - 是否视以/开头的url为绝对地址，默认为false，此设置仅当初步判断url为非绝对地址时有效
     * @param {string} [options.loadingTip] - 是否在请求前显示文字为参数值的loading提示，如果是，会在请求结束后自动关闭loading提示
     * @param {string} [options.loadingDuration] - 设置loadingTip时的最小loading显示时间
     * 
     * @return {Promise} promise
     * @example
     * $request.upload({
        url: 'foo/bar',
        filePath: res.tempFilePaths[0];
        data: {
            param1: value1
        }
    })
    * @see {@link https://uniapp.dcloud.io/api/request/network-file}
    */
    upload(options: RequestOption) {
        options.method = 'POST'
        options.contentType = 'file'
        return this.request(options)
    }

    _success = function (that, _config, res, resolve, reject) {
        if (res.statusCode >= 200 && res.statusCode <= 302) { // http ok
            var result = res.data // 全局的拦截器
            var parseFileJson = _config.contentType === 'file' && typeof result === 'string' && (_config.dataType ===
                undefined || _config.dataType === 'json')
            if (parseFileJson) {
                result = JSON.parse(res.data);
            }
            var skip = _config.skipInterceptorResponse
            // 走全局的拦截器，
            if (that.interceptor.response && typeof that.interceptor.response === 'function' && !skip) {
                result = that.interceptor.response(result, _config)
                if (_config.businessSuccess /* || result.success*/) { // 不兼容原来的接口业务逻辑调用成功判定
                    // 接口调用业务成功
                    var _data = _config.business ? result[_config.business] : result;
                    if (_config.debug) {
                        console.log(`response(${_config.url}) success: `, _data)
                    }
                    _config.success ? _config.success(_data) : resolve(_data)
                    return;
                }
            } else {

                // 对于某些特殊接口，比如访问其它系统，全局拦截器可能不适合
                // 这种情况下，需要自己处理接口响应，相当于透传
                if (_config.debug) {
                    console.log(`response(${_config.url}) success: `, result)
                }
                _config.success ? _config.success(result) : resolve(result)
                return;
            }
        }
        // 剩下的都走失败
        that._fail(that, _config, res, resolve, reject)
    }

    _fail = function (that, _config, res, resolve, reject) {
        if (_config.debug) {
            console.error(`response(${_config.url}) failure: `, res)
        }
        if (res.errMsg === 'request:fail abort') {
            return
        }
        var result = res
        if (that.interceptor.fail && typeof that.interceptor.fail === 'function') {
            result = that.interceptor.fail(res, _config)
        }
        _config.fail ? _config.fail(result) : reject(result)
    }

    _prepare = function (that, _config, obj = {}) {
        if (that.interceptor.prepare && typeof that.interceptor.prepare === 'function') {
            that.interceptor.prepare(_config, obj)
            return
        }
        obj.startTime = Date.now()
        if (_config.loadingTip) {
            uni.showLoading({
                title: _config.loadingTip
            })
        }
        if (_config.contentType === 'file') {
            if (_config.formData === undefined || _config.formData === null) {
                _config.formData = _config.data
                delete _config.data
            }
            delete _config.header['Content-Type']
            delete _config.header['Referer']
            _config.method = 'POST'
        }
        if (_config.debug) {
            console.log(`request(${_config.url}): `, _config)
        }
    }

    _complete = function (that, _config, res, obj = {}) {
        if (that.interceptor.complete && typeof that.interceptor.complete === 'function') {
            that.interceptor.complete(_config, obj, res)
            return
        }
        obj.endTime = Date.now()
        if (_config.debug) {
            console.log(`request(${_config.url}) completed in ${obj.endTime - obj.startTime} ms`)
        }
        if (_config.loadingTip) {
            let diff = obj.endTime - obj.startTime;
            let duration = _config.loadingDuration || 500
            if (diff < duration) {
                diff = duration - diff
            } else {
                diff = 0
            }

            setTimeout(function () {
                uni.hideLoading()
            }, diff)
        }
        if (_config.complete) {
            _config.complete(res)
        }
    }
}

/**
     * @description 网络请求的默认配置
     * @property {Object} config - 默认参数配置
     * @property {string} config.baseUrl - 接口基地址
     * @property {string} config.business - 接口响应的业务数据对象字段名，默认为data
     */
class Config implements RequestMethod {
    /**
     * 基地址
     */
    baseUrl : string = ''
    method : Method
    contentType : string = 'json'
    business : string = 'data'
    dataType : string = 'json'
    encoding : string = 'UTF-8'
    slashAbsoluteUrl : boolean = false
    debug : boolean = false
}

class RequestOption extends Config {
    skipInterceptorResponse : boolean = false
    /** 
     * 
是否视以/开头的url为绝对地址，默认为false，此设置仅当初步判断url为非绝对地址时有效*/
    slashAbsoluteUrl : boolean = true
    loadingTip : string = undefined
    loadingDuration : number = 500
    responseType ?: string = 'text'
    url : string
    data ?: any
    header ?: any
    progress ?: 

    private normalizeUrl() {
        let url = this.url
        let abs = Request.posUrl(url);
        if (!abs && this.slashAbsoluteUrl) {
            abs = /^\/([\w.]+\/?)\S*/.test(this.url)
        }
        this.url = abs ? url : (this.baseUrl + url)
    }
}

interface RequestMethod {
    /**
     * 请求方法
     */
    method : Method
}
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
/**
 * 
 */
const request = new Request()
/**
 * @module {Request} request
 */
export default request