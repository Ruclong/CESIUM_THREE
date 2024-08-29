import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ThreeView from '../views/ThreeView.vue'


const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/edit',
    name: 'edit',
    component: ThreeView
  },
 
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
