import App from '@/components/App'
// import * as Sentry from '@sentry/vue'
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

// Vue2 用のSentry設定
// https://sentry.io/organizations/syun/projects/akadako-graph-vue/getting-started/?product=performance-monitoring&product=session-replay&siblingOption=vue2
// Sentry.init({
//   Vue,
//   dsn: 'https://460e027b6f5ba4ba6289414c3124f6a6@o181906.ingest.us.sentry.io/4507502995898368',
//   integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
//   // Performance Monitoring
//   tracesSampleRate: 1.0, //  Capture 100% of the transactions
//   // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
//   tracePropagationTargets: ['localhost', /^https:\/\/graph\.akadako\.com\//, /^https:\/\/test-graph\.akadako\.com\//],
//   // Session Replay
//   replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
//   replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
// })

new Vue({
  store,
  render: (h) => h(App),
}).$mount('#app')
;
