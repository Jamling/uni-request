<template>
    <view class="page panel">
        <view class="row controls">
            <picker :range="methodRangle" :value="methodIndex" @change="changeMethod" style="margin-right: 10px;">
                <text class="picker-text">{{ methodRangle[methodIndex] }}</text>
            </picker>
            <input class="input-url" v-model="url" placeholder="请输入请求地址" />
        </view>

        <view class="row controls">
            <text class="label">快捷地址</text>
            <picker :range="urlRangle" range-key="text" :value="urlIndex" @change="changeUrl">
                <text class="picker-text">{{ urlRangle[urlIndex].text }}</text>
            </picker>
        </view>

        <view class="row controls">
            <text class="label">Promise 风格</text>
            <switch :checked="promiseStyle" @change="changetStyle" />
            <text class="label">响应拦截</text>
            <switch :checked="!skipInterceptorResponse" @change="skipInterceptorResponse=!skipInterceptorResponse" />
        </view>
        <view class="row controls">

            <text class="label">Content-Type</text>
            <picker :range="contentTypes" :value="contentTypeIndex" @change="changeContentType">
                <text class="picker-text">{{ contentTypes[contentTypeIndex] }}</text>
            </picker>
        </view>

        <view class="row controls" style="justify-content: space-between;">
            <button size="mini" type="primary" @click="sendRequest">发送请求</button>
            <button size="mini" @click="cancel">取消请求</button>
            <button size="mini" @click="requestJsonText=responseJsonText=''">清除</button>
        </view>

        <view class="response" style="display: flex; flex-wrap: wrap;">
            <view class="response-title picker-text label" @click="showRequestJson=true">请求参数</view>
            <view class="response-title picker-text label" @click="showRequestJson=false">接口响应</view>
            <scroll-view v-show="showRequestJson" class="response-body" scroll-y>
                <text class="mono">{{ requestJsonText }}</text>
            </scroll-view>
            <scroll-view v-show="!showRequestJson" class="response-body" scroll-y>
                <text class="mono">{{ responseJsonText }}</text>
            </scroll-view>
        </view>
    </view>
</template>

<script>
    export default {
        data() {
            return {
                showRequestJson: false,
                requestJsonText: '',
                responseJsonText: '',
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
                contentTypes: ['json', 'form', 'file'],
                contentTypeIndex: 0,
                promiseStyle: true,
                skipInterceptorResponse: false
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
            changeContentType(e) {
                this.contentTypeIndex = e.detail.value;
            },
            parseJSONSafe(text) {
                if (!text || !text.trim()) return undefined;
                try {
                    return JSON.parse(text);
                } catch (e) {
                    uni.showToast({
                        title: 'JSON 格式错误',
                        icon: 'none'
                    });
                    return undefined;
                }
            },
            sendRequest() {
                let options = {
                    method: this.methodRangle[this.methodIndex],
                    url: this.urlRangle[this.urlIndex].url,
                    loadingTip: '请求中，请稍候...',
                    toastError: true
                };
                if (this.skipInterceptorResponse) {
                    options.business = undefined
                }
                if (options.url.endsWith('.png')) {
                    options.responseType = 'arraybuffer';
                }
                if (this.promiseStyle) {
                    this.$request.request({
                        ...options
                    }).then(res => {
                        console.log('success (promise style)');
                        this.responseJsonText = JSON.stringify(res, null, 2);
                    }).catch(res => {
                        console.log('failure (promise style)');
                        this.responseJsonText = JSON.stringify(res, null, 2);
                    });
                } else {
                    this.task = this.$request.request({
                        ...options,
                        success: res => {
                            console.log('success (callback style)');
                            this.responseJsonText = JSON.stringify(res, null, 2);
                        },
                        fail: res => {
                            console.log('failure (callback style)');
                            this.responseJsonText = JSON.stringify(res, null, 2);
                        }
                    });
                }
            },
            cancel() {
                if (this.task && this.task.abort) {
                    console.log(this.task);
                    this.task.abort();
                    return true;
                }
                return false;
            },
        },
        onBackPress: () => {
            return false;
        },
        onLoad() {
            if (this.$request.version) {

            } else {
                this.$request.interceptor.prepare = (config) => {
                    this.requestJsonText = JSON.stringify(config, null, 2)
                }
                this.$request.interceptor.complete = (config) => {

                }
            }
        }
    };
</script>

<style lang="scss">
    .page {
        //padding: 24rpx;
        background: #f5f7fa;
        min-height: 100vh;
    }

    .panel {
        background: #fff;
        border-radius: 8rpx;
        padding: 20rpx;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    }

    .row {
        display: flex;
        align-items: center;
        min-height: 32px;
    }

    .controls {
        display: flex;
        gap: 12rpx;
        align-items: center;
        margin-bottom: 12rpx;
        border-bottom: 1px solid #e6eaf0;
        padding-bottom: 12rpx;
    }

    .picker-text {
        padding: 8rpx 12rpx;
        background: #eef2f7;
        border-radius: 6rpx;
    }

    .input-url {
        flex: 1;
        padding: 10rpx;
        border: 1rpx solid #eee;
        border-radius: 6rpx;
    }

    .label {
        margin-right: auto;
        color: #666;
    }

    .options {
        display: flex;
        gap: 20rpx;
        margin: 12rpx 0;
    }

    .editor {
        display: flex;
        gap: 12rpx;
        margin: 12rpx 0;
    }

    .editor-col {
        flex: 1;
    }

    .editor-title {
        font-weight: 700;
        margin-bottom: 6rpx;
    }

    .textarea {
        height: 180rpx;
        border: 1rpx solid #eee;
        border-radius: 6rpx;
        padding: 10rpx;
        font-family: monospace;
    }

    .actions {
        display: flex;
        gap: 12rpx;
        margin-top: 10rpx;
    }

    .response {
        margin-top: 14rpx;
    }

    .response-title {
        font-weight: 800;
        margin-bottom: 6rpx;
    }

    .response-body {
        height: 240px;
        background: #0f1724;
        color: #e6eef8;
        padding: 12rpx;
        border-radius: 6rpx;
    }

    .mono {
        font-family: monospace;
        white-space: pre-wrap;
        word-break: break-word;
    }

    .status-row {
        margin-top: 8rpx;
        color: #666;
    }

    .status-pending {
        color: #ff9900;
    }

    .status-success {
        color: #18a058;
    }

    .status-error {
        color: #d9534f;
    }
</style>