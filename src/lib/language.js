import VueI18n from 'vue-i18n'
import Vue from 'vue'

Vue.use(VueI18n)

export const messages = {
  'ja': require('./translate/ja.json'),
  'en': require('./translate/en.json')
}

export const i18n = new VueI18n({
  locale: 'ja',
  fallbackLocale: 'ja',
  messages
})

Vue.i18n = i18n
