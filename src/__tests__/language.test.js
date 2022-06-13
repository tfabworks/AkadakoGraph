import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { messages } from '../lib/language'
import Vuex from 'vuex'
import store from '@/store'
import TheHeader from '@/components/TheHeader.vue'
import { getUserLanguage } from '@/lib/language'

describe('preference/localeの決定処理', () => {
  Vue.use(VueI18n)
  const localVue = createLocalVue()
  localVue.use(Vuex)
  const i18n = new VueI18n({
    language: '',
    messages
  })

  let wrapper = {}

  beforeEach(() => {
    wrapper = shallowMount(TheHeader, {
      localVue,
      store,
      i18n
    }
    )
  })

  afterEach(() => {
    wrapper.destroy()
    localStorage.clear()
  })

  it('LSがenでnavigatorがjaの場合', async () => {
    localStorage.setItem('language', 'en')
    Object.defineProperty(window, 'navigator', {
      get: jest.fn().mockReturnValue({ languages: ['ja', 'ja-JP'] }),
    })
    store.state.language.language = localStorage.getItem('language') ? localStorage.getItem('language') : getUserLanguage()
    expect(wrapper.vm.isJapanese).toBeFalsy()
    expect(wrapper.vm.isEnglish).toBeTruthy()
  })

  it('LSがenでnavigatorがenの場合', async () => {
    localStorage.setItem('language', 'en')
    Object.defineProperty(window, 'navigator', {
      get: jest.fn().mockReturnValue({ languages: ['en', 'en-US'] }),
    })
    store.state.language.language = localStorage.getItem('language') ? localStorage.getItem('language') : getUserLanguage()
    expect(wrapper.vm.isJapanese).toBeFalsy()
    expect(wrapper.vm.isEnglish).toBeTruthy()
  })

  it('LSがjaでnavigatorがjaの場合', async () => {
    localStorage.setItem('language', 'ja')
    Object.defineProperty(window, 'navigator', {
      get: jest.fn().mockReturnValue({ languages: ['ja', 'ja-JP'] }),
    })
    store.state.language.language = localStorage.getItem('language') ? localStorage.getItem('language') : getUserLanguage()
    expect(wrapper.vm.isJapanese).toBeTruthy()
    expect(wrapper.vm.isEnglish).toBeFalsy()
  })
  
  it('LSがjaでnavigatorがenの場合', async () => {
    localStorage.setItem('language', 'ja')
    Object.defineProperty(window, 'navigator', {
      get: jest.fn().mockReturnValue({ languages: ['en', 'en-US'] }),
    })
    store.state.language.language = localStorage.getItem('language') ? localStorage.getItem('language') : getUserLanguage()
    expect(wrapper.vm.isJapanese).toBeTruthy()
    expect(wrapper.vm.isEnglish).toBeFalsy()
  })

  it('LSがnullでnavigatorがjaの場合', async () => {
    Object.defineProperty(window, 'navigator', {
      get: jest.fn().mockReturnValue({ languages: ['ja', 'ja-JP'] }),
    })
    store.state.language.language = localStorage.getItem('language') ? localStorage.getItem('language') : getUserLanguage()
    expect(wrapper.vm.isJapanese).toBeTruthy()
    expect(wrapper.vm.isEnglish).toBeFalsy()
  })

  it('LSがnullでnavigatorがenの場合', async () => {
    Object.defineProperty(window, 'navigator', {
      get: jest.fn().mockReturnValue({ languages: ['en', 'en-US'] }),
    })
    store.state.language.language = localStorage.getItem('language') ? localStorage.getItem('language') : getUserLanguage()
    expect(wrapper.vm.isJapanese).toBeFalsy()
    expect(wrapper.vm.isEnglish).toBeTruthy()
  })
})