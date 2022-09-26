import { mount, createLocalVue, config } from '@vue/test-utils'
import Dashboard from '@/components/pages/Dashboard.vue'

config.showDeprecationWarnings = false

jest.setTimeout(10000)

const localVue = createLocalVue()
let wrapper = {}

beforeEach(() => {
  wrapper = mount(Dashboard, {
    localVue
  })
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

describe('広告表示', () => {
  test('広告が2秒後に消える', async () => {
    expect(wrapper.find('.common-ad').exists()).toBe(true)
    await sleep(1000)
    expect(wrapper.find('.common-ad').exists()).toBe(true)
    await sleep(1000)
    expect(wrapper.find('.common-ad').exists()).toBe(false)
    wrapper.destroy()
  })
})
