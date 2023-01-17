import SerialPort from '@serialport/stream'
import WSABinding from 'web-serial-binding'
import bindTransport from 'firmata-io'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { getData } from '@/lib/firmata'
import MidiDakoTransport from '@/lib/midi/transport'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(dayjs.tz.guess())

const getSettings = () => ({
  pins: [
    {supportedModes: [], value: 0, report: 1, analogChannel: 127
    },
    {supportedModes: [], value: 0, report: 1, analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      3,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      3,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      3,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      3,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      3,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      3,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 127
    },
    {supportedModes: [
      0,
      1,
      2,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 0
    },
    {supportedModes: [
      0,
      1,
      2,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 1
    },
    {supportedModes: [
      0,
      1,
      2,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 2
    },
    {supportedModes: [
      0,
      1,
      2,
      4,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 3
    },
    {supportedModes: [
      0,
      1,
      2,
      4,
      6,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 4
    },
    {supportedModes: [
      0,
      1,
      2,
      4,
      6,
      11
    ],
    value: 0,
    report: 1,
    analogChannel: 5
    }
  ],
  analogPins: [
    14,
    15,
    16,
    17,
    18,
    19
  ]
})

const timeoutReject = delay =>
  new Promise(
    (_, reject) => {
      setTimeout(
        () => reject(`timeout ${delay}ms`),
        delay
      )
    }
  )

const milliSecondsList = [
  1000,
  3000,
  5000,
  10000,
  30000,
  60000,
  180000,
  300000,
  600000,
  1800000
]

const connectingWaitingTime = 1000
const boardVersionWaitingTime = 200
const BOARD_VERSION_QUERY = 15
const WATER_TEMPERATURE_QUERY = 2
const ULTRASONIC_DISTANCE_QUERY = 1

const tmpAxisInfo = {
  main: localStorage.getItem('graphKind') ? localStorage.getItem('graphKind') : '',
  sub: localStorage.getItem('graphKindSub') ? localStorage.getItem('graphKindSub') : ''
}

const state = {
  Firmata: null,
  firmata: null,
  serial: {
    nativePort: null,
    port: null,
  },
  midi: {
    portInfo: null
  },
  version: null,
  isSerial: false,
  milliSeconds: 1000,
  axisInfo: {
    main: {
      shouldRender: tmpAxisInfo.main ? true : false,
      kind: tmpAxisInfo.main
    },
    sub: {
      shouldRender: tmpAxisInfo.sub ? true : false,
      kind: tmpAxisInfo.sub
    }
  },
  renderTimer: null,
  graphValue: localStorage.getItem('graphValue') ? JSON.parse(localStorage.getItem('graphValue')) : [],
  graphValueSub: localStorage.getItem('graphValueSub') ? JSON.parse(localStorage.getItem('graphValueSub')) : [],
  shouldPause: true
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
  },
  existValue() {
    return state.graphValue.length || state.graphValueSub.length ? true : false
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
  setKind(state, payload) {
    state.axisInfo.main.kind = payload
    localStorage.setItem('graphKind', payload)
    state.axisInfo.main.shouldRender = payload ? true : false
  },
  setKindSub(state, payload) {
    state.axisInfo.sub.kind = payload
    localStorage.setItem('graphKindSub', payload)
    state.axisInfo.sub.shouldRender = payload ? true : false
  },
  setShouldRender(state, { isMain, payload }) {
    if (isMain) {
      state.axisInfo.main.shouldRender = payload
    } else {
      state.axisInfo.sub.shouldRender = payload
    }
  }
}

const actions = {
  setupFirmata(ctx) {
    // Setup firmata
    ctx.state.firmata.once('open', () => {
      ctx.state.firmata.on('ready', () => {})
      // this.state = 'connect'
      // this.emit('connect')
    })
    ctx.state.firmata.once('close', () => {
      // if (this.state === 'disconnect') return
      // this.releaseBoard()
    })
    ctx.state.firmata.once('disconnect', error => {
      console.error(error)
      // if (this.state === 'disconnect') return
      // this.handleDisconnectError(error)
    })
    ctx.state.firmata.once('error', error => {
      console.error(error)
      // if (this.state === 'disconnect') return
      // this.handleDisconnectError(error)
    })
    ctx.state.firmata.clearSysexResponse(WATER_TEMPERATURE_QUERY)
    ctx.state.firmata.sysexResponse(WATER_TEMPERATURE_QUERY, data => {
      const pin = data[0]
      ctx.state.firmata.emit(`water-temp-reply-${pin}`, data.slice(1))
    })
    ctx.state.firmata.clearSysexResponse(ULTRASONIC_DISTANCE_QUERY)
    ctx.state.firmata.sysexResponse(ULTRASONIC_DISTANCE_QUERY, data => {
      const pin = data[0]
      ctx.state.firmata.emit(`ultrasonic-distance-reply-${pin}`, data.slice(1))
    })
    ctx.state.firmata.clearSysexResponse(BOARD_VERSION_QUERY)
    ctx.state.firmata.sysexResponse(BOARD_VERSION_QUERY, data => {
      ctx.state.firmata.emit('board-version-reply', data)
    })
  },
  async boardVersion(ctx) {
    if (ctx.state.version) return Promise.resolve(`${ctx.state.version.type}.${ctx.state.version.major}.${ctx.state.version.minor}`)
    const event = 'board-version-reply'
    const request = new Promise(resolve => {
      ctx.state.firmata.once(event,
        data => {
          const value = ctx.state.Firmata.decode([data[0], data[1]])
          ctx.state.version = {
            type: (value >> 10) & 0x0F,
            major: (value >> 6) & 0x0F,
            minor: value & 0x3F
          }
          resolve(`${ctx.state.version.type}.${ctx.state.version.major}.${ctx.state.version.minor}`)
        })
      ctx.state.firmata.sysexCommand([BOARD_VERSION_QUERY])
    })
    try {
      return await Promise.race([request, timeoutReject(boardVersionWaitingTime)])
    } catch (reason) {
      ctx.state.firmata.removeAllListeners(event)
      return await Promise.reject(reason)
    }
  },
  async midiOpen(ctx) {
    try {
      const filters = [
        { manufacturer: null, name: /STEAM BOX/ },
        { manufacturer: null, name: /MidiDako/  },
        { manufacturer: null, name: /AkaDako/   }
      ]

      let inputPort = null
      let outputPort = null

      const midiAccess = await navigator.requestMIDIAccess({ sysex: true })

      for (const filter of filters) {
        const availablePorts = []

        midiAccess.inputs.forEach(port => {
          if ((!filter.manufacturer || filter.manufacturer.test(port.manufacturer)) &&
            (!filter.name || filter.name.test(port.name))) {
            availablePorts.push(port)
          }
        })
        
        if (availablePorts.length > 0) {
          inputPort = availablePorts[0]
          break
        }
      }
      if (!inputPort) {
        return Promise.reject('no available MIDIInput for the filters')
      }

      for (const filter of filters) {
        const availablePorts = []
        midiAccess.outputs.forEach(port => {
          if ((!filter.manufacturer || filter.manufacturer.test(port.manufacturer)) &&
            (!filter.name || filter.name.test(port.name))) {
            availablePorts.push(port)
          }
        })
        if (availablePorts.length > 0) {
          outputPort = availablePorts[0]
          break
        }
      }
      if (!outputPort) {
        return Promise.reject('no available MIDIOutput for the filters')
      }

      ctx.state.midi.portInfo = {
        manufacturer: inputPort.manufacturer,
        name: inputPort.name
      }

      const transport = new MidiDakoTransport(inputPort, outputPort)
      if (!transport.isConnected()) {
        await transport.open()
      }
      return transport
    } catch (e) {
      console.error(e)
    }
  },
  async midiConnect(ctx) {
    try {
      const Firmata = bindTransport.Firmata
      ctx.state.Firmata = Firmata

      const port = await ctx.dispatch('midiOpen')
      
      const request = new Promise(resolve => {
        const { pins, analogPins } = getSettings()
        ctx.state.firmata = new Firmata(
          port,
          {
            reportVersionTimeout: 0,
            skipCapabilities: true,
            pins: pins,
            analogPins: analogPins
          },
          async () => {
            ctx.dispatch('setupFirmata')
            await ctx.dispatch('boardVersion')
            ctx.state.firmata.firmware = {
              name: String(ctx.state.version.type),
              version: {
                major: ctx.state.version.major,
                minor: ctx.state.version.minor
              }
            }
            ctx.state.firmata.queryAnalogMapping(() => {
              ctx.state.firmata.i2cConfig()
              resolve()
            })
          }
        )
        // make the firmata initialize
        // firmata version is fixed for MidiDako
        ctx.state.firmata.version.major = 2
        ctx.state.firmata.version.minor = 3
        ctx.state.firmata.emit('reportversion')
        ctx.state.firmata.emit('queryfirmware')
      })

      ctx.state.isSerial = false

      return Promise.race([request, timeoutReject(connectingWaitingTime)])
        .catch(reason => {
          ctx.dispatch('disConnect')
          return Promise.reject(reason)
        })
    } catch (e) {
      console.error(e)
      return Promise.reject()
    }
  },
  async serialConnect(ctx) {
    try {
      const permittedPorts = await navigator.serial.getPorts()
      if ((permittedPorts !== null) && (Array.isArray(permittedPorts)) && (permittedPorts.length > 0)) {
        ctx.state.nativePort = permittedPorts[0]
      } else {
        ctx.state.nativePort = await navigator.serial.requestPort({
          filters: [
            { usbVendorId: 0x04D8, usbProductId: 0xE83A }, // Licensed for AkaDako
            { usbVendorId: 0x04D8, usbProductId: 0x000A }, // Dev board
            { usbVendorId: 0x04D9, usbProductId: 0xB534 } // Use in the future]
          ]
        })
      }

      SerialPort.Binding = WSABinding
      const Firmata = bindTransport(SerialPort)
      ctx.state.Firmata = Firmata

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

      ctx.state.firmata.i2cConfig()
      ctx.state.isSerial = true
    } catch (e) {
      console.error(e)
    }
  },
  async connect(ctx) {
    ctx.dispatch('midiConnect')
      .catch(() => {
        ctx.dispatch('serialConnect')
      })
  },
  disConnect(ctx) {
    if (ctx.state.serial.port) {
      ctx.state.serial.port.close()
    }
    if (ctx.state.firmata && ctx.state.firmata.transport.isOpen) {
      ctx.state.firmata.reset()
      ctx.state.firmata.on('close', () => { })
      ctx.state.firmata.transport.close()

    }
    ctx.state.serial.nativePort = null
    ctx.state.serial.port = null
    ctx.state.firmata = null
    ctx.state.axisInfo.main.shouldRender = false
    ctx.state.axisInfo.sub.shouldRender = false
    ctx.state.shouldPause = true

    // setTimeoutのタイマーが作動していたら解除して、IDをnullにする
    if (ctx.state.renderTimer) {
      clearTimeout(ctx.state.renderTimer)
    }
    ctx.state.renderTimer = null
  },
  async setValueToAdd(ctx) {
    // 両軸で描画する場合に同じ時間でプロットするためにここで時間を取得
    const date = dayjs().tz().format()

    if (ctx.state.axisInfo.main.shouldRender && ctx.state.axisInfo.sub.shouldRender) { // 両方の軸で描画する場合
      // 両方の軸で使うデータが全て取得完了するまで待機し、でき次第次の処理に移る
      // どちらかの取得に失敗した場合は描画しない

      Promise.all([
        getData(ctx.state.firmata, ctx.state.axisInfo.main.kind, ctx.state.Firmata, ctx.state.version),
        getData(ctx.state.firmata, ctx.state.axisInfo.sub.kind, ctx.state.Firmata, ctx.state.version)
      ])
        .then((res) => {
          if (res[0] != null && res[1] != null) {
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
          }
        })
        .catch((e) => {
          console.error(e)
        })
    } else if (ctx.state.axisInfo.main.shouldRender) { //main軸だけ描画する場合
      const data = await getData(ctx.state.firmata, ctx.state.axisInfo.main.kind, ctx.state.Firmata, ctx.state.version)
      if (data != null) {
        ctx.commit('addValue', {
          isMain: true,
          newValue: {
            y: data,
            x: date
          }
        })
      }
    } else if (ctx.state.axisInfo.sub.shouldRender) { //sub軸だけ描画する場合
      const data = await getData(ctx.state.firmata, ctx.state.axisInfo.sub.kind, ctx.state.Firmata, ctx.state.version)
      if (data != null) {
        ctx.commit('addValue', {
          isMain: false,
          newValue: {
            y: data,
            x: date
          }
        })
      }
    }
  },
  async render(ctx, isMain) {
    // setTimeoutのタイマーが作動していたら解除して、IDをnullにする
    if (ctx.state.renderTimer) {
      clearTimeout(ctx.state.renderTimer)
    }
    ctx.state.renderTimer = null

    // 選択された軸のデータを消去
    ctx.commit('resetValue', isMain ? 'main' : 'sub')

    // 各軸で描画すべきかどうかを更新
    ctx.commit('setShouldRender', {
      isMain: isMain,
      payload: isMain ? (ctx.state.axisInfo.main.kind === '' ? false : true) : (ctx.state.axisInfo.main.kind === '' ? false : true)
    })

    // ループさせる関数を定義
    // ポーズ状態でなければ描画し、一定時間後にタイマーで再実行する
    // disConnectするまではループが続く

    await ctx.dispatch('addValueLoop')
  },
  async addValueLoop(ctx) {
    if (!ctx.state.shouldPause) {
      await ctx.dispatch('setValueToAdd')
    }
    ctx.state.renderTimer = setTimeout(async () => {
      await ctx.dispatch('addValueLoop')
    }, ctx.state.milliSeconds)
  },
  async setShouldPause(ctx, payload) {
    ctx.state.shouldPause = payload

    if (state.firmata && state.firmata.isReady) {
      // 各軸で描画すべきかどうかを更新
      ctx.commit('setShouldRender', {
        isMain: true,
        payload: ctx.state.axisInfo.main.kind === '' ? false : true
      })
      ctx.commit('setShouldRender', {
        isMain: false,
        payload: ctx.state.axisInfo.sub.kind === '' ? false : true
      })

      if (!payload) {
        // setTimeoutのタイマーが作動していたら解除して、IDをnullにする
        if (ctx.state.renderTimer) {
          clearTimeout(ctx.state.renderTimer)
        }
        await ctx.dispatch('addValueLoop')
      }
    }
  },
  setMilliSeconds(ctx, payload) {
    return new Promise((resolve, reject) => {
      if (milliSecondsList.includes(payload)) {
        ctx.state.milliSeconds = payload
        resolve()
      }
      reject()
    })
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
