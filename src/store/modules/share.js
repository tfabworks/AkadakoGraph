/* eslint-disable no-unused-vars */

import { SensorMap, Sensors } from '../../lib/constants'

// チャートの共有ステータス管理
const state = {
  roomSnapshot: {}, // 全部入り room オブジェクト
  roomID: '',
  roomName: '',
  userID: '',
  userName: '',
  chartID: '',
  chartName: '',
  chartMainSensorID: 0,
  chartSubSensorID: 0,
  chartTimeStart: 0,
  chartTimeEnd: 0,
  chartData: {},
  //UI関連(計測画面)
  roomNameTmp: '',
  updateChartImageLatest: 0,
  updateChartImageIntervalMin: 5000,
  //UI関連(グラフ一覧)
  hideChartIDs: {},
  reloadTrigger: 0,
  reloadInterval: 10000,
  reloadIntervalID: 0,
  reloadIntervalHint: {
    force: true,
    visible: true,
    online: true,
  },
}

const getters = {
  roomSnapshot: (state) => state.roomSnapshot, // 全部入り room オブジェクト
  roomID: (state) => state.roomID,
  roomName: (state) => state.roomName,
  userID: (state) => state.userID,
  userName: (state) => state.userName,
  chartID: (state) => state.chartID,
  chartName: (state) => state.chartName,
  chartTimeStart: (state) => state.chartTimeStart,
  chartTimeEnd: (state) => state.chartTimeEnd,
  chartImageUrl: (state) => (state.roomID !== '' ? `${apiEndpoint}/${state.roomID}/${state.chartID}/chart.webp` : ''),
  chartJsonUrl: (state) => (state.roomID !== '' ? `${apiEndpoint}/${state.roomID}/${state.chartID}/chart.json` : ''),
  shareUrl: (state) => (state.roomID !== '' ? `${window.location.origin}/share?roomID=${state.roomID}` : ''),
  hideChartIDs: (state) => state.hideChartIDs,
  reloadTrigger: (state) => state.reloadTrigger,
  reloadInterval: (state) => state.reloadInterval,
  reloadIntervalID: (state) => state.reloadIntervalID,
  reloadIntervalHint: (state) => state.reloadIntervalHint,
}

const STORAGE_PREFIX = 'akadako_share_'
const apiEndpoint = /(localhost|127.0.0.1|::|:\d+)/.test(window.location.origin) ? 'https://test-graph.akadako.com/api/share' : '/api/share'

const mutations = {
  setRoomSnapshot(state, roomSnapshot) {
    state.roomSnapshot = roomSnapshot
  },
  setRoomID(state, roomID) {
    state.roomID = roomID
    // roomID をURLに反映。本当は action で行った方が良い
    const urlParams = new URLSearchParams(window.location.search)
    if (roomID == null || roomID == '') {
      if (urlParams.has('roomID')) {
        urlParams.delete('roomID')
      }
    } else {
      urlParams.set('roomID', roomID)
    }
    const search = urlParams.size > 0 ? `?${urlParams.toString()}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}${search}`)
  },
  setRoomName(state, roomName) {
    state.roomName = roomName
  },
  setUserID(state, userID) {
    state.userID = userID
    localStorage.setItem(`${STORAGE_PREFIX}userID`, userID)
  },
  setUserName(state, userName) {
    state.userName = userName
    localStorage.setItem(`${STORAGE_PREFIX}userName`, userName)
  },
  setChartID(state, chartID) {
    state.chartID = chartID
    localStorage.setItem(`${STORAGE_PREFIX}chartID`, chartID)
  },
  setChartName(state, chartName) {
    state.chartName = chartName
    localStorage.setItem(`${STORAGE_PREFIX}chartName`, chartName)
  },
  // チャートのレンダリングタイミングで更新される(Graph.vue)
  setChartTimeStart(state, chartTimeStart) {
    state.chartTimeStart = chartTimeStart
  },
  // チャートのレンダリングタイミングで更新される(Graph.vue)
  setChartTimeEnd(state, chartTimeEnd) {
    state.chartTimeEnd = chartTimeEnd
  },
  // UI関連
  setRoomNameTmp(state, roomNameTmp) {
    state.roomNameTmp = roomNameTmp
  },
  setUpdateChartImageLatest(state, updateChartImageLatest) {
    state.updateChartImageLatest = updateChartImageLatest
  },
  setUpdateChartImageIntervalMin(state, updateChartImageIntervalMin) {
    state.updateChartImageIntervalMin = updateChartImageIntervalMin
  },
  setHideChartIDs(state, hideChartIDs) {
    state.hideChartIDs = hideChartIDs
    console.log('setHideChartIDs', hideChartIDs, state.hideChartIDs)
  },
  setReloadTrigger(state, reloadTrigger) {
    state.reloadTrigger = reloadTrigger
  },
  setReloadInterval(state, reloadInterval) {
    state.reloadInterval = reloadInterval
  },
  setReloadIntervalID(state, reloadIntervalID) {
    state.reloadIntervalID = reloadIntervalID
  },
  setReloadIntervalHint(state, reloadIntervalHint) {
    state.reloadIntervalHint = Object.assign(state.reloadIntervalHint, reloadIntervalHint)
  },
}

