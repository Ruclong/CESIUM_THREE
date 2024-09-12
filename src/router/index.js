import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ThreeView from '../views/ThreeView.vue'
import editPlane from '../views/editPlane.vue'



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
  {
    path: '/plane',
    name: 'plane',
    component: editPlane
  },
 
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
