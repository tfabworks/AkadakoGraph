<template>
  <div class="content-area">
    <section class="content-box">
      <div class="sensor-select-wrap">
        <select
          v-model="graphKind"
          :disabled="!connected"
        >
          <option value="lux">
            {{ $t("device.brightness") }}
          </option>
          <option value="temp">
            {{ $t("device.temperture") }}
          </option>
          <option value="pres">
            {{ $t("device.pressure") }}
          </option>
          <option value="humi">
            {{ $t("device.humidity") }}
          </option>
        </select>

        <select
          v-model="graphKindSub"
          :disabled="!connected"
        >
          <option value="lux">
            {{ $t("device.brightness") }}
          </option>
          <option value="temp">
            {{ $t("device.temperture") }}
          </option>
          <option value="pres">
            {{ $t("device.pressure") }}
          </option>
          <option value="humi">
            {{ $t("device.humidity") }}
          </option>
        </select>
      </div>

      <Graph
        ref="renderGraphRelative"
        style="background-color: #EEEEEE; padding: 10px;"
        :source="source"
        :source-type="{
          main: source.main.length,
          sub: source.sub.length
        }"
      />
    </section>
    <div class="button_bar">
      <a
        id="dl-csv"
        class="btn-square-little-rich"
        @click="DLModalOpen"
      >
        <b-icon icon="file-download" />
        <span class="button_text">{{ $t("general.download") }}</span>
      </a>
      <select
        v-model="interval"
        :disabled="!connected"
      >
        <option value="1000">
          1秒
        </option>
        <option value="3000">
          3秒
        </option>
        <option value="5000">
          5秒
        </option>
        <option value="10000">
          10秒
        </option>
        <option value="30000">
          30秒
        </option>
        <option value="60000">
          1分
        </option>
        <option value="180000">
          3分
        </option>
        <option value="300000">
          5分
        </option>
        <option value="600000">
          10分
        </option>
        <option value="1800000">
          30分
        </option>
      </select>
      <a
        v-if="!shouldPause"
        id="pause-btn"
        class="btn-square-little-rich"
        @click="reverseShouldPause"
      >
        <b-icon
          pack="fas"
          icon="pause"
        />
        <span class="button_text">{{ $t("general.stop") }}</span>
      </a>
      <a
        v-else
        id="play-btn"
        class="btn-square-little-rich"
        @click="reverseShouldPause"
      >
        <b-icon
          pack="fas"
          icon="play"
        />
        <span class="button_text">{{ $t("general.playback") }}</span>
      </a>
      <a
        id="delete-btn"
        class="btn-square-little-rich"
        @click="deleteModalOpen"
      >
        <b-icon
          pack="fas"
          icon="trash"
        />
        <span class="button_text">{{ $t("general.reset") }}</span>
      </a>
    </div>
    <modal name="delete-confirm">
      <div class="modal-header">
        <h2>確認</h2>
      </div>
      <div class="modal-body">
        <p>この操作を実行すると現在表示されているデータが全て削除されますが本当によろしいですか?</p>
        <p>データを保存したい場合はこの処理をキャンセルし、「ダウンロード」から適切な形式でデータをダウンロードした上で再度実行してください</p>
        <a
          id="delete-btn"
          class="btn-square-little-rich"
          @click="reset(); deleteModalClose()"
        >
          <span class="button_text">実行</span>
        </a>
        <a
          id="delete-btn"
          class="btn-square-little-rich"
          @click="deleteModalClose"
        >
          <span class="button_text">キャンセル</span>
        </a>
      </div>
    </modal>
    <modal
      name="download"
    >
      <div class="modal-header">
        <h2>ダウンロード</h2>
      </div>
      <div>
        <div
          v-if="source.main.length || source.sub.length"
          class="modal-body"
        >
          <button
            class="btn-square-little-rich"
            @click="exportData(true, false)"
          >
            <img
              src="../../../../public/img/icon-csv.svg"
              alt="csvファイル"
              class="btn-icon"
            >
            <span class="btn-text">csv形式(UTF-8)</span>
          </button>
          <button
            class="btn-square-little-rich"
            @click="exportData(true, true)"
          >
            <img
              src="../../../../public/img/icon-csv.svg"
              alt="csvファイル"
              class="btn-icon"
            >
            <span class="btn-text">csv形式(SJIS)</span>
          </button>
          <button 
            class="btn-square-little-rich"
            @click="exportData(false, false)"
          >
            <img
              src="../../../../public/img/icon-xlsx.svg"
              alt="xlsxファイル"
              class="btn-icon"
            >
            <span class="button_text">xlsx形式</span>
          </button>
        </div>
        <div
          v-else
          class="modal-body"
        >
          <span
            class="button_text"
          >データが存在しません</span>
        </div>
        <div class="modal-body">
          <button 
            class="modal-close-btn"
            @click="DLModalClose"
          >
            <i class="far fa-times-circle fa-lg" />閉じる
          </button>
        </div>
      </div>  
    </modal>
  </div>
