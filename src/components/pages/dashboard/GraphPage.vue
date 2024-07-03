<template>
  <div class="content-area">
    <div>
      <div class="btn-bar">

        <ul class="btn-list">
          <li>
            <a v-if="shouldPause" id="play-btn" :class="connected ? '' : 'disable'" @click="reverseShouldPause">
              <img src="../../../../public/img/icon-play.svg" alt="取得開始">
            </a>
            <a v-else id="pause-btn" :class="connected ? '' : 'disable'" @click="reverseShouldPause">
              <img src="../../../../public/img/icon-pause.svg" alt="取得停止">
            </a>
          </li>
          <li>
            <a id="delete-btn" :class="existValue ? '' : 'disable'" @click="deleteModalOpen('reset')">
              <img src="../../../../public/img/icon-reset.svg" alt="リセット">
            </a>
          </li>
          <li>
            <a id="dl-csv" :class="existValue ? '' : 'disable'" @click="DLModalOpen">
              <img src="../../../../public/img/icon-download.svg" alt="ダウンロード">
            </a>
          </li>
          <!-- <li><a @click="saveChartImage"><img src="../../../../public/img/icon-capture.svg" alt="写真保存"></a></li> -->
          <li><a @click="print"><img src="../../../../public/img/icon-print.svg" alt="印刷"></a></li>
        </ul>
        <div v-if="shareRoomID || (shareRoomID && shareUserName)" class="share-info">
          <a class="share-active">共有中</a>
          <a class="share-stop">停止中</a>
          <a class="share-modal-link" @click="shareModalOpen">
            <span v-if="shareRoomID">
              共有ID：{{ shareRoomName }}
            </span>
            <span v-if="shareRoomID && shareUserName">
              端末名：{{ shareUserName }}
            </span>
          </a>
        </div>
        <div class="share-btn">
          <a @click="shareModalOpenFromShareButton"><img src="../../../../public/img/icon-share.svg" alt="共有"></a>
        </div>

      </div>
    </div>
    <section class="content-box">
      <div class="sensor-select-wrap">
        <div class="sensor-left">
          <select v-model="graphKind" :disabled="!connected">
            <option :value="null" />
            <option v-for=" s in sensors " :key="s.id" :value="s.id">
              {{ s.kind }}
            </option>
          </select>
          <span>現在の値：{{ lastMainValue }} {{ lastMainUnit }}</span>
        </div>
        <div class="interval-selector">
          <select v-model="interval" :disabled="!connected">
            <option v-for=" ms in intervals " :key="ms" :value="ms">
              {{ ms < 60000 ? ms / 1000 + '秒' : ms / 60000 + '分' }} </option>
          </select>
          <ProgressTimer ref="progressTimer" class="progress-timer" :duration="milliSeconds" :paused="!inProgress"
            :start-time="renderTimerStartTime" />
        </div>
        <div class="sensor-right">
          <select v-model="graphKindSub" :disabled="!connected">
            <option :value="null" />
            <option v-for=" s in sensors " :key="s.id" :value="s.id">
              {{ s.kind }}
            </option>
          </select>
          <span>現在の値：{{ lastSubValue }} {{ lastSubUnit }}</span>
        </div>
      </div>

      <Graph ref="renderGraphRelative" style="background-color: #EEEEEE; padding: 8px;" :source="source" :source-type="{
        main: source.main.length,
        sub: source.sub.length
      }
        " />
    </section>

    <modal name="delete-confirm">
      <div class="modal-header">
        <h2>確認</h2>
      </div>
      <div class="modal-body">
        <p>この操作を実行すると現在表示されているデータが全て削除されますが本当によろしいですか?</p>
        <a class="btn-square-little-rich" @click="deleteModalOK">
          <img src="../../../../public/img/icon-exe.svg" alt="実行" class="btn-icon">
          <span class="btn-text">実行</span>
        </a>
        <a id="delete-btn" class="btn-square-little-rich cancel" @click="deleteModalNG">
          <img src="../../../../public/img/icon-cancel.svg" alt="キャンセル" class="btn-icon">
          <span class="btn-text">キャンセル</span>
        </a>
      </div>
    </modal>

    <modal name="share-modal" focus-trap="true" @before-open="shareModalBeforeOpen">
      <div class="modal-header">
        <h2>共有（試験運用中）</h2>
      </div>
      <div class="modal-body">
        <form class="modal-form" @submit.prevent="shareModalSave">
          <div class="modal-share-wrap">
            <label for="shareRoomNameInput">共有ID</label>
            <div class="modal-share-input-wrap">
              <input id="shareRoomNameInput" v-model="shareRoomNameInputValue" type="text" data-lpignore data-1p-ignore>
              <a tabindex="-1" class="copy-btn" @click.prevent="shareModalCopyID">IDをコピー</a>
            </div>
            <span class="example">例）〇〇小学校20240625</span>

            <label for="shareUserNameInput">端末名（省略可能）</label>
            <input id="shareUserNameInput" v-model="shareUserNameInputValue" type="text" data-lpignore data-1p-ignore>
          </div>
        </form>
        <div class="btn-square-wrap">
          <a class="btn-square-little-rich" @click="shareModalSave">
            <img src="../../../../public/img/icon-exe.svg" alt="実行" class="btn-icon">
            <span class="btn-text">保存</span>
          </a>
        </div>
        <button class="modal-close-btn" @click="shareModalClose">
          <i class="far fa-times-circle fa-lg" />閉じる
        </button>
      </div>
    </modal>

    <modal name="download">
      <div class="modal-header">
        <h2>ダウンロード</h2>
      </div>
      <div>
        <div v-if="source.main.length || source.sub.length" class="modal-body">
          <button class="btn-square-little-rich" @click="exportData(true, false)">
            <img src="../../../../public/img/icon-csv.svg" alt="csvファイル" class="btn-icon">
            <span class="btn-text">csv形式(UTF-8)</span>
          </button>
          <button class="btn-square-little-rich" @click="exportData(true, true)">
            <img src="../../../../public/img/icon-csv.svg" alt="csvファイル" class="btn-icon">
            <span class="btn-text">csv形式(SJIS)</span>
          </button>
          <button class="btn-square-little-rich" @click="exportData(false, false)">
            <img src="../../../../public/img/icon-xlsx.svg" alt="xlsxファイル" class="btn-icon">
            <span class="btn-text">xlsx形式</span>
          </button>
        </div>
        <div v-else class="modal-body">
          <span class="btn-text">データが存在しません</span>
        </div>
        <div class="modal-body">
          <button class="modal-close-btn" @click="DLModalClose">
            <i class="far fa-times-circle fa-lg" />閉じる
          </button>
        </div>
      </div>
    </modal>
  </div>

