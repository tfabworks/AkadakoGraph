import { i18n } from '@/lib/language'

// const getUserLanguage = () => {
//   const language = (navigator.languages && navigator.languages[0]) ||
//     navigator.language ||
//     navigator.userLanguage ||
//     navigator.browserLanguage

//   return language == ('ja' || 'ja-JP') ? 'ja' : 'en'
// }

const state = {
  language: 'ja'
  // 多言語対応する場合に↓の処理を適用
  // language: localStorage.getItem('language') ? localStorage.getItem('language') : getUserLanguage()
}

const getters = {
  isJapanese: state => state.language === 'ja',
  isEnglish: state => state.language === 'en'
}

const mutations = {
  setLanguage(state, lang) {
    if (lang) {
      localStorage.setItem('language', lang)
      state.language = lang
      i18n.locale = lang
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations
}
