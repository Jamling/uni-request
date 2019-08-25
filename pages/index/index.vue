<template>
    <view class="content">
        <button size="mini" @click="example1(false)">成功请求</button>
        <button size="mini" class="not-first" @click="example2">成功请求（Promise)</button>
        <button size="mini" class="not-first" @click="example1(true)">成功请求（返回整个业务对象）</button>
        <view>
            <button size="mini" type="warn" @click="fail1">错误请求（业务错误）</button>
            <button size="mini" type="warn" class="not-first" @click="fail2">错误请求（HTTP 404）</button>
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
export default {
    data() {
        return {
            title: '点击上面的图片选择图片上传',
            logo: '/static/logo.png',
            json: ''
        };
    },
    onLoad() {
        this.$request.post()
    },
    methods: {
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
        },
        example2() {
            var that = this;
            this.$request
                .get({
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
        fail1() {
            var that = this;
            this.$request
                .post({
                    url: 'solar',
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
                    url: 'test'
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