const actions = {
  async setupStore({ commit }) {
    // ルームIDをクエリから取得する
    const urlParams = new URLSearchParams(location.search)
    if (/^[\w_-]+/.test(urlParams.get('roomID'))) {
      const room = await fetchRoom({ roomID: urlParams.get('roomID') })
      console.log(room, urlParams.get('roomID'), urlParams.roomID)
      if (room != null && room.type == 'room') {
        commit('setRoomID', room.roomID)
        commit('setRoomName', room.roomName)
      } else {
        console.error('room not found', urlParams.get('roomID'))
        commit('setRoomID', '')
        commit('setRoomName', '')
      }
    } else {
      commit('setRoomID', '')
      commit('setRoomName', '')
    }

    // ユーザIDをlocalStorageからリストアor作成
    if (!/^[0-9a-f-]{32,36}/.test(localStorage.getItem(`${STORAGE_PREFIX}userID`))) {
      localStorage.setItem(`${STORAGE_PREFIX}userID`, crypto.randomUUID())
    }
    commit('setUserID', localStorage.getItem(`${STORAGE_PREFIX}userID`))
    commit('setUserName', localStorage.getItem(`${STORAGE_PREFIX}userName`) ?? '')
    // チャートIDをlocalStorageからリストアor作成
    if (!/^[0-9a-f-]{32,36}/.test(localStorage.getItem(`${STORAGE_PREFIX}chartID`))) {
      localStorage.setItem(`${STORAGE_PREFIX}chartID`, crypto.randomUUID())
    }
    commit('setChartID', localStorage.getItem(`${STORAGE_PREFIX}chartID`))
    commit('setChartName', localStorage.getItem(`${STORAGE_PREFIX}chartName`) ?? '')
  },
  // ルーム名を変更してルームIDを取得する
  async setRoomName({ commit, state }, roomName) {
    const response = await fetch(`${apiEndpoint}/`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'room',
        name: roomName,
      }),
    })
    const data = await response.json()
    if (data && data.id) {
      commit('setRoomID', data.id)
      commit('setRoomName', data.name)
    }
  },
  // ユーザ名を変更してサーバ上のユーザ名も更新する
  async setUserName({ commit, dispatch }, userName) {
    commit('setUserName', userName)
    commit('setChartName', userName) // 今はユーザ名とチャート名は同じにしているが、将来チャート名を変更したい場合はここを分離する
    return await dispatch('updateChartJson', { force: true, nameOnly: true })
  },
  // チャートJSONを更新する
  async updateChartJson({ commit, dispatch, state, rootGetters }, { force = false, nameOnly = false }) {
    // 連続してアップロードを実行しないユーザ名変更だけは反映する
    const canUpdateChart = await dispatch('canUpdateChart')
    if (!canUpdateChart && !force) {
      return
    }
    const chart = {
      roomID: state.roomID,
      roomName: state.roomName,
      userID: state.userID,
      userName: state.userName,
      chartID: state.chartID,
      chartName: state.chartName,
    }
    if (nameOnly) {
      Object.assign(chart, {
        type: 'chartNameOnly',
      })
    } else {
      const axisInfo = rootGetters['firmata/axisInfo']
      const sensorToJson = (sensorId) => {
        const { id = 0, name = '', unit = '', kind = '' } = SensorMap.get(sensorId) ?? {}
        return { id, name, unit, kind }
      }
      const chartSensorMain = sensorToJson(axisInfo.main.kind)
      const chartSensorSub = sensorToJson(axisInfo.sub.kind)
      const { id: chartMainSensorID, name: chartMainSensorName, unit: chartMainSensorUnit } = chartSensorMain
      const { id: chartSubSensorID, name: chartSubSensorName, unit: chartSubSensorUnit } = chartSensorSub
      const chartTimeInterval = rootGetters['firmata/milliSeconds']
      Object.assign(chart, {
        type: 'chart',
        chartMainSensorID,
        chartMainSensorName,
        chartMainSensorUnit,
        chartSubSensorID,
        chartSubSensorName,
        chartSubSensorUnit,
        chartTimeStart: state.chartTimeStart,
        chartTimeEnd: state.chartTimeEnd,
        chartTimeInterval,
      })
    }

    const chartRes = await fetch(`${apiEndpoint}/${state.roomID}/${state.chartID}/chart.json`, {
      method: 'PUT',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chart),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch((e) => {
        console.error('updateChartJson', e)
        return null
      })
    return chartRes
  },
  // チャート画像をアップロードする（JSONアップロードも同時に行われる）
  async updateChartImage({ dispatch, commit, state }) {
    // 連続してアップロードを実行しない
    if (!(await dispatch('canUpdateChart'))) {
      return
    }
    commit('setUpdateChartImageLatest', new Date().getTime())
    const canvasElement = document.body.querySelector('canvas')
    if (canvasElement) {
      canvasElement.toBlob(
        async (blob) => {
          const imageBlob = blob
          await fetch(`${apiEndpoint}/${state.roomID}/${state.chartID}/chart.webp`, {
            mode: 'cors',
            method: 'PUT',
            headers: {
              'Content-Type': 'image/webp',
            },
            body: imageBlob,
          })
            .then((res) => {
              if (res.ok) {
                dispatch('updateChartJson', { force: true })
              }
            })
            .catch((e) => {
              console.error('updateChartImage', e)
            })
        },
        'image/webp',
        0.01, // クオリティ （参考: 0.01で15KB, 1で50KB)
      )
    }
  },
  // チャート描画が完了したらチャートJSONの時間を更新する
  async onChartRendered({ dispatch, state, commit, rootGetters }, { dataset }) {
    const minmax = { min: 'Z', max: '0' } //日付は文字列で入ってる
    for (const d of dataset) {
      if (d && d.data && d.data.length > 0) {
        minmax.min = minmax.min < d.data[0].x ? minmax.min : d.data[0].x
        minmax.max = minmax.max > d.data[d.data.length - 1].x ? minmax.max : d.data[d.data.length - 1].x
      }
    }
    commit('setChartTimeStart', new Date(minmax.min).getTime() || 0)
    commit('setChartTimeEnd', new Date(minmax.max).getTime() || 0)
    dispatch('updateChartImage')
  },
  canUpdateChart({ commit, rootGetters, state }) {
    if (state.roomID == '' || state.chartID == '' || state.userID == '') {
      return false
    }
    const shouldPause = rootGetters['firmata/shouldPause']
    if (shouldPause) {
      return false
    }
    // 連続してアップロードを実行しない
    const now = new Date().getTime()
    if (now < state.updateChartImageLatest + state.updateChartImageIntervalMin) {
      return false
    }
    return true
  },
  async getRoom({ commit }, { roomID, roomName, all = false }) {
    const room = await fetchRoom({ roomID, roomName, all })
    if (room != null) {
      commit('setRoomID', room.roomID)
      commit('setRoomName', room.roomName)
      if (all) {
        commit('setRoomSnapshot', room)
      }
    }
    return room
  },
  async reloadRoomSnapshot({ commit, dispatch, state }) {
    if (state.reloadIntervalID > 0) {
      clearTimeout(state.reloadIntervalID)
    }
    dispatch('getRoom', { roomID: state.roomID, all: true })
    state.reloadIntervalID = setTimeout(() => {
      commit('setReloadTrigger', state.reloadTrigger + 1)
      dispatch('reloadRoomSnapshot')
    }, state.reloadInterval)
  },
  hideChart({ commit, state }, chartID) {
    commit('setHideChartIDs', Object.assign(state.hideChartIDs, { [chartID]: true }))
  },
  showChart({ commit, state }, chartID) {
    commit('setHideChartIDs', Object.assign(state.hideChartIDs, { [chartID]: false }))
  },
  hideAllChart({ commit, state }) {
    Object.keys(state.roomSnapshot).forEach((chartID) => commit('hideChart', chartID))
  },
  showAllChart(state) {
    state.hideChartIDs = {}
  },
}

const fetchRoom = async ({ roomID, roomName, all = false }) => {
  if (roomID != null && roomID !== '') {
    const room = await fetch(`${apiEndpoint}/${roomID}/${all ? '' : 'room.json'}`, {
      mode: 'cors',
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch((e) => {
        console.error('fetchRoom', { roomID }, e)
      })
    return room != null && room.type == 'room' ? room : null
  }
  if (roomName != null && roomName !== '') {
    const room = await fetch(`${apiEndpoint}/`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'room',
        roomName,
      }),
    })
      .then((r) => r.json())
      .catch((e) => {
        console.error('fetchRoom', { roomName }, e)
      })
    return room != null && room.type == 'room' ? room : null
  }
  return null
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
}
