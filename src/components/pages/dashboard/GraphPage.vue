<template>
  <div class="content-area">
    <section class="content-box">
      <Graph
        ref="renderGraphRelative"
        style="background-color: #EEEEEE; padding: 10px;"
        :source="source"
        :source-type="judgeSourceType()"
      />
    </section>
    <div class="button_bar">
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
      <a
        id="dl-csv"
        class="btn-square-little-rich"
        @click="modalOpen"
      >
        <b-icon icon="file-download" />
        <span class="button_text">{{ $t("general.download") }}</span>
      </a>
      <a
        v-if="!pauseFlag"
        id="pause-btn"
        class="btn-square-little-rich"
        @click="pause"
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
        @click="pause"
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
        @click="reset"
      >
        <b-icon
          pack="fas"
          icon="trash"
        />
        <span class="button_text">{{ $t("general.reset") }}</span>
      </a>
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
    <modal
      name="download"
    >
      <div class="modal-header">
        <h2>CSVダウンロード</h2>
      </div>
      <div class="modal-body">
        <button 
          v-if="judgeSourceType().main"
          class="btn-square-little-rich"
          @click="downloadCSV(true)"
        >
          <span class="icon"><i class="fas fa-file-csv fa-2x" /></span>
          <span class="button_text">主軸データのCSV</span>
        </button>
        <button 
          v-if="judgeSourceType().sub"
          class="btn-square-little-rich"
          @click="downloadCSV(false)"
        >
          <span class="icon"><i class="fas fa-file-csv fa-2x" /></span>
          <span class="button_text">第2軸データのCSV</span>
        </button>
        <button 
          class="modal-close-btn"
          @click="modalClose"
        >
          <i class="far fa-times-circle fa-lg" />閉じる
        </button>
      </div>  
    </modal>
  </div>
</template>
<script>
import Graph from '../../view/Graph'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import VModal from 'vue-js-modal'
Vue.use(VModal)

export default {
  components: {
    Graph
  },
  data() {
    return {
      graphKind: null,
      graphKindSub: null
    }
  },
  computed: {
    ...mapState({
      pauseFlag: state => state.serial.pauseFlag
    }),
    ...mapGetters({
      source: 'serial/values',
      connected: 'serial/connected'
    })
  },
  watch: {
    graphKind: function() {
      if (this.graphKind != null) {
        this.$store.dispatch('serial/render', {
          kind: this.graphKind,
          axis: 'main'
        })
      }
    },
    graphKindSub: function() {
      if (this.graphKindSub != null) {
        this.$store.dispatch('serial/render', {
          kind: this.graphKindSub,
          axis: 'sub'
        })
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
    pause() {
      this.$store.commit('serial/pause')
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
    downloadCSV(isFirst) {
      let source, fileName
      let csv = '\ufeff'

      if (isFirst) {
        source = this.source.main
        fileName = 'AkadakoGraph.csv'
      }else {
        source = this.source.sub
        fileName = 'AkadakoGraph2nd.csv'
      }

      source.forEach(el => {
        csv += this.transDate(el.x) + ',' + el.y + '\n'
      })
      const blob = new Blob([csv], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      link.click()
    },
    judgeSourceType() {
      let sourceType = {
        main: false,
        sub: false
      }
      if (this.source.main.length) {
        sourceType.main = true
      }
      if (this.source.sub.length) {
        sourceType.sub = true
      }

      return sourceType
    },
    modalOpen() {
      this.$modal.show('download')
    },
    modalClose() {
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
.button_text{
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
.modal-header{
  margin-bottom:80px;
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
  bottom:20px;
  font-size:16px;
  font-weight:bold;
  color:#999;
}
.modal-close-btn i{
  margin-right:4px;
}
</style>
