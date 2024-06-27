import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { SensorMap, migrateSensorKind20230714 } from '@/lib/constants'
import AkaDakoBoard from '@/lib/firmata/akadako-board'
import DataGetter from '@/lib/firmata/dataGetter'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(dayjs.tz.guess())

const milliSecondsList = [1000, 3000, 5000, 10000, 30000, 60000, 180000, 300000, 600000, 1800000]

const midiPortFilters = [
  { manufacturer: null, name: /STEAM BOX/ },
  { manufacturer: null, name: /MidiDako/ },
  { manufacturer: null, name: /AkaDako/ },
]

const serialPortOptions = {
  filters: [
    { usbVendorId: 0x04d8, usbProductId: 0xe83a }, // Licensed for AkaDako
    { usbVendorId: 0x04d8, usbProductId: 0x000a }, // Dev board
    { usbVendorId: 0x04d9, usbProductId: 0xb534 }, // Use in the future
  ],
}

const tmpAxisInfo = {
  main: parseInt(migrateSensorKind20230714(localStorage.getItem('graphKind'))),
  sub: parseInt(migrateSensorKind20230714(localStorage.getItem('graphKindSub'))),
}

const state = {
  board: null,
  dataGetter: null,
  milliSeconds: 1000,
  axisInfo: {
    main: {
      shouldRender: tmpAxisInfo.main ? true : false,
      kind: tmpAxisInfo.main,
      dataCountSinceStart: 0,
      correctionRate: 1,
    },
    sub: {
      shouldRender: tmpAxisInfo.sub ? true : false,
      kind: tmpAxisInfo.sub,
      dataCountSinceStart: 0,
      correctionRate: 1,
    },
  },
  renderTimer: null,
  renderTimerStartTime: 0,
  graphValue: JSON.parse(localStorage.getItem('graphValue') || '[]'),
  graphValueSub: JSON.parse(localStorage.getItem('graphValueSub') || '[]'),
  shouldPause: true,
  //デバッグ用
  debugState: {
    enableDummyBoard: false,
  },
}

const getters = {
  debugState() {
    return state.debugState
  },
  board() {
    if (state.board && state.board.isConnected()) {
      return true
    }
    return false
  },
  connected() {
    return state.board && state.board.isConnected() ? true : false
  },
  values() {
    return {
      main: state.graphValue,
      sub: state.graphValueSub,
    }
  },
  existValue() {
    return state.graphValue.length || state.graphValueSub.length ? true : false
  },
  milliSeconds() {
    return state.milliSeconds
  },
  renderTimerStartTime() {
    return state.renderTimerStartTime
  },
  shouldPause() {
    return state.shouldPause
  },
  axisInfo() {
    return state.axisInfo
  },
}

