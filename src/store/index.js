import Vue from 'vue'
import Vuex from 'vuex'
import serial from './modules/serial'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    serial
  }
})
