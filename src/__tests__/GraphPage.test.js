import { shallowMount, createLocalVue } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { messages } from '../lib/language'
import Vuex from 'vuex'
import store from '@/store'
import GraphPage from '@/components/pages/dashboard/GraphPage.vue'

Vue.use(VueI18n)
const i18n = new VueI18n({
  locale: 'ja',
  messages
})

const localVue = createLocalVue()
localVue.use(Vuex)
let wrapper = {}
beforeEach(() => {
  wrapper = shallowMount(GraphPage, {
    localVue,
    store,
    i18n
  }
  )
})
afterEach(() => {
  wrapper.destroy()
})

describe('ボタン類の挙動', () => {
  it('ダウンロード', async () => {
  })

  it('一時停止・再生', async () => {
    //pauseFlagの初期値を確認
    expect(store.state.microbit.pauseFlag).toBeFalsy

    //一時停止ボタンをクリック
    wrapper.find('#pause-btn').trigger('click')
    await flushPromises()

    //pauseFlagの変更とボタンの変化を確認
    expect(store.state.microbit.pauseFlag).toBeTruthy
    expect(wrapper.find('#pause-btn span').exists()).toBeFalsy
    expect(wrapper.find('#play-btn span').exists()).toBeTruthy

    //再生ボタンをクリック
    wrapper.find('#play-btn').trigger('click')
    await flushPromises()

    //pauseFlagの変更とボタンの変化を確認 
    expect(store.state.microbit.pauseFlag).toBeFalsy
    expect(wrapper.find('#pause-btn span').exists()).toBeTruthy
    expect(wrapper.find('#play-btn span').exists()).toBeFalsy
  })
  
  it('削除', async () => {
    //storeとLSのgraphValueの存在を確認
    localStorage.setItem('graphValue', '[{"y":"255","x":"2021-05-13T06:55:13.921Z"},{"y":"48","x":"2021-05-13T06:55:14.994Z"},{"y":"44","x":"2021-05-13T06:55:16.064Z"},{"y":"44","x":"2021-05-13T06:55:17.130Z"},{"y":"48","x":"2021-05-13T06:55:18.194Z"},{"y":"44","x":"2021-05-13T06:55:19.263Z"},{"y":"44","x":"2021-05-13T06:55:20.334Z"},{"y":"48","x":"2021-05-13T06:55:21.408Z"},{"y":"44","x":"2021-05-13T06:55:22.470Z"},{"y":"49","x":"2021-05-13T06:55:23.534Z"}]')
    expect(typeof (localStorage.getItem('graphValue'))).toBe('string')
    expect(typeof (store.state.microbit.graphValue)).toBe('object')
    
    //削除ボタンをクリック
    wrapper.find('#delete-btn').trigger('click')
    await flushPromises()

    //storeとLSのgraphValueの存在を確認
    expect(localStorage.getItem('graphValue')).toBe('[]')
    expect(store.state.microbit.graphValue).toEqual([])
  })
})