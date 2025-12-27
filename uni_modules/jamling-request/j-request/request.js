'use strict';
/**
 * @typedef {Object} GlobalConfig
 * @property {string} baseUrl - 接口基地址
 * @property {string} [business] - 接口响应的业务数据对象字段名，默认为data，如果返回整个业务对象，则需要设置为undefined
 * @property {boolean} [debug=false] - 是否开启调试模式，开启后会在控制台打印请求和响应相关信息
 * @property {'json'|'form'|'file'} [contentType="json"] - 请求类型，为json(默认)，form，file
 * @property {'json'|'text'} [dataType="json"] - 如果设为 json（默认），会尝试对返回的数据做一次 JSON.parse
 * @property {string} [encoding="UTF-8"] - 请求编码，默认为utf-8
 * @property {'text'|'arraybuffer'} [responseType='text'] - 响应的数据类型
 * @property {Object} [header] - 自定义请求头
 */

/**
 * @typedef {Object} RequestConfig
 * @property {string} url - 接口请求地址
 * @property {'GET'|'POST'|'PUT'|'DELETE'} [method="GET"] - 请求方法 GET|POST|PUT|DELETE
 * @property {boolean} [slashAbsoluteUrl=false] - 是否视以/开头的url为绝对地址，默认为false，此设置仅当初步判断url为非绝对地址时有效
 * @property {string} [loadingTip] - 是否在请求前显示文字为参数值的loading提示，如果是，会在请求结束后自动关闭loading提示
 * @property {number} [loadingDuration=500] - 设置loadingTip时的最小loading显示时间
 * @property {Object} [data] - 请求参数
 * @property {string} [baseUrl] - 接口基地址
 * @property {string} [business] - 接口响应的业务数据对象字段名，默认为data，如果返回整个业务对象，则需要设置为undefined
 * @property {boolean} [debug=false] - 是否开启调试模式，开启后会在控制台打印请求和响应相关信息
 * @property {'json'|'form'|'file'} [contentType="json"] - 请求类型，为json(默认)，form，file
 * @property {'json'|'text'} [dataType="json"] - 如果设为 json（默认），会尝试对返回的数据做一次 JSON.parse
 * @property {string} [encoding="UTF-8"] - 请求编码，默认为utf-8
 * @property {'text'|'arraybuffer'} [responseType='text'] - 响应的数据类型
 * @property {Object} [header] - 自定义请求头
 */

/**
 * @callback RequestInterceptor
 * @param {RequestConfig} config - 请求配置对象
 * @returns {RequestConfig} 返回处理后的请求配置对象
 */

/**
 * @callback ResponseInterceptor
 * @param {Object} response - 响应数据对象
 * @param {RequestConfig} config - 请求配置对象
 * @returns {Object} 返回处理后的响应数据对象
 */

/**
 * @callback FailInterceptor
 * @param {Object} response - 响应数据对象
 * @param {RequestConfig} config - 请求配置对象
 * @returns {Object} 返回处理后的响应数据对象
 */

/**
 * @callback CompleteInterceptor
 * @param {RequestConfig} config - 请求配置对象
 * @param {Object} extras - 额外参数对象
 * @param {Object} response - 响应数据对象
 */

/**
 * @typedef {Object} Interceptor
 * @property {RequestInterceptor} [request] - 请求拦截器，参数为请求配置对象，需返回请求配置对象
 * @property {ResponseInterceptor} [response] - 响应拦截器，参数为响应数据对象，需返回响应数据对象
 * @property {FailInterceptor} [fail] - 失败拦截器，参数为响应数据对象，需返回响应数据对象
 * @property {CompleteInterceptor} [complete] - 完成拦截器，参数为请求配置对象和响应数据对象
 */

/**
 * A Request useing App network request design {@link http://ext.dcloud.net.cn/plugin?id=709}
 * @author Jamling <li.jamling@gmail.com>
 * @version 1.0.1
 * @class
 **/
