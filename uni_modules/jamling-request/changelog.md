#jamling-request - 更新日志

## 1.3.0（2025-12-27）
- 支持uni_modules，使用ES6规范重写
- 填完了获取图形验证码的坑
- 修复未返回UploadTask|RequestTask的Bug
- 更加完整的JSDoc，uni-app项目为JS和TS语言，代码提示一致
## 1.2.0（2019-10-10）
- 添加请求开始prepare和请求结束complete回调

## 1.1.0（2019-08-29）
- 添加取消请求，如果想取消，则不能使用promise，get/post/request返回的是uniapp的requestTask，可使用abort来取消请求，取消后的请求，不会走j-request的全局错误处理器。

## 1.0.0（2019-08-25）
- 添加了大量的JSDoc注释
- 修复了slashAbsoluteUrl的判断异常

## 0.0.1（2019-08-23）
- 支持PCallback和romise，Callback优先
- 支持请求拦截和响应拦截及全局请求异常处理
- 支持文件上传及进度监听