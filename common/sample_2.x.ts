import request from "../uni_modules/jamling-request";
request.setConfig({
  baseUrl: "https://api.example.com/",
  debug: true,
  toastError: true,
  interceptor: {
    request: (config) => {
      console.log("Request config:", config);
      // 给header添加全局请求参数token
      if (!config.header!.token) {
        config.header!.token = "my_token";
      }
      // 添加一个自定义的参数，默认异常请求都弹出一个toast提示
      if (config.toastError === undefined) {
        config.toastError = true;
      }
    },
    response: (res, state) => {
      if (res.code === 0) {
        state.isSuccess = true;
      } else if (res.code === 1001) {
        state.isError = true;
        // token失效，需要重新登录
        uni.navigateTo({
          url: "/pages/loign/login",
        });
      }
    },
  },
});
