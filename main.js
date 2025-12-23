import Vue from 'vue'
import App from './App'
import request from './uni_modules/jamling-request/js_sdk'
console.log(request);
let baseUrl = 'http://'
// #ifdef H5
baseUrl = ''
// #endif
request.setConfig({
    baseUrl: baseUrl,
    debug: true,
    // 请求拦截
    interceptor: {
        request: (config) => {
            // 给header添加全局请求参数token
            if (!config.header.token) {
                config.header.token = 'my_token'
            }
            // 添加一个自定义的参数，默认异常请求都弹出一个toast提示
            if (config.toastError === undefined) {
                config.toastError = true
            }
            return config;
        },
        response: (res, config) => {
            if (res.code === 0) {
                //res.success = true;
                config.businessSuccess = true;
            } else if (res.code === 1001) {
                // token失效，需要重新登录
                uni.navigateTo({
                    url: '/pages/loign/login'
                })
            }
            return res;
        },

        fail: (res, config) => {
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
        }
    },
})

// since 1.2.0 全局请求开始前回调，如果设置，那么内置的请求开始回调不会执行
// request.interceptor.prepare = ((config, extra) => {
//     console.log('global prepare');
//     extra.start = Date.now()
// })
// // since 1.2.0 全局请求完成的回调，如果设置，那么内置的请求结束回调不会执行
// request.interceptor.complete = ((config, extra, res) => {
//     console.log('global complete');
//     extra.end = Date.now()
//     console.log('request cost time ' + (extra.end - extra.start));
// })

/**
 * Assign the request to global VUE.
 * @param {Request} $request - The request object.
 */
Vue.prototype.$request = request

Vue.config.productionTip = false


App.mpType = 'app'

const app = new Vue({
    ...App
})
app.$mount()