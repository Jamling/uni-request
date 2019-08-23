/**
 * A Request useing App network request design
 * @Class uni-app request网络请求库
 * @Author Jamling
 * @Date 2019-08-22
 * @Email li.jamling@gmail.com
 * @Version 0.0.1
 **/
class Request {
    config = {
        baseUrl: '',
        business: 'data',
        /*返回默认为res.data*/
        contentType: 'json',
        encoding: 'UTF-8',
        // skipInterceptorResponse: false,
        // slashAbsoluteUrl: true,
        // toastError: true,
        // loadingTip: undefined,
        // loadingDuration: 500,
        // method: 'GET',
        // dataType: 'json',
        // responseType: 'text'
    }

    static posUrl(url) { /* 判断url是否为绝对路径 */
        return /(http|https):\/\/([\w.]+\/?)\S*/.test(url)
    }

    static getUrl(config) {
        let url = config.url || ''
        let abs = Request.posUrl(url);
        if (!abs) {
            let f = !config.slashAbsoluteUrl
            if (f) {
                abs = /\/([\w.]+\/?)\S*/.test(url)
            }
        }
        return abs ? url : (config.baseUrl + url)
    }

    static getContentType(config) {
        var type = config.contentType || 'json'
        var charset = config.encoding || 'UTF-8'
        if (type === 'json') {
            return 'application/json;charset=' + charset
        } else if (type === 'form') {
            return 'application/x-www-form-urlencoded;charset=' + charset
        } else if (type === 'file') {
            return 'multipart/form-data;charset=' + charset
        } else {
            throw new Error('unsupported content type : ' + type)
        }
    }

    interceptor = {
        request: undefined,
        response: undefined,
        fail: undefined
    }

    setConfig(f) {
        this.config = f(this.config)
    }

    request(args = {}) {
        var that = this;
        let options = {
            ...this.config,
            ...args
        }
        if (args.hasOwnProperty('business')) {
            options.business = args.business
        }
        if (args.hasOwnProperty('loadingTip')) {
            options.loadingTip = args.loadingTip
        }

        options.url = Request.getUrl(options)
        options.data = options.data || {}
        options.header = options.header || {}
        if (!options.header['Content-Type']) {
            options.header['Content-Type'] = Request.getContentType(options)
        }

        return new Promise((resolve, reject) => {
            let next = true
            let loadingStart = 0
            let _config = options
            if (that.interceptor.request && typeof that.interceptor.request === 'function') {
                _config = that.interceptor.request(options)
            }
            let extras = {

            }
            that._prepare(that, _config, extras)
            let cancel = (_config) => {
                that._fail(that, _config, {
                    errMsg: 'request:canceled',
                    statusCode: -1
                }, resolve, reject)
                next = false
            }

            if (!next) return
            if (_config.contentType === 'file') {
                let task = uni.uploadFile({
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
                uni.request({
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
    }

    //https://uniapp.dcloud.io/api/request/request
    get(options = {}) {
        options.method = 'GET'
        return this.request(options)
    }

    post(options = {}) {
        options.method = 'POST'
        return this.request(options)
    }
    // https://uniapp.dcloud.io/api/request/network-file
    upload(options = {}) {
        options.method = 'POST'
        options.contentType = 'file'
        return this.request(options)
    }

    _success = function(that, _config, res, resolve, reject) {
        if (res.statusCode >= 200 && res.statusCode <= 302) { // http ok
            var result = res.data // 全局的拦截器
            if (_config.contentType === 'file' && typeof result === 'string') {
                result = JSON.parse(res.data);
            }
            var skip = _config.skipInterceptorResponse
            if (that.interceptor.response && typeof that.interceptor.response === 'function' && !skip) {
                // TODO 对于某些特殊接口，比如访问其它系统，全局拦截器可能不适合
                // 这种情况下，要根据_config在全局拦截器中将其它系统的返回适配为本系统的业务对象
                result = that.interceptor.response(result, _config)
            }
            if (skip || result.success) { // 接口调用业务成功
                var _data = _config.business ? result[_config.business] : result;
                _config.success ? _config.success(_data) : resolve(_data)
                return;
            }
        }
        that._fail(that, _config, res, resolve, reject)
    }

    _fail = function(that, _config, res, resolve, reject) {
        var result = res
        if (that.interceptor.fail && typeof that.interceptor.fail === 'function') {
            result = that.interceptor.fail(res, _config)
        }
        _config.fail ? _config.fail(result) : reject(result)
    }

    _prepare = function(that, _config, obj = {}) {
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
    }

    _complete = function(that, _config, res, obj = {}) {
        obj.endTime = Date.now()
        console.log('complete use ' + (obj.endTime - obj.startTime) + ' ms')
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
    }

}

var request = new Request()
export default request
