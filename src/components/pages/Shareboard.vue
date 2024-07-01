<template>
  <div class="content-wrap">
    <div class="content-area">
      <div class="roomName">
        <span>合言葉</span><span>{{ roomName }}</span>
      </div>
      <div v-for="chart in room.charts" :key="chart.chartID">
        <!-- <pre>DEBUG: {{ chart }}</pre> -->
        <div v-if="!(chart.chartID in hideChartIDs)" class="content-box">

          <div class="content-box-header">
            <div class="chart-name">
              {{ chart.chartName }}
            </div>
            <div class="chart-hidden-btn-wrap"><a class="chart-hidden-btn" @click="hideChart(chart.chartID)">隠す</a>
            </div>
            <div class="sensor-wrap">
              <div v-if="chart.chartMainSensorID" class="sensor-main">
                {{ chart.chartMainSensorID | sensorKind }}
              </div>
              <div v-if="chart.chartSubSensorID" class="sensor-sub">
                {{ chart.chartSubSensorID | sensorKind }}
              </div>
            </div>

            <div class="chart-time-wrap">
              <div class="chart-time">計測開始: {{ chart.chartTimeStart | YmdHMS }} ({{ (Date.now() - chart.chartTimeStart)
                | toInterval }}前)
              </div>
              <div class="chart-reload-time">最終更新: {{ chart.chartTimeEnd | YmdHMS }} ({{ (Date.now() -
                chart.chartTimeEnd) | toInterval }}前)</div>
            </div>
          </div>

          <div class="chart-img">
            <img :src="chart.imageUrl">
          </div>
        </div>
      </div>
      <div class="chart-show-btn-wrap">
        <a class="chart-show-btn" @click="showAllChart">全て表示する
          (
          現在の表示数：{{ charts.filter(c => !(c.chartID in hideChartIDs)).length }}/{{ charts.length }}
          )
        </a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: {},
  data() {
    return {}
  },
  computed: {
    room() {
      return this.$store.state.share.roomSnapshot
    },
    roomID() {
      return this.$store.state.share.roomID
    },
    roomName() {
      return this.$store.state.share.roomName
    },
    charts() {
      return (this.$store.state.share.roomSnapshot?.charts ?? [])
        .map((c) => ({ ...c, hidden: this.hideChartIDs[c.chartID] || false }))
        .sort((a, b) => (a.chartName === b.chartName ? 0 : a.chartName < b.chartName ? -1 : 1))
    },
    hideChartIDs() {
      return this.$store.state.share.hideChartIDs
    },
    reloadInterval() {
      return this.$store.state.share.reloadInterval
    },
    reloadIntervalHint() {
      return this.$store.state.share.reloadIntervalHint
    },
  },
  watch: {
    _hideChartIDs() {
      console.log('hideChartIDs', this.hideChartIDs)
      return this.$store.state.share.hideChartIDs
    },
  },
  async mounted() {
    await this.$store.dispatch('share/setupStore')
    await this.$store.dispatch('share/reloadRoomSnapshot')
    console.log(this.$store.state.share.roomSnapshot)
  },
  methods: {
    hideChart(id) {
      this.hideChartIDs[id] = true
      this.$store.dispatch('share/hideChart', id)
    },
    showChart(id) {
      delete this.hideChartIDs[id]
      this.$store.dispatch('share/showChart', id)
    },
    showAllChart() {
      this.hideChartIDs = {}
      this.$store.dispatch('share/showAllChart')
    },
  },
}
</script>
<style scoped>
.roomName {
  margin-bottom: 10px;
}

.roomName span:first-of-type {
  padding: 5px 10px;
  display: inline-block;
  margin-right: 5px;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  background: #2FAD65;
  border-radius: 5px;
}

.roomName span:last-of-type {
  font-weight: bold;
  font-size: 16px;
}

.content-area {
  padding: 15px 5%;
  width: 100%;
  background: #f5f5f5;
}

.content-box {
  text-align: center;
  width: 100%;
  background: #fff;
  margin: 0 0 30px 0;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.content-box-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  position: relative;
}

.chart-name {
  margin-bottom: 15px;
  font-weight: bold;
  font-size: 18px;
  width: calc(100% - 120px);
  text-align: start;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-hidden-btn-wrap {
  margin: 0 0 15px auto;
}

.chart-hidden-btn {
  display: inline-block;
  padding: 0 10px 0 40px;
  margin: auto;
  line-height: 30px;
  color: #333;
  font-size: 15px;
  text-align: start;
  font-weight: bold;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: url(../../../public/img/icon-hidden.svg) no-repeat 10px center/22px;
}

.sensor-wrap {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
}

.sensor-main,
.sensor-sub {
  position: relative;
  padding-left: 30px;
  font-weight: bold;
}

.sensor-sub {
  color: #00A556;
}

.sensor-main:before,
.sensor-sub:before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  content: "";
  display: inline-block;
  width: 25px;
  height: 3px;
  background: #333;
}

.sensor-sub:before {
  background: #00A556;
}


.chart-time-wrap {
  margin-left: auto;
  margin-bottom: 10px;
}

.chart-time,
.chart-reload-time {
  position: relative;
  margin-bottom: 3px;
  padding-left: 18px;
  font-size: 13px;
  text-align: start;
  white-space: nowrap;
}

.chart-time:before,
.chart-reload-time:before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  display: inline-block;
  width: 14px;
  height: 14px;
}

.chart-time:before {
  background: url(../../../public/img/icon-time.svg) no-repeat right center/contain;
}

.chart-reload-time:before {
  background: url(../../../public/img/icon-reload.svg) no-repeat right center/contain;
}


.chart-img {
  margin-bottom: 10px;
}

.chart-img img {
  display: block;
  border: 1px solid #ccc;
  max-width: 100%;
  margin: auto;
}

.chart-show-btn-wrap {
  text-align: center;
}

.chart-show-btn {
  display: inline-block;
  padding: 0 10px 0 40px;
  margin: auto;
  line-height: 40px;
  color: #333;
  font-size: 15px;
  text-align: start;
  font-weight: bold;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: url(../../../public/img/icon-show.svg) #fff no-repeat 10px center/22px;
}
</style>
