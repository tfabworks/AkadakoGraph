import SerialPort from '@serialport/stream'
import WSABinding from 'web-serial-binding'
import bindTransport from 'firmata-io'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { getData } from '@/lib/firmata'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(dayjs.tz.guess())

const milliSeconds = 1000

const state = {
  connectState: 'disConnect',
  firmata: null,
  nativePort: null,
  port: null,
  renderInfo: {
    main: {
      shouldRender: false,
      kind: ''
    },
    sub: {
      shouldRender: false,
      kind: ''
    }
  },
  renderTimer: null,
  graphValue: localStorage.getItem('graphValue') ? JSON.parse(localStorage.getItem('graphValue')) : [],
  graphValueSub: localStorage.getItem('graphValueSub') ? JSON.parse(localStorage.getItem('graphValueSub')) : [],
  pauseFlag: false
}

const getters = {
  connected() {
    if (state.firmata && state.firmata.isReady) {
      return true
    }
    return false
  },
  values() {
    return {
      main: state.graphValue,
      sub: state.graphValueSub
    }
  }
}

const mutations = {
  addValue(state, { isMain, newValue }) {
    if (isMain) {
      state.graphValue.push(newValue)
      localStorage.setItem('graphValue', JSON.stringify(state.graphValue))
    } else {
      state.graphValueSub.push(newValue)
      localStorage.setItem('graphValueSub', JSON.stringify(state.graphValueSub))
    }
  },
  resetValue(state, target) {
    if (target == 'main') {
      state.graphValue = []
      localStorage.setItem('graphValue', JSON.stringify([]))
    } else if (target == 'sub') {
      state.graphValueSub = []
      localStorage.setItem('graphValueSub', JSON.stringify([]))
    } else if (target == 'all') {
      state.graphValue = []
      localStorage.setItem('graphValue', JSON.stringify([]))
      state.graphValueSub = []
      localStorage.setItem('graphValueSub', JSON.stringify([]))
    }
  },
  pause(state) {
    state.pauseFlag = !state.pauseFlag
  }
}

const actions = {
  async connect(ctx) {
    try {
      SerialPort.Binding = WSABinding
      const Firmata = bindTransport(SerialPort)
      ctx.state.nativePort = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x04D8, usbProductId: 0xE83A }, // Licensed for AkaDako
          { usbVendorId: 0x04D8, usbProductId: 0x000A }, // Dev board
          { usbVendorId: 0x04D9, usbProductId: 0xB534 } // Use in the future]
        ]
      })
      ctx.state.port = new SerialPort(ctx.state.nativePort, {
        baudRate: 57600,
        autoOpen: false
      })
      ctx.state.firmata = new Firmata(ctx.state.port, {
        reportVersionTimeout: 0,
        samplingInterval: 1000
      })

      ctx.state.port.open(e => {
        if (e) {
          console.error(e)
          return
        }
        ctx.state.firmata.on('ready', () => { })
      })
    } catch (e) {
      console.error(e)
    }
  },
  disConnect(ctx) {
    ctx.state.port.close()
    ctx.state.firmata.on('close', () => {})
    ctx.state.nativePort = null
    ctx.state.port = null
    ctx.state.firmata = null
    clearInterval(ctx.state.renderTimer)
    ctx.state.renderTimer = null
  },
  render(ctx, { kind, axis }) {
    if (ctx.state.renderTimer) {
      clearInterval(ctx.state.renderTimer)
      ctx.state.renderTimer = null
    }

    ctx.commit('resetValue', axis)

    if (axis === 'main') {
      ctx.state.renderInfo.main.shouldRender = true
      ctx.state.renderInfo.main.kind = kind
    } else {
      ctx.state.renderInfo.sub.shouldRender = true
      ctx.state.renderInfo.sub.kind = kind
    }

    const addValueCallback = async () => {
      if (!ctx.state.pauseFlag) {
        const date = dayjs().tz().format()

        if (ctx.state.renderInfo.main.shouldRender && ctx.state.renderInfo.sub.shouldRender) {
          Promise.all([
            getData(ctx.state.firmata, ctx.state.renderInfo.main.kind),
            getData(ctx.state.firmata, ctx.state.renderInfo.sub.kind)
          ])
            .then((res) => {
              ctx.commit('addValue', {
                isMain: true,
                newValue: {
                  y: res[0],
                  x: date
                }
              })

              ctx.commit('addValue', {
                isMain: false,
                newValue: {
                  y: res[1],
                  x: date
                }
              })
            })
            .catch((e) => {
              console.error(e)
            })
        } else if (ctx.state.renderInfo.main.shouldRender) {
          ctx.commit('addValue', {
            isMain: true,
            newValue: {
              y: await getData(ctx.state.firmata, ctx.state.renderInfo.main.kind),
              x: date
            }
          })
        } else if (ctx.state.renderInfo.sub.shouldRender) {
          ctx.commit('addValue', {
            isMain: false,
            newValue: {
              y: await getData(ctx.state.firmata, ctx.state.renderInfo.sub.kind),
              x: date
            }
          })
        }
      }
    }

    ctx.state.renderTimer = setInterval(addValueCallback, milliSeconds)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
