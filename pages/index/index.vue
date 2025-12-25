<template>
    <view class="content">
        <view class="row">
            <picker :range="methodRangle" :value="methodIndex" @change="changeMethod">{{ methodRangle[methodIndex] }}</picker>
            <input :value="url" placeholder="请输入请求地址"></input>
        </view>
        <view class="row">
            <text>快捷地址</text>
            <picker :range="urlRangle" range-key="text" :value="urlIndex" @change="changeUrl">{{ urlRangle[urlIndex].text }}</picker>
        </view>
        <view class="row">
            <text>开启Promise</text>
            <switch :checked="promiseStyle" @change="changetStyle"></switch>
        </view>
        <view class="row">
            <button size="default" type="primary" @click="sendRequest()">
                发送请求
            </button>
        </view>
        <button size="mini" @click="example1(false)">成功请求</button>
        <button size="mini" class="not-first" @click="example2">成功请求（Promise)</button>
        <button size="mini" class="not-first" @click="example1(true)">成功请求（返回整个业务对象）</button>
        <button size="mini" class="not-first" @click="getImg(true)">成功请求（返回图片）</button>
        <view>
            <button size="mini" type="warn" class="warn" @click="fail1">业务错误：</button>
        </view>
        <view>
            <button size="mini" type="warn" @click="fail1">错误请求（业务错误）</button>
            <button size="mini" type="warn" class="not-first" @click="fail2">错误请求（HTTP 404）</button>
            <button size="mini" type="warn" @click="fail3">访问404公司（可取消）</button>
            <button size="mini" type="default" class="not-first" @click="cancel">取消访问404公司</button>
        </view>
        <view>
            <image class="logo" :src="logo" @click="pickerImg"></image>
            <text class="title">{{ title }}</text>
        </view>

        <view style="margin-top: 20rpx;">
            <view style="font-weight: 800;">接口响应</view>
            <view style="word-break: break-word;">{{ json }}</view>
        </view>
    </view>
</template>

<script>
    import {
        request
    } from '../../uni_modules/jamling-request/dist';

    export default {
        data() {
            return {
                title: '点击上面的图片选择图片上传',
                logo: '/static/logo.png',
                json: '',
                task: undefined,
                methodRangle: ['GET', 'POST', 'PUT', 'DELETE'],
                methodIndex: 0,
                urlRangle: [{
                        text: '成功请求',
                        url: 'static/success.json'
                    },
                    {
                        text: '业务错误(通用)',
                        url: 'static/fail_business.json'
                    },
                    {
                        text: '业务错误（未登录）',
                        url: 'static/fail_not_login.json'
                    },
                    {
                        text: 'Google（404公司）',
                        url: 'https://www.google.com'
                    },
                    {
                        text: '响应二进制（图形验证码）',
                        url: 'static/logo.png'
                    }
                ],
                urlIndex: 0,
                url: 'static/success.json',
                promiseStyle: true
            };
        },
        methods: {
            changeMethod(e) {
                this.methodIndex = e.detail.value;
            },
            changeUrl(e) {
                this.urlIndex = e.detail.value;
                this.url = this.urlRangle[this.urlIndex].url;
            },
            changetStyle(e) {
                this.promiseStyle = e.detail.value;
            },
            sendRequest() {
                var method = this.methodRangle[this.methodIndex];
                var url = this.urlRangle[this.urlIndex].url;
                if (this.promiseStyle) {
                    this.$request.request({
                        method: method,
                        url: url
                    }).then(res => {
                        console.log('success (promise style)');
                        this.json = JSON.stringify(res);
                    }).catch(res => {
                        console.log('failure (promise style)');
                        this.json = JSON.stringify(res);
                    });
                } else {
                    return this.$request.request({
                        method: method,
                        url: url,
                        success: res => {
                            console.log('success (callback style)');
                            this.json = JSON.stringify(res);
                        },
                        fail: res => {
                            console.log('failure (callback style)');
                            this.json = JSON.stringify(res);
                        }
                    });
                }
            },
            example1(full) {
                var that = this;
                this.$request.get({
                    url: 'static/success.json',
                    business: full ? null : 'data',
                    success: res => {
                        console.log('success');
                        that.json = JSON.stringify(res);
                    },
                    fail: res => {
                        console.log('failure');
                        that.json = JSON.stringify(res);
                    },
                    complete: res => {
                        // since 1.2.0
                        console.log('complete', res);
                    }
                });
            },
            async example2() {
                var that = this;
                var res = await this.$request
                    .get({
                        baseUrl: 'http://127.0.0.1:8080/',
                        url: 'static/success.json',
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
            getImg() {
                this.$request.get({
                    url: 'http://127.0.0.1:8080/static/logo.png',
                    responseType: 'arraybuffer'
                }).then(res => {
                    console.log(res)
                })
            },
            fail1() {
                var that = this;
                this.$request
                    .post({
                        url: 'static/fail_business.json',
                        data: {
                            date: '2019'
                        }
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
            fail2() {
                var that = this;
                this.$request
                    .post({
                        url: 'static/fail_not_login.json'
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
            fail3() {
                var that = this;
                this.task = this.$request.get({
                    url: 'https://www.google.com',
                    loadingTip: '正在连接404公司...',
                    success: (res => {
                        console.log('喔，竟然能访问404公司！');
                    }),
                    fail: (res => {
                        console.error('访问不了是正常的，不然为啥叫404公司')
                    })
                })
                console.log('task', this.task);
            },
            cancel() {
                if (this.task && this.task.abort) {
                    console.log(this.task);
                    this.task.abort();
                    return true;
                }
                return false;
            },
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
                        slashAbsoluteUrl: true // 如果有大量的类似请求，可以配置全局参数
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
                                    let p = '上传进度: ' + res2.totalBytesSent + '/' + res2
                                        .totalBytesExpectedToSend + ' (' + res2.progress + '%)';
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
        },
        onBackPress: () => {
            return this.cancel();
        }
    };
</script>

<style>
    .content {
        padding: 20rpx;
        display: block;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        /* justify-content: center; */
    }

    .row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .logo {
        height: 200upx;
        width: 200upx;
        margin-top: 20upx;
        margin-left: auto;
        margin-right: auto;
        margin-bottom: 0upx;
    }

    .title {
        font-size: 36upx;
        display: block;
    }

    .not-first {
        margin-left: 20rpx;
    }
</style>