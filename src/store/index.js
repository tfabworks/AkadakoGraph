import Vue from 'vue'
import Vuex from 'vuex'
import firmata from './modules/firmata'
import share from './modules/share'

Vue.use(Vuex)

const state = {
  showConnectStatusOnHeader: false,
}

const mutations = {
  showConnectStatusOnHeader(state, value) {
    state.showConnectStatusOnHeader = value
  },
}

export default new Vuex.Store({
  modules: {
    firmata,
    share,
  },
  mutations,
  state,
})
