<template>
  <div id="cesiumContainer" ref="cesiumContainer">
  </div>
  <div id="coords" style="position: absolute; bottom: 10px; right: 50px; color: #444; font-size: 16px;">
    X: 0, Y: 0, Z: 0
  </div>
  <div id="container"></div>
</template>

<script setup>
import { onMounted } from "vue";
import "../Widgets/widgets.css";
import { exportCesium, initCesium, renderCesium } from "../cesium/cesium_init.js";
import { initThree, createMesh, renderThree } from "../three/three_init.js";


onMounted(() => {
  main();
});

function main() {
  // 设置显示模型的渲染范围(张双楼)
  const minWGS84 = [116.7497, 34.7782];
  const maxWGS84 = [116.8914, 34.8370];

  //初始化Cesium
  initCesium(minWGS84, maxWGS84);
  var cesium = exportCesium();

  //初始化Three
  initThree(minWGS84, maxWGS84,);
  //创建物体
  createMesh(minWGS84, maxWGS84);

  loop();

  //循环函数，不断请求动画帧渲染
  function loop() {
    requestAnimationFrame(loop);
    // three.js渲染
    renderThree(cesium);
    // cesium渲染
    renderCesium();

  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
}

#cesiumContainer {
  width: 100vw;
  height: 100vh;
  position: absolute
}

#cesiumContainer>canvas {
  position: absolute;
  top: 0;
  left: 0;
  /* 设置鼠标事件穿透 */
  pointer-events: none;
}
</style>