class Request {
    constructor() {
        this.config = {baseUrl: '', business: 'data' };
        /**
         * @description 拦截器
         * @type {Interceptor}
         */
        this.interceptor = {
            /**
             * @description define the interceptor before request
             * @param {function} 
             */
            request: undefined,
            response: undefined,
            fail: undefined,
            complete: undefined // since 1.2.0
        }
    }

    /** @private */
    static posUrl(url) { /* 判断url是否为绝对路径 */
        return /(http|https):\/\/([\w.]+\/?)\S*/.test(url)
    }

    /** @private */
    static getUrl(config) {
        let url = config.url || ''
        let abs = Request.posUrl(url);
        if (!abs) {
            let f = config.slashAbsoluteUrl
            if (f) {
                abs = /^\/([\w.]+\/?)\S*/.test(url)
            }
        }
        return abs ? url : (config.baseUrl + url)
    }

    /** @private */
    static getContentType(config) {
        var type = config.contentType || 'json'
        var charset = config.encoding || 'UTF-8'
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
     * @description 设置全局默认配置
     * @param {GlobalConfig} config - 默认配置对象
     */
    setConfig(config) {
        this.config = Object.assign(this.config, config)
    }

    /**
     * 发起网络请求
     * @param {RequestConfig} options 
     * @returns {Promise | RequestTask | UploadTask}
     */
    request(options = {}) {
        if (options.data === undefined) {
            options.data = {}
        }
        if (options.header === undefined) {
            options.header = {}
        }

        let _options = Object.assign({}, this.config, options)

        _options.url = Request.getUrl(_options)
        if (!_options.header['Content-Type']) {
            _options.header['Content-Type'] = Request.getContentType(_options)
        }
        let _config = _options
        if (this.interceptor.request && typeof this.interceptor.request === 'function') {
            _config = this.interceptor.request(_options)
        }
        let extras = {}
        this._prepare(_config, extras)
        if (_options.success && typeof _options.success === "function") {
            if (_config.contentType === 'file') {
                let task = uni.uploadFile({
                    ..._config,
                    success: res => {
                        this._success(_config, res, null, null)
                    },
                    fail: res => {
                        this._fail(_config, res, null, null)
                    },
                    complete: (res) => {
                        this._complete(_config, res, extras)
                    }
                })
                if (_config.progress && typeof _config.progress === 'function') {
                    task.onProgressUpdate(_res => {
                        _config.progress(_res, task)
                    })
                }
                return task
            } else {
                return uni.request({
                    ..._config,
                    success: res => {
                        this._success(_config, res, null, null)
                    },
                    fail: res => {
                        this._fail(_config, res, null, null)
                    },
                    complete: (res) => {
                        this._complete(_config, res, extras)
                    }
                })
            }
        }
        let task = undefined
        let promise = new Promise((resolve, reject) => {
            if (_config.contentType === 'file') {
                task = uni.uploadFile({
                    ..._config,
                    success: res => {
                        this._success(_config, res, resolve, reject)
                    },
                    fail: res => {
                        this._fail(_config, res, resolve, reject)
                    },
                    complete: (res) => {
                        this._complete(_config, res, extras)
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
                        this._success(_config, res, resolve, reject)
                    },
                    fail: res => {
                        this_fail(_config, res, resolve, reject)
                    },
                    complete: (res) => {
                        this._complete(_config, res, extras)
                    }
                })
            }
        })
        return promise;
    }

    /**
     * @method
     * @description execute a get request
     * @param {RequestConfig} options - 参数选项
     * 
     * @return {Promise} promise
     * @example
     * $request.get({
         url: 'foo/bar',
         data: {
             param1: value1
         }
     })
     *
     * @see {@link https://uniapp.dcloud.io/api/request/request}
     *
     */
    get(options = {}) {
        options.method = 'GET'
        return this.request(options)
    }

    /**
         * @method
         * @description execute a post request
         * @param {RequestConfig} options - 参数选项
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
    post(options = {}) {
        options.method = 'POST'
        return this.request(options)
    }
    /**
     * 
     * @param {RequestConfig} options 
     * @returns 
     */
    put(options = {}) {
        options.method = 'PUT'
        return this.request(options)
    }
    /**
     * 
     * @param {RequestConfig} options 
     * @returns 
     */
    delete(options = {}) {
        options.method = 'DELETE'
        return this.request(options)
    }
    /**
     * @method
     * @description upload file(s)/image(s)
     * @param {RequestConfig} options - 参数选项
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
    upload(options = {}) {
        options.method = 'POST'
        options.contentType = 'file'
        return this.request(options)
    }

    /** @private*/
    _success(_config, res, resolve, reject) {
        if (res.statusCode >= 200 && res.statusCode <= 302) { // http ok
            var result = res.data
            if (_config.responseType === 'arraybuffer' && typeof res.data === 'ArrayBuffer') {
                this._callback(_config?.success || resolve, result);
                return;
            }
            var parseFileJson = _config.contentType === 'file' && typeof result === 'string' && (_config.dataType ===
                undefined || _config.dataType === 'json')
            if (parseFileJson) {
                result = JSON.parse(res.data);
            }
            var skip = _config.skipInterceptorResponse
            if (this.interceptor.response && typeof this.interceptor.response === 'function' && !skip) {
                // TODO 对于某些特殊接口，比如访问其它系统，全局拦截器可能不适合
                // 这种情况下，要根据_config在全局拦截器中将其它系统的返回适配为本系统的业务对象
                result = this.interceptor.response(result, _config)
            }
            if (skip || result.success) { // 接口调用业务成功
                var _data = _config.business ? result[_config.business] : result;
                if (_config.debug) {
                    console.log('response success: ', _data)
                }
                this._callback(_config?.success || resolve, _data)
                return;
            }
        }
        this._fail(_config, res, resolve, reject)
    }

    /** @private */
    _fail(_config, res, resolve, reject) {
        if (_config.debug) {
            console.error('response failure: ', res)
        }
        if (res.errMsg === 'request:fail abort') {
            return
        }
        var result = res
        if (this.interceptor.fail && typeof this.interceptor.fail === 'function') {
            result = this.interceptor.fail(res, _config)
        }
        this._callback(_config?.fail || reject, result)
    }

    /** @private */
    _prepare(_config, obj = {}) {
        obj.startTime = Date.now()
        if (_config.loadingTip) {
            uni.showLoading({
                title: _config.loadingTip
            })
        }
        delete _config.header['Referer']
        if (_config.contentType === 'file') {
            if (_config.formData === undefined || _config.formData === null) {
                _config.formData = _config.data
                delete _config.data
            }
            delete _config.header['Content-Type']
            _config.method = 'POST'
        }
        if (_config.debug) {
            console.log('request: ', _config)
        }
        if (this.interceptor.prepare && typeof this.interceptor.prepare === 'function') {
            this.interceptor.prepare(_config, obj)
            return
        }
    }

    /** @private */
    _complete(_config, res, obj = {}) {
        obj.endTime = Date.now()
        if (_config.debug) {
            console.log('request completed in ' + (obj.endTime - obj.startTime) + ' ms')
        }
        if (_config.loadingTip) {
            let diff = obj.endTime - obj.startTime;
            let duration = _config.loadingDuration || 500
            if (diff < duration) {
                diff = duration - diff
            } else {
                diff = 0
            }

            setTimeout(function() {
                uni.hideLoading()
            }, diff)
        }
        if (this.interceptor.complete && typeof this.interceptor.complete === 'function') {
            this.interceptor.complete(_config, obj, res)
        }
        if (_config.complete) {
            _config.complete(res)
        }
    }
    /** @private */
    _callback(fn, ...args) {
        if (fn && typeof fn === "function") {
            return fn(...args);
        }
    }
}
/**
 * @type {Request}
 */
var request = new Request()
/**
 * @description Export a request instance
 * @type {Request}
 */
export default request
