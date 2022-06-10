import { getUserLanguage } from '../../lib/language'

const state = {
  locale: localStorage.getItem('preferences/locale') ? localStorage.getItem('preferences/locale') : getUserLanguage()
}

const getters = {
  isJapanese: state => state.locale === 'ja',
  isEnglish: state => state.locale === 'en'
}

const mutations = {
  setPreferences(state, pref) {
    if (pref.locale) {
      localStorage.setItem('preferences/locale', pref.locale)
      state.locale = pref.locale
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations
}
