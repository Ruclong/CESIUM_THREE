import * as Cesium from "cesium";
import "../Widgets/widgets.css";
// 设置cesium的token
Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5ZTk5YWMyMy03ZjZjLTQ0ODQtOTI5ZC1iZmExNjI0YmY2NzQiLCJpZCI6MjI4NDQ3LCJpYXQiOjE3MjEwMjk1MjN9.S16F1kblAMM-8wIsVRRGchj-xm_G3rIPFcmmzXp83MU";
// cesium默认资源路径
window.CESIUM_BASE_URL = "/Cesium/";

// 设置默认的视角
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(
  116.7497, 34.7782, 116.8914, 34.8370
);
// 设置全局cesium对象 
let cesium = {
  viewer: null,
};

// 初始化cesium场景
function initCesium(minWGS84, maxWGS84) {
  // 设置cesium容器
  let cesiumContainer = document.getElementById("cesiumContainer");
  // 初始化cesium渲染器
  cesium.viewer = new Cesium.Viewer(cesiumContainer, {
    useDefaultRenderLoop: false,
    selectionIndicator: false,
    homeButton: false,//主页按钮
    infoBox: false,
    sceneModePicker: false,//投影方式选择
    navigationHelpButton: false,//帮助手势按钮
    animation: false,//动画控件
    timeline: false,//时间轴控件
    fullscreenButton: false,//全屏控件
    baseLayerPicker: false,//图层选择
    clock: false,
    geocoder: false,//搜索按钮
    //天地图矢量路径图
    imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
      url: "http://t0.tianditu.gov.cn/vec_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=vec&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=069bf1e16879b3300ba890f4ae0c6799",
      layer: "tdtBasicLayer",
      style: "default",
      format: "image/jpeg",
      tileMatrixSetID: "GoogleMapsCompatible",
    }),
    // cesium中webgl选项
    contextOptions: {
      webgl: {
        //透明度
        alpha: false,
        // 抗锯齿
        antialias: true,
        //深度检测
        depth: true,
      },
    },
  });
  //设置隐藏logo
  cesium.viewer.cesiumWidget.creditContainer.style.display = "none";

  // 设置抗锯齿
  cesium.viewer.scene.postProcessStages.fxaa.enabled = true;

  // 地图叠加 
  var imageryLayers = cesium.viewer.imageryLayers;

  var layer = imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider({
      url: "http://t0.tianditu.com/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=069bf1e16879b3300ba890f4ae0c6799",
      layer: "tdtBasicLayer",
      style: "default",
      format: "image/jpeg",
      tileMatrixSetID: "GoogleMapsCompatible",
    })
  );

  layer.alpha = 0.5;

  // 设置前往地点
  let center = Cesium.Cartesian3.fromDegrees(
    (minWGS84[0] + maxWGS84[0]) / 2, // 经度
    (minWGS84[1] + maxWGS84[1]) / 2 - 0.085,// 纬度
    20000// 高度（米）
  );

  // 设置相机飞往该区域
  cesium.viewer.camera.flyTo({
    destination: center,
    duration: 4,
    //视角
    orientation: {
      heading: Cesium.Math.toRadians(10),
      pitch: Cesium.Math.toRadians(-65),
      roll: 0,
    },
  });

  // 添加围墙
  let wallPositions = Cesium.Cartesian3.fromDegreesArray([
    minWGS84[0], minWGS84[1],
    maxWGS84[0], minWGS84[1],
    maxWGS84[0], maxWGS84[1],
    minWGS84[0], maxWGS84[1],
    minWGS84[0], minWGS84[1]
  ]);

  cesium.viewer.entities.add({
    name: "Blinking Yellow Wall",
    wall: {
      positions: wallPositions,
      minimumHeights: [12, 12, 12, 12, 12],
      maximumHeights: new Cesium.CallbackProperty(function () {
        // let height = 1000 ;
        let height = 300 * Math.abs(Math.sin(Cesium.JulianDate.now().secondsOfDay));
        return [height, height, height, height, height];
      }, false),
      // material: Cesium.Color.YELLOW
      material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(function () {
        // 动态设置透明度
        // let alpha = 0.4;
        let alpha = 0.5*Math.abs(Math.sin(Cesium.JulianDate.now().secondsOfDay));
        return Cesium.Color.YELLOW.withAlpha(alpha);
      }, false))

    },
  });

}
// 渲染cesium
function renderCesium() {
  cesium.viewer.render();
}
function exportCesium() {
  return cesium;
}
export { exportCesium, initCesium, renderCesium };