</template>
<script>
import dayjs from 'dayjs'
import encoding from 'encoding-japanese'
import ExcelJS from 'exceljs'
import Vue from 'vue'
import VModal from 'vue-js-modal'
import { mapGetters, mapState } from 'vuex'
import { SensorMap, Sensors } from '../../../lib/constants'
import Graph from '../../view/Graph'
import ProgressTimer from '../../view/ProgressTimer.vue'
Vue.use(VModal)

export default {
  components: {
    Graph,
    ProgressTimer,
  },
  data() {
    return {
      interval: 1000,
      shouldReDo: {
        main: true,
        sub: true,
        interval: true,
      },
      deleteCallFrom: '',
      newKindValue: {
        main: '',
        sub: '',
      },
      oldKindValue: {
        main: '',
        sub: '',
      },
      intervals: [
        ...[1, 3, 5, 10, 30], // seconds
        ...[1, 3, 5, 10].map((s) => 60 * s), // minutes
      ].map((s) => s * 1000),
      // 入力中の値
      shareRoomNameInputValue: '',
      shareUserNameInputValue: '',
      shareModalFromButton: false,
    }
  },
  computed: {
    ...mapState({
      shouldPause: (state) => state.firmata.shouldPause,
      graphValue: (state) => state.firmata.graphValue,
      graphValueSub: (state) => state.firmata.graphValueSub,
    }),
    ...mapGetters({
      source: 'firmata/values',
      connected: 'firmata/connected',
      existValue: 'firmata/existValue',
      renderTimerStartTime: 'firmata/renderTimerStartTime',
      milliSeconds: 'firmata/milliSeconds',
    }),
    showShareOptions: {
      get() {
        return this.showShareOptionsUserToggled || this.shareRoomID !== '' || this.shareUserName !== ''
      },
    },
    canOpenShareboard: {
      get() {
        return this.shareRoomID !== ''
      },
    },
    canStartShare: {
      get() {
        return this.shareRoomID !== '' && this.shareUserName !== ''
      },
    },
    graphKind: {
      get() {
        return this.$store.state.firmata.axisInfo.main.kind
      },
      set(payload) {
        this.$store.commit('firmata/setKind', payload)
      },
    },
    graphKindSub: {
      get() {
        return this.$store.state.firmata.axisInfo.sub.kind
      },
      set(payload) {
        this.$store.commit('firmata/setKindSub', payload)
      },
    },
    inProgress() {
      return this.connected && !this.shouldPause && (this.$store.state.firmata.axisInfo.main.kind || this.$store.state.firmata.axisInfo.sub.kind)
    },
    lastMainValue() {
      const sensor = SensorMap.get(this.graphKind)
      if (sensor) {
        const lastValue = (this.source.main[this.source.main.length - 1] || { y: null }).y
        if (typeof sensor.flactionDigits === 'undefined' || lastValue === null) {
          return lastValue
        } else {
          return lastValue.toFixed(sensor.flactionDigits)
        }
      }
      return null
    },
    lastMainUnit() {
      const sensor = SensorMap.get(this.graphKind)
      if (sensor && sensor.unit != null) {
        return sensor.unit
      }
      return null
    },
    lastSubValue() {
      const sensor = SensorMap.get(this.graphKindSub)
      if (sensor) {
        const lastValue = (this.source.sub[this.source.sub.length - 1] || { y: null }).y
        if (typeof sensor.flactionDigits === 'undefined' || lastValue === null) {
          return lastValue
        } else {
          return lastValue.toFixed(sensor.flactionDigits)
        }
      }
      return null
    },
    lastSubUnit() {
      const sensor = SensorMap.get(this.graphKindSub)
      if (sensor && sensor.unit != null) {
        return sensor.unit
      }
      return null
    },
    shareRoomID() {
      return this.$store.getters['share/roomID']
    },
    shareRoomName() {
      return this.$store.getters['share/roomName']
    },
    shareUserName() {
      return this.$store.getters['share/userName']
    },
    shareUserID() {
      return this.$store.getters['share/userID']
    },
    shareUrl() {
      return this.$store.getters['share/shareUrl']
    },
    shareDefaultRoomName() {
      return this.$store.getters['share/defaultRoomName']
    },
    shareDefaultUserName() {
      return this.$store.getters['share/defaultUserName']
    },
    enableDummyBoard() {
      return this.$store.state.firmata.debugState.enableDummyBoard || 90000 < this.graphKind || 90000 < this.graphKindSub
    },
    sensors() {
      if (this.enableDummyBoard) {
        return Sensors
      }
      return Sensors.filter((sensor) => !sensor.name.includes('ダミー'))
    },
  },
  watch: {
    graphKind: function (newVal, oldVal) {
      if (this.existValue) {
        if (this.shouldReDo.main) {
          this.newKindValue.main = newVal
          this.oldKindValue.main = oldVal
          this.shouldReDo.main = false
          this.graphKind = oldVal
          this.deleteModalOpen('main')
        } else {
          this.shouldReDo.main = true
        }
      }
    },
    graphKindSub: function (newVal, oldVal) {
      if (this.existValue) {
        if (this.shouldReDo.sub) {
          this.newKindValue.sub = newVal
          this.oldKindValue.sub = oldVal
          this.shouldReDo.sub = false
          this.graphKindSub = oldVal
          this.deleteModalOpen('sub')
        } else {
          this.shouldReDo.sub = true
        }
      }
    },
    interval: function (newValue, oldValue) {
      if (this.shouldReDo.interval) {
        // this.deleteModalOpen('interval', () =>
        this.$store.dispatch('firmata/setMilliSeconds', Number(newValue)).catch(() => {
          console.error('unexpected interval value.')
          this.shouldReDo = false
          this.interval = oldValue
        })
        // })
      } else {
        this.shouldReDo.interval = true
      }
    },
  },
  async mounted() {
    this.oldKindValue.main = this.graphKind
    this.oldKindValue.sub = this.graphKindSub
    this.$store.commit('showConnectStatusOnHeader', true)
    await this.$store.dispatch('share/setupStore')
    this.shareRoomNameInputValue = this.shareRoomName
    this.shareUserNameInputValue = this.shareUserName
  },
  methods: {
    reset() {
      this.$store.commit('firmata/resetValue', 'all')
    },
    reverseShouldPause() {
      if (this.connected) {
        this.$store.dispatch('firmata/setShouldPause', !this.shouldPause)
      }
    },
    transDate(iso8601String) {
      const date = new Date(iso8601String)
      return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
    },
    async exportData(isCsv, isSJIS) {
      const name = 'TFabGraph_AkaDako版'

      // それぞれの軸のデータがあればローカルストレージから項目名を取得
      // ローカルストレージに値がなければ「主軸」等の名前を付ける
      // データが無い場合は空欄にする
      const graphKind = (
        SensorMap.get(parseInt(localStorage.getItem('graphKind'))) || {
          kind: '',
        }
      ).kind
      const graphKindSub = (
        SensorMap.get(parseInt(localStorage.getItem('graphKindSub'))) || {
          kind: '',
        }
      ).kind
      const valueHeader = {
        main: this.graphValue.length ? (graphKind ? graphKind : '主軸') : '',
        sub: this.graphValueSub.length ? (graphKindSub ? graphKindSub : '第2軸') : '',
      }

      // ワークシート全体の設定
      const workbook = new ExcelJS.Workbook()
      workbook.addWorksheet(name)
      const worksheet = workbook.getWorksheet(name)
      worksheet.columns = [
        { header: '時刻', key: 'x' },
        { header: valueHeader.main, key: 'yMain' },
        { header: valueHeader.sub, key: 'ySub' },
      ]

      // ファイルの元となるデータの配列
      // 両軸のデータを統合したものを格納する
      let sourceForDL = []

      // 主軸のデータをまずはそのまま格納
      this.source.main.forEach((e) => {
        sourceForDL.push({
          x: e.x,
          yMain: e.y,
          ySub: null,
        })
      })

      // 第2軸のデータを格納
      this.source.sub.forEach((e) => {
        // 両軸で時刻が一致しているものを見つける
        const found = sourceForDL.find((el) => el.x == e.x)

        // 一致したデータがあった場合はその要素にプロパティとして第2軸のデータを格納
        if (found) {
          found.ySub = e.y
        } else {
          // 一致したデータがなかった場合は新規要素として第2軸のデータを格納
          sourceForDL.push({
            x: e.x,
            yMain: null,
            ySub: e.y,
          })
        }
      })

      // 統合した後の配列を時系列順にソート
      sourceForDL.sort((a, b) => {
        return a.x < b.x ? -1 : 1
      })

      // タイムスタムタンプ列を文字列化
      sourceForDL.forEach((e) => {
        e.x = dayjs(e.x).tz().format()
      })

      // データをシートに追加
      worksheet.addRows(sourceForDL)

      // 3通りのファイル形式を引数に応じて生成
      const uint8Array = isCsv
        ? isSJIS
          ? new Uint8Array(
              encoding.convert(await workbook.csv.writeBuffer(), {
                from: 'UTF8',
                to: 'SJIS',
              }),
            )
          : await workbook.csv.writeBuffer()
        : await workbook.xlsx.writeBuffer()

      // DLするための処理
      const blob = new Blob([uint8Array], { type: 'application/octet-binary' })
      const link = document.createElement('a')
      link.href = (window.URL || window.webkitURL).createObjectURL(blob)
      link.download = `${name}.${isCsv ? 'csv' : 'xlsx'}`
      link.click()
      link.remove()
    },
    async deleteModalOK() {
      this.reset()
      if (this.deleteCallFrom === 'main') {
        // this.$store.dispatch('firmata/setShouldPause', true)
        this.shouldReDo.main = false
        this.graphKind = this.newKindValue.main
        this.shouldReDo.main = true
        if (this.graphKind) {
          await this.$store.dispatch('firmata/render', true)
        }
      } else if (this.deleteCallFrom === 'sub') {
        // this.$store.dispatch('firmata/setShouldPause', true)
        this.shouldReDo.sub = false
        this.graphKindSub = this.newKindValue.sub
        this.shouldReDo.sub = true
        if (this.graphKindSub) {
          await this.$store.dispatch('firmata/render', false)
        }
      } else if (this.deleteCallFrom === 'reset') {
        // this.$store.dispatch('firmata/setShouldPause', true)
      } else if (typeof this.deleteModalOKCallback === 'function') {
        await this.deleteModalOKCallback()
      }
      this.deleteModalClose()
    },
    async deleteModalNG() {
      if (this.deleteCallFrom === 'main') {
        this.shouldReDo.main = true
      } else if (this.deleteCallFrom === 'sub') {
        this.shouldReDo.sub = true
      } else if (typeof this.deleteModalNGCallback === 'function') {
        await this.deleteModalNGCallback()
      }
      this.deleteModalClose()
    },
    deleteModalOpen(callFrom, okCallback, ngCallback) {
      // this.$store.dispatch('firmata/setShouldPause', true)
      this.deleteCallFrom = callFrom
      this.deleteModalOKCallback = okCallback
      this.deleteModalNGCallback = ngCallback
      this.$modal.show('delete-confirm')
    },
    deleteModalClose() {
      this.$modal.hide('delete-confirm')
    },
    DLModalOpen() {
      this.$modal.show('download')
    },
    DLModalClose() {
      this.$modal.hide('download')
    },

    // 共有ダイアログを開く、または共有タブを開く
    shareModalOpenFromShareButton() {
      if (this.shareRoomName != '' && this.shareUserName != '') {
        this.shareModalOpenTab()
        return
      }
      this.shareModalFromButton = true
      this.shareModalOpen()
    },
    shareModalOpen() {
      this.$modal.show('share-modal')
    },
    shareModalBeforeOpen() {
      this.shareRoomNameInputValue = this.shareDefaultRoomName
      this.shareUserNameInputValue = this.shareDefaultUserName
    },
    async shareModalSave() {
      this.$store.dispatch('share/setRoomName', this.shareRoomNameInputValue)
      this.$store.dispatch('share/setUserName', this.shareUserNameInputValue)
      if (this.shareRoomNameInputValue != '') {
        const room = await this.$store.dispatch('share/getRoom', { roomName: this.shareRoomNameInputValue })
        if (room == null) {
          console.error('shareModalSave NG', { roomName: this.shareRoomNameInputValue })
        }
      }
      this.shareModalClose()
      if (this.shareModalFromButton) {
        this.shareModalOpenTab()
      }
    },
    async shareModalCopyID() {
      await navigator.clipboard.writeText(this.shareRoomNameInputValue)
    },
    shareModalOpenTab() {
      this.shareModalFromButton = false
      window.open(this.shareUrl, `akadako_share_viewer_${this.shareRoomID}`)
    },
    shareModalClose() {
      this.$modal.hide('share-modal')
    },

    print() {
      window.print()
    },
    saveChartImage() {
      // 画像Blob作成
      const canvas = document.body.querySelector('canvas')
      const dataUrl = canvas.toDataURL('image/webp', 0.01)
      const b64 = dataUrl.split(/,/, 2)[1]
      const u8 = new Uint8Array([].map.call(atob(b64), (c) => c.charCodeAt(0)))
      console.log({ dataUrl, b64, u8 })
      const blob = new Blob([u8], { type: 'application/octet-binary' })
      // 日時文字列作成
      const now = new Date()
      const tz = `${now.getTimezoneOffset() < 0 ? '+' : '-'}${new Date(Math.abs(now.getTimezoneOffset())).toTimeString().substr(0, 5)}`
      const o = { year: 'numeric' }
      o.month = o.day = o.hour = o.minute = o.second = '2-digit'
      const dt = now.toLocaleString('ja', o).replace(/ /, 'T').replace(/[/:-]/g, '') + tz.replace(/:/, '')
      // ダウンロードさせる
      const link = document.createElement('a')
      link.href = (window.URL || window.webkitURL).createObjectURL(blob)
      link.download = `AkadakoGraph-${dt}.webp`
      link.click()
      link.remove()
    },
    openShareboard(e) {
      if (!this.canOpenShareboard) {
        e.preventDefault()
      }
    },
    toggleShare() {
      if (this.shareEnabled) {
        this.shareEnabled = false
      } else {
        if (this.canShare) {
          this.shareEnabled = true
        }
      }
    },
  },
}
</script>
<style scoped>
.graph {
  background-color: #EEEEEE;
  padding: 20px;
}

