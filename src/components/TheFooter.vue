<template>
  <footer class="main-footer">
    <nav class="footer-menu">
      <ul class="footer-menu-list">
        <li>
          <a href="https://399.jp/AkaDakoGraphSupportSensor" target="_blank">
            対応センサー
          </a>
        </li>

        <li>
          <a href="https://tfabworks.com/service_privacy/" target="_blank">
            プライバシーポリシー
          </a>
        </li>
        <li>
          <a href="https://akadako.com/" target="_blank">
            akadako.com
          </a>
        </li>
      </ul>
    </nav>
    <div class="footer-logo"><a href="https://tfabworks.com/" target="_blank"><img src="../../public/img/footer-logo.svg" alt="TFabWorks"></a></div>
  </footer>
</template>

<script>
export default {
  components: {},
  methods: {
    modalReset() {
      this.newGroup = {
        tabState: 1,
        isPublic: 'Private',
        modalActive: false,
        name: '',
        joinNumber: null,
      }
    },
  },
}
</script>
<style scoped>
.main-footer {
  background: #27ae60;
  padding:20px;
}

.footer-menu-list{
  display:flex;
  justify-content:center;
  margin-bottom:20px;
}

.footer-menu-list li{
  height:26px;
  line-height:26px;
  border-right:1px solid #fff;
}

.footer-menu-list li:last-of-type{
  border-right:none;
}

.footer-menu-list li a{
  padding:0 15px;
  font-size:14px;
  font-weight:bold;
  color:#fff;
}

.footer-logo{
  width:200px;
  margin:auto;
}

.footer-logo img{
  width:100%;
}

</style>
