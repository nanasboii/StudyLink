import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import '../public/css/base.css'

const app = createApp(App)

app.use(router)
app.mount('#app')