select {
  outline: none;
}

/*-----------共有ID、端末名、各種メニューアイコン-----------*/

.btn-bar {
  width: 100vw;
  height: 60px;
  margin: 0 calc(50% - 50vw) 30px calc(50% - 50vw);
  padding: 0 5%;
  background: #fff;
  position: relative;
  display: flex;
  jusify-content:right;
  align-items: center;
  filter: drop-shadow(0 8px 5px #ccc);
}

/*左上のアイコン一覧のスタイル*/
.btn-list {
  display: flex;
  padding: 10px 0;
  margin-right:auto;
}

.btn-list li {
  border-right: 1px dotted #ccc;
}

.btn-list li:last-of-type {
  border-right: none;
}

.btn-list li a {
  display: flex;
  justify-content: center;
  padding: 0 8px;
  height: 100%;
}

.btn-list li a img {
  display: block;
  width: 30px;
  margin: auto;
}

.btn-list a.disable {
  pointer-events: none;
  opacity: .3;
  filter: grayscale(100%);
}

/*共有ID、端末名の枠内スタイル*/
.share-info {
  display: flex;
  position: relative;
  max-width:calc(100% - 280px);
  margin-right:10px;
  border: 1px solid #ccc;
  font-weight: bold;
}

.share-active,.share-stop{
  display:block;
  width:45px;
  padding:3px 0;
  text-align:center;
  font-size:11px;
  white-space:nowrap;
}

.share-active{
  color:#28AE60;
  background: url(../../../../public/img/shared-active.svg) no-repeat center bottom 3px/ 32px;
}

.share-stop{
  color:#999;
  background: url(../../../../public/img/shared-stop.svg) no-repeat center bottom 3px/ 32px;
}

.share-modal-link{
  display:flex;
  width:calc(100% - 45px);
  color:#333;
  padding: 10px;
}

.share-modal-link span {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.share-modal-link span:nth-of-type(1){
  margin-right:1em;
}

/*右上の共有ボタン*/
.share-btn{
  width:30px;
}

.share-btn a{
  display:block;
}
.share-btn img{
  width:100%;
  height:auto;
}

/*-----------グラフ内-----------*/

/*グラフを囲う白背景*/
.content-box {
  text-align: center;
  width: 100%;
  background: #fff;
  margin: 0 0 15px 0;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

/*センサー選択プルダウン*/
#loader {
  display: inline-block;
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 4px solid #fff;
  border-right-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg)
  }

  50% {
    transform: rotate(180deg)
  }

  100% {
    transform: rotate(360deg)
  }
}

