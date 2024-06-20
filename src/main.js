import App from '@/components/App'
import Buefy from 'buefy'
import Vue from 'vue'
import { SensorMap } from './lib/constants'
import store from './store'

Vue.use(Buefy)

Vue.config.productionTip = false
// eslint-disable-next-line no-unused-vars
Vue.config.warnHandler = function (msg, vm, trace) {
  const ignoreWarnMessage = 'The .native modifier for v-on is only valid on components but it was used on <a>.'
  if (msg === ignoreWarnMessage) {
    msg = null
    vm = null
    // eslint-disable-next-line no-unused-vars
    trace = null
  }
}

const dateFormatOpts = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}
const toInterval = (i) =>
  [
    [86400000 * 365.25, '年'],
    [86400000 * 30.5, '月'],
    [86400000, '日'],
    [3600000, '時間'],
    [60000, '分'],
    [1000, '秒'],
    [1, 'ミリ秒'],
  ]
    .map(([n, u]) => [i / n, u])
    .filter(([v]) => 1 <= v)
    .map(([n, u]) => `${n.toFixed(1)}${u}`)[0]

Vue.filter('sensor', (sensorID) => SensorMap.get(sensorID))
Vue.filter('sensorName', (sensorID) => SensorMap.get(sensorID)?.name)
Vue.filter('sensorKind', (sensorID) => SensorMap.get(sensorID)?.kind)
Vue.filter('sensorUnit', (sensorID) => SensorMap.get(sensorID)?.unit)
Vue.filter('YmdHMS', (ts) => new Date(ts).toLocaleString('ja-JP', dateFormatOpts))
Vue.filter('Ymd', (ts) => new Date(ts).toLocaleDateString('ja-JP', dateFormatOpts))
Vue.filter('HMS', (ts) => new Date(ts).toLocaleTimeString('ja-JP', dateFormatOpts))
Vue.filter('toInterval', (interval) => toInterval(interval))

new Vue({
  store,
  render: (h) => h(App),
}).$mount('#app')
