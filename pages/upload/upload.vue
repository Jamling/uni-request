<template>
    <view class="page panel">
        <view class="row controls">
            <picker :range="urlRangle" range-key="text" :value="urlIndex" @change="changeUrl" style="margin-right: 10px;">
                <text class="picker-text">{{ urlRangle[urlIndex].text }}</text>
            </picker>
            <input class="input-url" v-model="url" placeholder="请输入请求地址" />
        </view>
        <view class="row controls">
            <text class="label">图片张数：</text>
            <input class="input-url" :value="pickCount" min="1" max="9"/>
            <text class="label" style="margin-left: auto;">压缩图片：</text>
            <switch :checked="compress" @change="compress = !compress" />
            
        </view>
        <view class="row">
            
        </view>
        <view class="row controls" style="justify-content: space-between;">
            <button size="mini" type="primary" @click="pickerImg()">发送请求</button>
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
                title: '点击上面的图片选择图片上传',
                showRequestJson: false,
                requestJsonText: '',
                responseJsonText: '',
                task: undefined,
                methodRangle: ['GET', 'POST', 'PUT', 'DELETE'],
                methodIndex: 0,
                urlRangle: [{
                    text: 'UniDemo上传接口',
                    url: 'https://unidemo.dcloud.net.cn/upload'
                }],
                urlIndex: 0,
                url: 'https://unidemo.dcloud.net.cn/upload',
                promiseStyle: true,
                pickCount: 1,
                compress: true
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
                    count: this.pickCount,
                    sizeType:['compressed'],
                    sourceType: ['album'],
                    success: function(res) {
                        console.log(res);
                        var path = res.tempFilePaths[0];
                        that.upload(path);
                    }
                });
            },
            upload(path) {
                var that = this;

                var uploadTask = that.$request
                    .upload({
                        url: this.url,
                        filePath: path,
                        name: 'file',
                        business: null,
                        skipInterceptorResponse: true,
                        data: {
                            
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
                        this.responseJsonText = JSON.stringify(res2, null, 2);
                    })
                    .catch(res2 => {
                        console.log(res2);
                        this.responseJsonText = JSON.stringify(res2, null, 2);
                    });
            }
        },
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