</template>
<script>
import Graph from '../../view/Graph'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import VModal from 'vue-js-modal'
import ExcelJS from 'exceljs'
import encoding from 'encoding-japanese'
Vue.use(VModal)

export default {
  components: {
    Graph
  },
  data() {
    return {
      graphKind: null,
      graphKindSub: null,
      interval: '5000',
      shouldReDo: true
    }
  },
  computed: {
    ...mapState({
      shouldPause: state => state.serial.shouldPause
    }),
    ...mapGetters({
      source: 'serial/values',
      connected: 'serial/connected'
    })
  },
  watch: {
    graphKind: async function() {
      this.reset()
      this.$store.commit('serial/setShouldPause', true)
      if (this.graphKind != null) {
        await this.$store.dispatch('serial/render', {
          kind: this.graphKind,
          axis: 'main'
        })
      }
    },
    graphKindSub: async function() {
      this.reset()
      this.$store.commit('serial/setShouldPause', true)
      if (this.graphKindSub != null) {
        await this.$store.dispatch('serial/render', {
          kind: this.graphKindSub,
          axis: 'sub'
        })
      }
    },
    interval: function(_, oldValue) {
      if (this.shouldReDo) {
        this.$store.dispatch('serial/setMilliSeconds', Number(this.interval))
          .catch(() => {
            console.error('unexpected interval value.')
            this.shouldReDo = false
            this.interval = oldValue
          })
      }else {
        this.shouldReDo = true
      }
    },
    connected: function() {
      if (!this.connected) {
        this.graphKind = null
        this.graphKindSub = null
      }
    }
  },
  methods: {
    reset() {
      this.$store.commit('serial/resetValue', 'all')
    },
    reverseShouldPause() {
      this.$store.commit('serial/setShouldPause', !this.shouldPause)
    },
    transDate(iso8601String) {
      const date = new Date(iso8601String)
      return date.getFullYear() + '/' +
          (date.getMonth() + 1) + '/' +
          date.getDate() + ' ' +
          date.getHours() + ':' +
          date.getMinutes() + ':' +
          date.getSeconds()
    },
    async exportData(isCsv, isSJIS) {
      const name = 'TFabGraph[AkaDako版]'

      // ワークシート全体の設定
      const workbook = new ExcelJS.Workbook()
      workbook.addWorksheet(name)
      const worksheet = workbook.getWorksheet(name)
      worksheet.columns = [
        { header: '時刻', key: 'x' },
        { header: '主軸の値', key: 'yMain' },
        { header: '第2軸の値', key: 'ySub' }
      ]

      // ファイルの元となるデータの配列
      // 両軸のデータを統合したものを格納する
      let sourceForDL = []

      // 主軸のデータをまずはそのまま格納
      this.source.main.forEach(e => {
        sourceForDL.push({
          x: e.x,
          yMain: e.y,
          ySub: null
        })
      })

      // 第2軸のデータを格納
      this.source.sub.forEach(e => {
        // 両軸で時刻が一致しているものを見つける
        const found = sourceForDL.find(el => el.x == e.x)

        // 一致したデータがあった場合はその要素にプロパティとして第2軸のデータを格納
        if (found) {
          found.ySub = e.y
        }else {
          // 一致したデータがなかった場合は新規要素として第2軸のデータを格納
          sourceForDL.push({
            x: e.x,
            yMain: null,
            ySub: e.y
          })
        }
      })

      // 統合した後の配列を時系列順にソート
      sourceForDL.sort((a, b) => {
        return (a.x < b.x) ? -1 : 1
      })

      // データをシートに追加
      worksheet.addRows(sourceForDL)

      // 3通りのファイル形式を引数に応じて生成
      const uint8Array = isCsv ? (isSJIS ? new Uint8Array(
        encoding.convert(await workbook.csv.writeBuffer(), {
          from: 'UTF8',
          to: 'SJIS'
        })
      ) : await workbook.csv.writeBuffer()) : await workbook.xlsx.writeBuffer()

      // DLするための処理
      const blob = new Blob([uint8Array], { type: 'application/octet-binary' })
      const link = document.createElement('a')
      link.href = (window.URL || window.webkitURL).createObjectURL(blob)
      link.download = `${name}.${isCsv ? 'csv' : 'xlsx'}`
      link.click()
      link.remove()
    },
    deleteModalOpen() {
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
    }
  }
}
</script>
<style scoped>
.graph{
  background-color: #EEEEEE;
  padding: 20px;
}
select{
  outline: none;
}
.button_bar{
  text-align:center;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-square-little-rich {
  position: relative;
  display: flex;
  align-items:center;
  justify-content:center;
  padding: 10px 5px;
  text-decoration: none;
  color: #FFF;
  background:#27ae60;/*色*/
  border: solid 1px #27ae60;/*線色*/
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
  text-shadow: 0 1px 0 rgba(0,0,0,0.2);
  margin: 10px 15px;
  min-width: 180px;
  height: 50px;
}
.btn-square-little-rich:active {
  /*押したとき*/
  border: solid 1px #2c6ac4;
  box-shadow: none;
  text-shadow: none;
}
.btn-icon{
  display:inline-block;
  margin-right:3px;
  width:20px;
  height:auto;
}

.btn-text{
  padding: 0 5px;
  font-size:15px;
}

.content-box {
  text-align: center;
  width: 100%;
  background: #fff;
  margin: 20px 0;
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
#loader
{
  display: inline-block;
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 4px solid #fff;
  border-right-color: transparent;
  animation: spin 1s linear infinite;
}
@keyframes spin
{
    0% { transform: rotate(0deg)}
    50%  { transform: rotate(180deg)}
    100%   { transform: rotate(360deg)}
}
.modal-header h2{
  padding:15px;
  text-align:center;
  font-size:20px;
  font-weight:bold;
  background:#333;
  color:#fff;
}
.modal-body{
  display:flex;
  justify-content:center;
  flex-wrap:wrap;
  align-items:center;
  padding:40px 0;

  min-height:250px;
}
.modal-body button{
  cursor:pointer;
}
.modal-body button:hover{
  opacity:.7;
}
.modal-close-btn{
  display:flex;
  align-items:center;
  position:absolute;
  right:20px;
  bottom:15px;
  font-size:16px;
  font-weight:bold;
  color:#999;
}
.modal-close-btn i{
  margin-right:4px;
}
.sensor-select-wrap{
  display:flex;
  justify-content:space-between;
  margin-bottom:15px;
}
.sensor-select-wrap select{
  position:relative;
  min-width:100px;
  padding:8px;
  border:2px solid #333;
  border-radius:4px;
  color:#333;
  font-weight:bold;
  cursor:pointer;
}
.sensor-select-wrap select:nth-of-type(2){
  border:2px solid #26AE60;
  color:#26AE60;
}
select:disabled{
  opacity:.5;
  cursor:auto;
}
</style>