const mutations = {
  setBoard(state, payload) {
    state.board = payload
  },
  setDataGetter(state, payload) {
    state.dataGetter = payload
  },
  addValue(state, { isMain, newValue }) {
    const newTime = newValue.x
    const newValueY = newValue.y
    const sensor = isMain ? SensorMap.get(state.axisInfo.main.kind) : SensorMap.get(state.axisInfo.sub.kind)
    const targetGraphValue = isMain ? state.graphValue : state.graphValueSub
    if (typeof targetGraphValue.length !== 'undefined' && targetGraphValue.length) {
      const lastTime = targetGraphValue[targetGraphValue.length - 1].x
      if (newTime < lastTime) {
        console.log('firmate/addValue: reject old value')
        return
      }
    }
    if (isMain) {
      state.axisInfo.main.dataCountSinceStart += 1
      // スタート時の補正目標値が存在する場合は補正レートを更新する
      if (state.axisInfo.main.dataCountSinceStart === 1) {
        if (typeof sensor.targetValueForCorrectionOnStart !== 'undefined') {
          state.axisInfo.main.correctionRate = sensor.targetValueForCorrectionOnStart / newValueY
        } else {
          state.axisInfo.main.correctionRate = 1
        }
      }
      const correctedValueY = newValue.y * state.axisInfo.main.correctionRate
      console.debug('firmate/addValue: main', {
        target: 'main',
        dataCountSinceStart: state.axisInfo.main.dataCountSinceStart,
        newValueY,
        correctedValueY,
        correctionRate: state.axisInfo.main.correctionRate,
        targetValueForCorrectionOnStart: sensor.targetValueForCorrectionOnStart,
      })
      newValue.y = correctedValueY
      state.graphValue.push(newValue)
      localStorage.setItem('graphValue', JSON.stringify(state.graphValue))
    } else {
      state.axisInfo.sub.dataCountSinceStart += 1
      // スタート時の補正目標値が存在する場合は補正レートを更新する
      if (state.axisInfo.sub.dataCountSinceStart === 1) {
        if (typeof sensor.targetValueForCorrectionOnStart !== 'undefined') {
          state.axisInfo.sub.correctionRate = sensor.targetValueForCorrectionOnStart / newValueY
        } else {
          state.axisInfo.sub.correctionRate = 1
        }
      }
      const correctedValueY = newValue.y * state.axisInfo.sub.correctionRate
      if (typeof sensor.targetValueForCorrectionOnStart !== 'undefined') {
        console.log('firmate/addValue: sub', {
          target: 'sub',
          dataCountSinceStart: state.axisInfo.sub.dataCountSinceStart,
          newValueY,
          correctedValueY,
          correctionRate: state.axisInfo.sub.correctionRate,
          targetValueForCorrectionOnStart: sensor.targetValueForCorrectionOnStart,
        })
      }
      newValue.y = correctedValueY
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
    state.axisInfo.main.dataCountSinceStart = 0
    state.axisInfo.main.correctionRate = 1
  },
  setKindSub(state, payload) {
    state.axisInfo.sub.kind = payload
    localStorage.setItem('graphKindSub', payload)
    state.axisInfo.sub.shouldRender = payload ? true : false
    state.axisInfo.sub.dataCountSinceStart = 0
    state.axisInfo.sub.correctionRate = 1
  },
  setShouldRender(state, { isMain, payload }) {
    if (isMain) {
      state.axisInfo.main.shouldRender = payload
      state.axisInfo.main.dataCountSinceStart = 0
      state.axisInfo.main.correctionRate = 1
    } else {
      state.axisInfo.sub.shouldRender = payload
      state.axisInfo.sub.dataCountSinceStart = 0
      state.axisInfo.sub.correctionRate = 1
    }
  },
  setDebugState(state, payload) {
    state.debugState = payload
  },
}

const actions = {
  midiConnect(ctx) {
    try {
      return new Promise((resolve, reject) => {
        new AkaDakoBoard()
          .connectMIDI(midiPortFilters)
          .then((connected) => {
            if (connected == undefined) {
              reject('[MIDI]board is undefined')
            }

            ctx.state.board = connected
            connected.once(AkaDakoBoard.RELEASED, () => {
              ctx.state.board = null
            })
            ctx.state.dataGetter = new DataGetter(ctx.state.board)
            resolve()
          })
          .catch(() => {
            reject('no connected MIDI')
          })
      })
    } catch (e) {
      return Promise.reject(e)
    }
  },
  serialConnect(ctx) {
    try {
      if (!('serial' in navigator)) {
        return Promise.reject('This browser does not support Web Serial API.')
      }

      return new AkaDakoBoard().connectSerial(serialPortOptions).then((board) => {
        if (board == undefined) {
          return Promise.reject('[Serial]board is undefined')
        }
        ctx.commit('setBoard', board)
        board.once(AkaDakoBoard.RELEASED, () => {
          ctx.commit('setBoard', null)
        })
        ctx.commit('setDataGetter', new DataGetter(board))
        return Promise.resolve()
      })
    } catch (e) {
      return Promise.reject(e)
    }
  },
  dummyConnect({ commit }) {
    let connected = true
    const board = new AkaDakoBoard()
    const getter = new DataGetter(board)
    board.isConnected = () => connected
    board.connect = () => {
      connected = true
    }
    board.disconnect = () => {
      connected = false
      board.emit(AkaDakoBoard.RELEASED)
    }
    board.once(AkaDakoBoard.RELEASED, () => {
      commit('setBoard', null)
    })
    commit('setBoard', board)
    commit('setDataGetter', getter)
    console.log('dummyConnect', board.isConnected())
    return Promise.resolve()
  },

  async connect(ctx) {
    ctx.dispatch('midiConnect').catch((err) => {
      console.error('[MIDI]connect', err)
      ctx.dispatch('serialConnect').catch((err) => {
        console.error('[Serial]connect', err)
        console.log('debugState', ctx.state.debugState)
        if (ctx.state.debugState.enableDummyBoard) {
          ctx.dispatch('dummyConnect').catch((err) => console.error('[Dummy]connect', err))
        }
      })
    })
  },
  disConnect(ctx) {
    if (ctx.state.board && ctx.state.board.board) {
      ctx.state.board.disconnect()
    }

    ctx.state.axisInfo.main.shouldRender = false
    ctx.state.axisInfo.sub.shouldRender = false
    ctx.state.shouldPause = true

    // setTimeoutのタイマーが作動していたら解除して、IDをnullにする
    if (ctx.state.renderTimer) {
      clearTimeout(ctx.state.renderTimer)
      ctx.state.renderTimerStartTime = 0
    }
    ctx.state.renderTimer = null
  },
  async setValueToAdd(ctx) {
    if (ctx.state.board && ctx.state.board.isConnected() && !ctx.state.dataGetter) {
      ctx.state.dataGetter = new DataGetter(ctx.state.board)
    }
    // 両軸で描画する場合に同じ時間でプロットするためにここで時間を取得
    const date = dayjs().tz().format()

    if (ctx.state.axisInfo.main.shouldRender && ctx.state.axisInfo.sub.shouldRender) {
      // 両方の軸で描画する場合
      // 両方の軸で使うデータが全て取得完了するまで待機し、でき次第次の処理に移る
      // どちらかの取得に失敗した場合は描画しない

      Promise.allSettled([ctx.state.dataGetter.getData(ctx.state.axisInfo.main.kind), ctx.state.dataGetter.getData(ctx.state.axisInfo.sub.kind)])
        .then((values) => {
          const res = values.map((value) => (value.status == 'fulfilled' ? value.value : null))
          if (res[0] !== null) {
            ctx.commit('addValue', {
              isMain: true,
              newValue: {
                y: res[0],
                x: date,
              },
            })
          }
          if (res[1] !== null) {
            ctx.commit('addValue', {
              isMain: false,
              newValue: {
                y: res[1],
                x: date,
              },
            })
          }
        })
        .catch((e) => {
          console.error(e)
        })
    } else if (ctx.state.axisInfo.main.shouldRender) {
      //main軸だけ描画する場合
      const data = await ctx.state.dataGetter.getData(ctx.state.axisInfo.main.kind)
      if (data !== null) {
        ctx.commit('addValue', {
          isMain: true,
          newValue: {
            y: data,
            x: date,
          },
        })
      }
    } else if (ctx.state.axisInfo.sub.shouldRender) {
      //sub軸だけ描画する場合
      const data = await ctx.state.dataGetter.getData(ctx.state.axisInfo.sub.kind)
      if (data !== null) {
        ctx.commit('addValue', {
          isMain: false,
          newValue: {
            y: data,
            x: date,
          },
        })
      }
    }
  },
  async render(ctx, isMain) {
    // setTimeoutのタイマーが作動していたら解除して、IDをnullにする
    if (ctx.state.renderTimer) {
      clearTimeout(ctx.state.renderTimer)
      ctx.state.renderTimerStartTime = 0
    }
    ctx.state.renderTimer = null

    // 選択された軸のデータを消去
    ctx.commit('resetValue', isMain ? 'main' : 'sub')

    // 各軸で描画すべきかどうかを更新
    ctx.commit('setShouldRender', {
      isMain: isMain,
      payload: isMain ? (ctx.state.axisInfo.main.kind === '' ? false : true) : ctx.state.axisInfo.main.kind === '' ? false : true,
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
    ctx.state.renderTimerStartTime = Date.now()
    ctx.state.renderTimer = setTimeout(async () => {
      await ctx.dispatch('addValueLoop')
    }, ctx.state.milliSeconds)
  },
  async setShouldPause(ctx, payload) {
    ctx.state.shouldPause = payload

    if (ctx.state.board && ctx.state.board.isConnected()) {
      // 各軸で描画すべきかどうかを更新
      ctx.commit('setShouldRender', {
        isMain: true,
        payload: ctx.state.axisInfo.main.kind === '' ? false : true,
      })
      ctx.commit('setShouldRender', {
        isMain: false,
        payload: ctx.state.axisInfo.sub.kind === '' ? false : true,
      })

      if (!payload) {
        // setTimeoutのタイマーが作動していたら解除して、IDをnullにする
        if (ctx.state.renderTimer) {
          clearTimeout(ctx.state.renderTimer)
          ctx.state.renderTimerStartTime = 0
        }
        await ctx.dispatch('addValueLoop')
      }
    }
  },
  setMilliSeconds(ctx, payload) {
    return new Promise((resolve, reject) => {
      if (milliSecondsList.includes(payload)) {
        ctx.state.milliSeconds = payload
        // 既存のタイマーがあれば解除
        if (ctx.state.renderTimer) {
          clearTimeout(ctx.state.renderTimer)
          ctx.state.renderTimerStartTime = 0
        }
        // 新しいタイマーをセット
        ctx.state.renderTimerStartTime = Date.now()
        ctx.state.renderTimer = setTimeout(async () => {
          await ctx.dispatch('addValueLoop')
        }, ctx.state.milliSeconds)
        resolve()
      }
      reject()
    })
  },
  debugStateSetEnableDummyBoard({ commit, state }, enableDummyBoard) {
    commit('setDebugState', { ...state.debugState, enableDummyBoard })
  },
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}
