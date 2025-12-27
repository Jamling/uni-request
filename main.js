import request from './common/sample_1.x'
// #ifndef VUE3
import Vue from 'vue'
import App from './App'

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
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import App from './App.vue'
export function createApp() {
  const app = createSSRApp(App)
  app.config.globalProperties.$request = request
  return {
    app
  }
}
// #endif