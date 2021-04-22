<template>
  <div class="flex pa-1">
    <v-layout

      :class="
        `${
          colors[
            msg.userType == 0
              ? msg.to != $store.state.user.id
                ? 0
                : 1
              : msg.from != $store.state.user.id
              ? 1
              : 0
          ]
        }--text bubble-inner${msg.userType == 0
              ? msg.to != $store.state.user.id
                ? '2'
                : ''
              : msg.from != $store.state.user.id
              ? ''
              : '2'}`
      "
    >
      <v-layout row class="pa-2 pt-3 pl-3 chat-content">
        <v-avatar width="22" height="22" min-width="22"
          ><img
            :src="user.imagen ? user.imagen : $store.state.defaultUserImage"
            :alt="user.nombre"
        /></v-avatar>
        <span class="small-text"
          ><span class="mr-1"></span
          >{{
            ` ${
              user.id != $store.state.user.id ? user.nombre : "Tú"
            } - ${new Date(msg.fecha).toLocaleString()}`
          }}</span
        >
      </v-layout>
      <div
        v-if="msg.to != $store.state.user.id && msg.userType == 0"
        v-html="
          `<div class='layout row ml-4 mt-1 mb-0'>${msg.texto.replace(
            /\n/g,
            '<br>'
          )}<i class='v-icon mdi mdi-check-all pl-2 pr-2' style='${
            msg.estado > 0
              ? 'color:#1e90ff;float:right;font-size:12px'
              : 'color:grey;float:right;font-size:12px'
          }'></i></div>`
        "
        :class="msg.to != $store.state.user.id ? 'bold ml-2' : 'ml-2'"
      ></div>
      <div
        v-else
        v-html="
          `<div class='layout row ml-4 mt-1 mb-0'>${msg.texto.replace(
            /\n/g,
            '<br>'
          )}</div>`
        "
        :class="msg.from == $store.state.user.id ? 'bold ml-2' : 'ml-2'"
      ></div>
      <div v-if="JSON.parse(msg.files).length > 0" class="pa-1">
        <ul>
          <li
            v-for="(file, i) in msg.files.length > 0
              ? JSON.parse(msg.files)
              : []"
            :key="i"
          >
            <a
              target="_blank"
              :href="`${$store.state.server + file.link}`"
              :download="file.name"
              v-text="file.name"
            ></a>
          </li>
        </ul>
      </div>
      <!--<div width="40" v-if="msg.to==$store.state.user.id">{{ user.imagen }}</div>-->
    </v-layout>
  </div>
</template>

<script>
export default {
  props: {
    colors: Array,
    msg: Object
  },
  computed: {
    user: function() {
      let mv = this;
      let idx = mv.$store.state.usuarios.findIndex(u => {
        return u.id == mv.msg.from;
      });
      return mv.$store.state.usuarios[idx];
    }
  }
};
</script>

<style scoped>
.bold {
  font-weight: bold !important;
}
.chat-content {
  margin-top: -37px;
}
.bubble-inner {
  display: inline-block;
  border: 1px solid rgb(150, 150, 150);
  border-radius: 10px;
  background: linear-gradient(
    to bottom,
    rgb(250, 250, 250) 0%,
    rgb(230, 230, 230) 20px,
    rgb(230, 230, 230) 20px,
    rgb(240, 240, 240) 100%
  );
  padding: 4px;
  padding-right: 10px;
  padding-left: 4px !important;
  font-size: 14px;
  box-shadow: 0 1px 5px rgb(49, 49, 49);
  margin-left: 5px;
}
.bubble-inner:before {
  display: block;
  content: " ";
  width: 0;
  border: 1px solid rgb(150, 150, 150);
  border-width: 1px 0 0 1px;
  position: relative;
  margin-top: 12px;
  margin-left: -10px;
  padding: 5px;
  background: rgb(230, 230, 230);
  transform: rotate(-45deg);
}
.bubble-inner2 {
  display: inline-block;
  border: 1px solid rgb(150, 150, 150);
  border-radius: 10px;
  background: linear-gradient(
    to bottom,
    rgb(255, 250, 255) 0%,
    rgb(240, 230, 240) 20px,
    rgb(240, 230, 240) 20px,
    rgb(255, 250, 255) 100%
  );
  padding: 4px;
  padding-right: 10px;
  padding-left: 4px !important;
  font-size: 14px;
  box-shadow: 2px 2px 3px rgb(150, 150, 150);
  margin-left: 5px;
}
.bubble-inner2:before {
  display: block;
  content: " ";
  width: 0;
  border: 1px solid rgb(150, 150, 150);
  border-width: 1px 0 0 1px;
  position: relative;
  margin-top: 12px;
  margin-left: -10px;
  padding: 5px;
  background: rgb(240, 230, 240);
  transform: rotate(-45deg);
}
.small-text {
  font-size: 9px;
  color: gray;
}
</style>
