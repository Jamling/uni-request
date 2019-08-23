# j-request
一个支持Promise和拦截器的网络请求

## 简介
我此前是做App开发的，在试用了3个request插件之后，还是决定再造一个轮子，来达到像原来App中那样的网络请求控制效果。本人因为对前端不太懂，所以有些代码是参考plcky-request, luch-request和axio-request写的。

## 特性

- 支持PCallback和romise，Callback优先
- 支持请求拦截和响应拦截及全局请求异常处理
- 支持文件上传及进度监听

## 使用
### 参数配置
除uni-app自带的请求参数外，j-request还额外添加了以下参数

|参数            |类型(默认值)                | 必填    |  说明 |
| -------------- |:--------------------:|:----------:|:-----------:|
| baseUrl        |String('')            |否          | 接口请求基地址
| contentType    |String('json')        |否          | 请求类型可选值为`json`|`form`|`file`
| encoding       |String('utf-8')       |否          | 请求编码
| business       |String('data')        |否          | 接口业务数据对象名称
| skipInterceptorResponse        |Boolean(false)            |否          | 是否拦截响应
| slashAbsoluteUrl |Boolean(true)            |否          | 以/开头的url是否视为绝对url
| loadingTip      |String(true)            |否          | 请求前显示加载中提示框
| loadingDuration |Number(500)            |否          | 加载提示框显示的最小时间

示例

``` js
import request from './request.js'
console.log(request);
request.config.baseUrl = 'http://api.ieclipse.cn/wnl/'
// #ifdef H5
request.config.baseUrl = '/wnl/'
// #endif

// 把request作为全局对象，这样小程序也可以用了
Vue.prototype.$request = request
```

### 拦截器配置

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
    console.log('request:');
    console.log(config);
    return config;
})
// 全局的业务拦截
request.interceptor.response = ((res, config) => {
    console.log('response:');
    console.log(res);
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
    console.log('error:');
    console.log(res);
    let ret = res;
    let msg = ''
    if (res.statusCode === 200) { // 业务错误
        msg = res.data.msg
        ret = res.data
    } else if (res.statusCode > 0) { // HTTP错误
        msg = '网络错误'
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
                    slashAbsoluteUrl: false
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