<template>
  <div class="content-wrap">
    <div class="content-area">
      <div class="roomName">合言葉：{{ roomName }}</div>
      <div v-for="chart in room.charts" :key="chart.chartID">
        <!-- <pre>DEBUG: {{ chart }}</pre> -->
        <div v-if="!chart.hidden" class="content-box">
          <div class="content-box-header">
            <div>{{ chart.chartMainSensorID | sensorName }}</div>
            <div class="chart-name">{{ chart.chartName }}</div>
            <div>{{ chart.chartSubSensorID | sensorKind }}</div>
            <div>計測開始: {{ chart.chartTimeStart | YmdHMS }} ({{ (Date.now() - chart.chartTimeStart) | toInterval }}前)
            </div>
            <div>最終更新: {{ chart.chartTimeEnd | YmdHMS }} ({{ (Date.now() - chart.chartTimeEnd) | toInterval }}前)</div>
            <a @click="hideChart(chart.chartID)" class="chart-hidden-btn">[隠す]</a>
          </div>
          <div class="chart-img">
            <img :src="chart.imageUrl">
          </div>
        </div>
      </div>
      <div>
        <a @click="showAllChart">[全て表示する]</a>
        (
        {{ charts.filter(c => c.hidden).length }} / {{ charts.length }}
        )
      </div>
    </div>
  </div>
</template>

<script>

export default {
  components: {},
  async mounted() {
    await this.$store.dispatch('share/setupStore')
    await this.$store.dispatch('share/reloadRoomSnapshot')
    console.log(this.$store.state.share.roomSnapshot)
  },
  data() {
    return {
    }
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
      return this.$store.state.share.roomSnapshot.charts
        .map(c => ({ ...c, hidden: this.hideChartIDs[c.chartID] || false }))
        .sort((a, b) => a.chartName === b.chartName ? 0 : a.chartName < b.chartName ? -1 : 1)
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
    hideChartIDs() {
      console.log('hideChartIDs', this.hideChartIDs)
    },
  },
  methods: {
    hideChart(id) {
      this.$store.dispatch('share/hideChart', id)
    },
    showChart(id) {
      this.$store.dispatch('share/showChart', id)
    },
    showAllChart() {
      this.$store.dispatch('share/showAllChart')
    },
  },
}
</script>
<style scoped>
.roomID {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: bold;
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
  margin: 0 0 40px 0;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.content-box-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  padding-right: 60px;
  margin-bottom: 10px;
}

.chart-name {
  width: 50%;
  margin-right: 15px;
  text-align: start;
  font-weight: bold;
  font-size: 18px;
}

.chart-hidden-btn {
  position: absolute;
  right: 0;
}

.label-wrap {
  text-align: start;
}

.label-left,
.label-right {
  display: inline-block;
  margin-bottom: 5px;
  position: relative;
  padding-left: 18px;
  font-weight: bold;
  white-space: nowrap;
}

.label-left {
  margin-right: 15px;
}

.label-left:before,
.label-right:before {
  display: block;
  position: absolute;
  width: 15px;
  height: 15px;
  content: "";
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto;
}

.label-left:before {
  background: #333;
}

.label-right:before {
  background: #1EAF5A;
}

.chart-img {
  margin-bottom: 10px;
}

.chart-updated {
  text-align: right;
  font-size: 12px;
}
</style>
