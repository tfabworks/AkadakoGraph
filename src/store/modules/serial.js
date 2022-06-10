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
  intervalTimer: null,
  intervalTimerSub: null,
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
    if (!state.pauseFlag) {
      if (isMain) {
        state.graphValue.push(newValue)
        localStorage.setItem('graphValue', JSON.stringify(state.graphValue))
      } else {
        state.graphValueSub.push(newValue)
        localStorage.setItem('graphValueSub', JSON.stringify(state.graphValueSub))
      }
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
    
    clearInterval(ctx.state.intervalTimer)
    clearInterval(ctx.state.intervalTimerSub)
    ctx.state.intervalTimer = null
    ctx.state.intervalTimerSub = null
    ctx.state.nativePort = null
    ctx.state.port = null
    ctx.state.firmata = null
  },
  render(ctx, { kind, axis }) {
    const addValueCallback = async () => {
      ctx.commit('addValue', {
        isMain: axis == 'main' ? true : false,
        newValue: {
          y: await getData(ctx.state.firmata, kind),
          x: dayjs().tz().format()
        }
      })
    }

    ctx.commit('resetValue', axis)
    if (axis == 'main') {
      if (ctx.state.intervalTimer != null) {
        clearInterval(ctx.state.intervalTimer)
      }
      ctx.state.intervalTimer = setInterval(addValueCallback, milliSeconds)
    } else if (axis == 'sub') {
      if (ctx.state.intervalTimerSub != null) {
        clearInterval(ctx.state.intervalTimerSub)
      }
      ctx.state.intervalTimerSub = setInterval(addValueCallback, milliSeconds)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
