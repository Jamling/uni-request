import Vue from 'vue'
import App from './App'
import request from './common/sample_2.x'

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