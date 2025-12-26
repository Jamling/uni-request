import request from '../uni_modules/jamling-request/j-request/request'
console.log(request);
var baseUrl = 'http://api.ieclipse.cn/wnl/'
// #ifdef H5
baseUrl = '/'
// #endif
request.setConfig({
    baseUrl: baseUrl,
    debug: true
})
// 请求拦截
request.interceptor.request = (config => {
    // 给header添加全局请求参数token
    if (!config.header.token) {
        config.header.token = 'my_token'
    }
    // 添加一个自定义的参数，默认异常请求都弹出一个toast提示
    if (config.toastError === undefined) {
        config.toastError = true
    }
    return config;
})
// 全局的业务拦截
request.interceptor.response = ((res, config) => {
    if (res.code === 0) {
        res.success = true;
    } else if (res.code === 1001) {
        // token失效，需要重新登录
        uni.navigateTo({
            url: '/pages/loign/login'
        })
    }
    return res;
})

// 全局的错误异常处理
request.interceptor.fail = ((res, config) => {
    let ret = res;
    let msg = ''
    if (res.statusCode === 200) { // 业务错误
        msg = res.data.msg
        ret = res.data
    } else if (res.statusCode > 0) { // HTTP错误
        msg = '服务器异常[' + res.statusCode + ']'
    } else { // 其它错误
        msg = res.errMsg
    }
    if (config.toastError) {
        uni.showToast({
            title: msg,
            duration: 2000,
            icon: 'none'
        })
    }
    return ret;
})

export default request

// only 1.2.0 全局请求开始前回调，如果设置，那么内置的请求开始回调不会执行
// request.interceptor.prepare = ((config, extra) => {
//     console.log('global prepare');
//     extra.start = Date.now()
// })
// only 1.2.0 全局请求完成的回调，如果设置，那么内置的请求结束回调不会执行
// request.interceptor.complete = ((config, extra, res) => {
//     console.log('global complete');
//     extra.end = Date.now()
//     console.log('request cost time ' + (extra.end - extra.start));
// })