<template>
  <section>
    <div :class="{ active: connected, inactive: !connected, 'connect-btn': true }">
      <button @click="toggleConnection">
        {{ connectButtonString }}
      </button>
    </div>
  </section>
</template>
<script>
import { mapActions, mapGetters } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      connected: 'firmata/connected',
    }),
    connectButtonString: function () {
      return this.connected ? '接続中' : '接続する'
    },
  },
  watch: {
    selected: function () {
      if (this.connected) {
        this.mDisConnect().catch((e) => {
          console.error(e)
          this.$buefy.toast.open({
            duration: 7000,
            message: '不明なエラーが発生しました',
            position: 'is-top',
            type: 'is-danger',
          })
          return Promise.resolve()
        })
      }
    },
  },
  methods: {
    toggleConnection(e) {
      if (e.shiftKey) {
        this.$store.dispatch('firmata/debugStateSetEnableDummyBoard', true)
      }
      if (this.connected) {
        this.disConnect()
      } else {
        this.connect()
      }
    },
    ...mapActions({
      connect: 'firmata/connect',
      disConnect: 'firmata/disConnect',
    }),
  },
}
</script>
<style scoped>
.connect-btn {
  margin-top: -6px;
}

.connect-btn button {
  width: 120px;
  padding: 0 5px 0 60px;
  height: 26px;
  line-height: 26px;
  text-align: start;
  box-shadow: 0 6px #999;
  border-radius: 4px;
  font-weight: bold;
  background: url(/public/img/connect-inactive.svg) #efefef no-repeat left center/contain;
}

.connect-btn.active button {
  background: url(/public/img/connect-active.svg) #efefef no-repeat left center/contain;
  transform: translateY(4px);
  box-shadow: 0 3px #999;
}

.connect-btn button:hover {
  opacity: .7;
}
</style>
