# j-request/jamling-request
基于uni-app 网络请求/文件上传API封装的网络请求工具，支持Promise、拦截器、文件上传、取消请求

![screenshot](static/screenshot.png)

## 简介
对官方API做了基本的封装及能力扩展，消除了普通网络请求、文件上传获取二进制流的差异，对开发者更加友好，如：
- 自动删除uni-app不能设置的Referer请求头
- 上传文件自动设置相关请求参数，自动对响应做JSON.parse
- 填了获取二进制流（如图验证码）场景下的坑

## 特性

- Callback和Promise风格等官方全部能力
- 支持代码提示
- 支持配置全局拦截器
  - 请求拦截器：配置全局请求头或请求参数，如设置身份验证的Token等。
  - 响应拦截器：对API响应做基本的校验，如判断是否业务请求成功，处理业务异常响应等。
  - 准备/完成拦截器：请求前及请求后的公共逻辑，如Loading提示等。

## 使用
### 参数配置
除uni-app自带的请求参数外，j-request还额外添加了以下参数

|参数            |类型(默认值)                | 必填    |  说明 |
| -------------- |:--------------------:|:----------:|:-----------:|
| debug          |boolean(false)        |否          | 是否开启debug模式，在此模式下，所有的请求都会打印请求参数，响应对象或错误信息
| toastError          |boolean(false)        |否          | 是否对错误自动弹Toast
| baseUrl        |String('')            |否          | 接口请求基地址
| contentType    |String('json')        |否          | 请求类型可选值为`json`、`form`、`file`
| encoding       |String('utf-8')       |否          | 请求编码，默认为utf-8
| business       |String('data')        |否          | 接口响应的业务数据对象字段名，默认为data，如果返回整个业务对象，则需要设置为undefined
| skipInterceptorResponse        |Boolean(false)     |否          | 是否跳过全局响应拦截器，如个别API响应格式特殊，不适用全局拦截器可设置为true
| slashAbsoluteUrl               |Boolean(false)     |否          | 是否视以/开头的url为绝对地址，默认为false，此设置仅当初步判断url为非绝对地址时有效，2.x版本不支持
| loadingTip                     |string(undefined)  |否          | 是否在请求前显示文字为参数值的loading提示，如果是，会在请求结束后自动关闭loading提示
| loadingDuration                |Number(500)        |否          | 设置loadingTip时的最小loading显示时间

示例

``` js
// 1.x版本
import request from '../uni_modules/jamling-request/j-request/request'
// 2.x版本
// import request from '../uni_modules/jamling-request'
console.log(request);
var baseUrl = 'http://api.ieclipse.cn/wnl/'
// #ifdef H5
baseUrl = '/wnl/'
// #endif
request.setConfig({
    baseUrl: baseUrl,
    debug: true
})

// Vue2 设置为全局对象
Vue.prototype.$request = request
// Vue3 设置为全局对象
app.config.globalProperties.$request = request
```

### 拦截器配置

#### 请求拦截

可以给请求添加一些全局参数及自定义的配置

```js
// 请求拦截
request.interceptor.request = (config => {
    // 给data添加全局请求参数uid
    if (!config.data.uid) {
        config.data.uid = 100
    }
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

```

#### 响应拦截

当http请求成功（响应码为200）后的响应拦截，可以根据状态码统一判断业务请求是否成功，如果成功，请设置一个success=true的标志位

```js
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

```

#### 错误处理

当http请求失败或业务请求失败的处理，

```js

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


```

### 使用

#### 使用Callback

``` js
        example1(full) {
            var that = this;
            this.$request.get({
                url: 'lunar',
                business: full ? null : 'data',
                success: res => {
                    console.log('success');
                    that.json = JSON.stringify(res);
                },
                fail: res => {
                    console.log('failure');
                    that.json = JSON.stringify(res);
                }
            });
        }
```

#### 使用Promise

``` js
        example2() {
            var that = this;
            this.$request
                .post({
                    url: 'solar',
                    loadingTip: '接口请求中...'
                })
                .then(
                    res => {
                        console.log('success');
                        that.json = JSON.stringify(res);
                    },
                    res => {
                        console.log('failure');
                        that.json = JSON.stringify(res);
                    }
                );
        },

```

#### 文件上传

如果参数中没有formData，那么会将data作为formData，对于返回的接口数据，会尝试做一次JSON.parse转为json对象。

```js
        pickerImg() {
            var that = this;
            uni.chooseImage({
                count: 1,
                success: function(res) {
                    console.log(res);
                    var path = res.tempFilePaths[0];
                    that.upload(path);
                }
            });
        },
        upload(path) {
            var that = this;
            var tokenUrl = 'http://api.ieclipse.cn/smartqq/upload/token';
            // #ifdef H5
            tokenUrl = '/smartqq/upload/token';
            // #endif
            that.$request
                .get({
                    url: tokenUrl,
                    slashAbsoluteUrl: true
                })
                .then(res => {
                    that.json = JSON.stringify(res);
                    var uploadTask = that.$request
                        .upload({
                            url: 'http://upload.qiniu.com',
                            filePath: path,
                            name: 'file',
                            business: null,
                            skipInterceptorResponse: true,
                            data: {
                                token: res.token
                            },
                            progress: (res2, task) => {
                                let p = '上传进度: ' + res2.totalBytesSent + '/' + res2.totalBytesExpectedToSend + ' (' + res2.progress + '%)';
                                this.json = p;
                                console.log(p);
                                // 测试条件，取消上传任务。
                                if (res2.progress > 50) {
                                    //uploadTask.abort();
                                }
                            }
                        })
                        .then(res2 => {
                            console.log(res2);
                            that.logo = res.domain + '/' + res2.key;
                            console.log(that.logo);
                        })
                        .catch(res2 => {
                            console.log(res2);
                        });
                });
        }


```