.sensor-select-wrap {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.sensor-select-wrap .interval-selector {
  position: relative;
  width: 75px;
  margin: 0 10px;
}

.sensor-select-wrap .interval-selector select {
  width: 100%;
}

.progress-timer {
  padding: 0;
  margin: 0;
  position: absolute;
  width: 100%;
}

.timer__meter {
  width: 100%;
}

.sensor-select-wrap select {
  position: relative;
  padding: 8px;
  border: 2px solid #333;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 8px;
}

.sensor-left,
.sensor-right {
  width: 200px;
  max-width: 100%;
}

.sensor-left select,
.sensor-right select {
  width: 100%;
}

.sensor-left span {
  display: block;
  text-align: left;
  font-size: 15px;
  font-weight: bold;
}

.sensor-right span {
  display: block;
  text-align: right;
  font-size: 15px;
  color: #00A456;
  font-weight: bold;
}

select:disabled {
  opacity: .5;
  cursor: auto;
}

/*-----------モーダル-----------*/

/*モーダル全般スタイル*/
.modal-header h2 {
  padding: 15px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  background: #333;
  color: #fff;
}

.modal-body {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
  padding: 25px;
}

.modal-body p {
  margin-bottom: 1em;
  font-size: 16px;
  line-height: 1.6;
}

.modal-body button {
  cursor: pointer;
}

.modal-body button:hover {
  opacity: .7;
}

.modal-close-btn {
  display: flex;
  align-items: center;
  position: absolute;
  right: 20px;
  bottom: 15px;
  font-size: 16px;
  font-weight: bold;
  color: #999;
}

.modal-close-btn i {
  margin-right: 4px;
}

.modal-form {
  width: 100%;
  text-align: center;
}

.modal-form label {
  margin-bottom: 5px;
  font-size: 16px;
}

/*共有モーダルスタイル*/
.modal-share-wrap {
  width: 350px;
  margin: auto;
  text-align: start;
}

.modal-share-wrap label {
  display: inline-block;
  margin-bottom: 5px;
  font-size: 16px;
  font-weight: bold;
}

.modal-share-input-wrap {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.modal-share-input-wrap #shareRoomNameInput {
  padding: 0 15px;
  width: calc(100% - 50px);
  height: 40px;
  border: 2px solid #ccc;
  border-right: none;
  border-radius: 8px 0 0 8px;
  font-size: 16px;
}

.modal-share-input-wrap .copy-btn {
  display: inline-block;
  font-size: 0;
  width: 50px;
  height: 40px;
  border-radius: 0 8px 8px 0;
  background: url(../../../../public/img/icon-copy.svg)#ddd no-repeat center/25px;
}

.modal-share-wrap .example {
  display: block;
  margin-bottom: 20px;
  font-size: 13px;
  color: #666;
}

.modal-share-wrap #shareUserNameInput {
  display: block;
  padding: 0 15px;
  width: 350px;
  height: 40px;
  border: 2px solid #ccc;
  border-radius: 8px;
  font-size: 16px;
}

/*モーダル内のボタン*/
.btn-square-wrap {
  display: flex;
}

.btn-square-little-rich {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  text-decoration: none;
  color: #FFF;
  background: #27ae60;
  /*色*/
  border: solid 1px #27ae60;
  /*線色*/
  border-radius: 4px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  margin: 10px 15px;
  height: 40px;
}

.btn-square-little-rich.cancel {
  background: #ff0000;
  border: solid 1px #ff0000;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}

.btn-square-little-rich:active {
  border: solid 1px #2c6ac4;
  box-shadow: none;
  text-shadow: none;
}

.btn-icon {
  display: inline-block;
  margin-right: 3px;
  width: 20px;
  height: auto;
}

.btn-text {
  padding: 0 5px;
  font-size: 15px;
  font-weight: bold;
}
</style>
