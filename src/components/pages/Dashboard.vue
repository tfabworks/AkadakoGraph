<template>
  <div class="content-wrap">
    <CommonAd />
    <GraphPage />
  </div>
</template>

<script>
import CommonAd from '../view/CommonAd.vue'
import GraphPage from './dashboard/GraphPage'
export default {
  components: {
    GraphPage,
    CommonAd
  }
}
</script>
<style scoped>
.content-wrap {
  display: flex;
  justify-content: space-between;
}

.content-area {
  padding: 15px 5%;
  width: calc(100% - 220px);
  background: #f5f5f5;
}
</style>
