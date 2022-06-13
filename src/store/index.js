import Vue from 'vue'
import Vuex from 'vuex'
import serial from './modules/serial'
import language from './modules/language'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    serial,
    language
  }
})
