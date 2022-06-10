<template>
  <div class="content-wrap">
    <SideMenu />
    <GraphPage />
  </div>
</template>

<script>
import SideMenu from './DashboardSideMenu.vue'
import GraphPage from './dashboard/GraphPage'

export default {
  components: { 
    SideMenu,
    GraphPage
  }
}
</script>
<style scoped>
.content-wrap {
  display: flex;
  justify-content:space-between;
}
.content-area {
  padding: 35px 5%;
  width: calc(100% - 220px);
  background: #f5f5f5;
}

.content-box {
  width: 100%;
  background: #fff;
  margin: 35px 0;
  padding: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
