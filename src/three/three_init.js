import * as THREE from "three";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'; //导入gui面板
import * as Cesium from "cesium";
import { DXFtoThreeAll, DXFtoThree } from './three_cad';
import { useRouter } from 'vue-router';  // 引入useRouter
// import { createZhu } from './three_3d'
// import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';  // 导入字体加载器
// import { fetchHoleData, fetchTaiyuanData, fetchShanxiData, fetchXiashihrData } from './fetchData'
// import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
// 22910工作面
import { PointCad } from './three_cad_point';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { denormalize } from './Utils';

// three全局对象
let cesiumContainer;
let renderer, camera, scene;
let pointGroup = new THREE.Group();
let meshGroup = new THREE.Group();
let planeGroup = new THREE.Group();


let HelperObjects = [];// 存储样条辅助对象的数组
let selectedObject = null; // 存储当前选中的对象
const positions = [];// 存储点的位置

const raycaster = new THREE.Raycaster(); // 创建射线投射器，用于检测鼠标与物体的交互
const pointer = new THREE.Vector2(); // 存储鼠标指针的二维位置

let transformControl;// 定义一个变量来存储变换控制器


// three.js物体
let objects3D = [];

//封装three物体（使three物体具有经纬度）
function Object3D(mesh, minWGS84, maxWGS84) {
  this.threeMesh = mesh; //物体
  this.minWGS84 = minWGS84; //范围
  this.maxWGS84 = maxWGS84; //范围
}

// 初始化
function initThree() {
  cesiumContainer = document.getElementById('cesiumContainer');
  // 1..初始化场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color().setStyle('rgba(255, 250, 250, 1)'); // 透明度为 0.

  // 2.设置渲染器大小
  renderer = new THREE.WebGLRenderer({
    antialias: true, //抗锯齿
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 3.设置相机
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);

  // 3.添加环境光
  let ambientLight = new THREE.AmbientLight(0xffffff, 10);
  scene.add(ambientLight);

  // 设置轨道控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.damping = 0.2;
  controls.addEventListener('change', renderThree);

  // 设置变换控制器
  // 限制移动方向，只允许在 Z 轴上移动
  transformControl = new TransformControls(camera, renderer.domElement)
  // transformControl.showX = false;
  // transformControl.showY = true;
  // transformControl.showZ = true;
  transformControl.size = 0.7;
  // transformControl.rotateZ(Math.PI/2); // 旋转180度  
  scene.add(transformControl);


  transformControl.addEventListener('objectChange', function () {
    updateCoords();
  });

  // 监听鼠标事件
  document.addEventListener('pointermove', onPointerMove);

  // 添加three.js canvas元素到cesium容器
  cesiumContainer.appendChild(renderer.domElement);
}

// 创建three.js物体
async function createMesh(minWGS84, maxWGS84) {

  // 工作面中的点
  const points_22910 = await PointCad();
  // 全部实体按比例放大，长：宽 = 2：1
  for (let i = 0; i < points_22910.length; i++) {
    let point_cad = points_22910[i]
    // console.log(point_cad);
    point_cad.scale.set(6100, 3050, 1000); // 放大
    point_cad.rotateZ(Math.PI); // 绕Z轴旋转180度
    // 放到指定经纬度位置
    pointGroup.add(point_cad)
  }

  // 全部工作面
  const MeshDXF = await DXFtoThreeAll();
  // 全部实体按比例放大，长：宽 = 2：1
  for (let i = 0; i < MeshDXF.length; i++) {
    let lineSegments = MeshDXF[i]
    lineSegments.scale.set(6100, 3050, 1000); // 放大
    lineSegments.rotateZ(Math.PI); // 绕Z轴旋转180度
    meshGroup.add(lineSegments);
  }

  const dxf_22910 = await DXFtoThree();
  for (let i = 0; i < dxf_22910.length; i++) {
    let lines = dxf_22910[i]
    lines.scale.set(6100, 3050, 1000); // 放大
    lines.rotateZ(Math.PI); // 绕Z轴旋转180度
    planeGroup.add(lines);
  }

  // 定义线条对象
  let lines = {
    '煤巷中心线': MeshDXF[0],
    '煤巷': MeshDXF[1],
    '岩巷': MeshDXF[2],
  };


  for (let i = 0; i < points_22910.length; i++) {
    const pointObject = addPointObject(points_22910[i]);
    pointGroup.add(pointObject)
    positions.push(HelperObjects[i].position);

  }

  // meshGroup放到指定位置
  let OB3d = new Object3D(
    meshGroup,
    [minWGS84[0], minWGS84[1]],
    [maxWGS84[0], maxWGS84[1]]
  );
  // pointGroup放到指定位置
  let Point3d = new Object3D(
    pointGroup,
    [minWGS84[0], minWGS84[1]],
    [maxWGS84[0], maxWGS84[1]]
  );
  // planeGroup放到指定位置
  let Plane3d = new Object3D(
    planeGroup,
    [minWGS84[0], minWGS84[1]],
    [maxWGS84[0], maxWGS84[1]]
  );
  // 添加到3D物体数组
  objects3D.push(OB3d, Point3d, Plane3d);

  //将meshGroup添加到场景中
  scene.add(meshGroup);
  // 添加面板
  addGUI(lines);

}

// 渲染
function renderThree(cesium) {
  // 设置相机跟cesium保持一致
  camera.fov = Cesium.Math.toDegrees(cesium.viewer.camera.frustum.fovy);

  // 将cesium框架的cartesian3坐标 转换为three.js的vector3（笛卡尔坐标转换为三维向量）
  let cartToVec = function (cart) {
    return new THREE.Vector3(cart.x, cart.y, cart.z);
  };

  //将3D的物体通过 经纬度 转换成 笛卡尔坐标系
  //fromDegrees（经度，维度，高度）
  objects3D.forEach((item, index) => {
    // 通过经纬度获取中心点的位置
    let center = Cesium.Cartesian3.fromDegrees(
      (item.minWGS84[0] + item.maxWGS84[0]) / 2,
      (item.minWGS84[1] + item.maxWGS84[1]) / 2
    );
    item.threeMesh.position.copy(cartToVec(center));

    //计算朝向（切面方向-切线向量）
    //中心高度点
    let centerHeight = Cesium.Cartesian3.fromDegrees(
      (item.minWGS84[0] + item.maxWGS84[0]) / 2,
      (item.minWGS84[1] + item.maxWGS84[1]) / 2,
      1
    );
    //左下
    let bottomLeft = cartToVec(
      Cesium.Cartesian3.fromDegrees(item.minWGS84[0], item.minWGS84[1])
    );
    //左上
    let topLeft = cartToVec(
      Cesium.Cartesian3.fromDegrees(item.minWGS84[0], item.maxWGS84[1])
    );
    //朝向（）
    let latDir = new THREE.Vector3()
      .subVectors(bottomLeft, topLeft)
      .normalize();

    // console.log(item);
    //设置查看方向
    item.threeMesh.lookAt(centerHeight.x, centerHeight.y, centerHeight.z);
    //设置朝向
    item.threeMesh.up.copy(latDir);
  });

  // 设置相机跟cesium保持一致
  camera.matrixAutoUpdate = false; //自动更新
  //复制cesium相机矩阵
  let cvm = cesium.viewer.camera.viewMatrix;
  let civm = cesium.viewer.camera.inverseViewMatrix;
  // three相机默认朝向0,0,0
  camera.lookAt(scene.position);

  // 设置threejs相机矩阵
  camera.matrixWorld.set(
    civm[0],
    civm[4],
    civm[8],
    civm[12],
    civm[1],
    civm[5],
    civm[9],
    civm[13],
    civm[2],
    civm[6],
    civm[10],
    civm[14],
    civm[3],
    civm[7],
    civm[11],
    civm[15]
  );

  camera.matrixWorldInverse.set(
    cvm[0],
    cvm[4],
    cvm[8],
    cvm[12],
    cvm[1],
    cvm[5],
    cvm[9],
    cvm[13],
    cvm[2],
    cvm[6],
    cvm[10],
    cvm[14],
    cvm[3],
    cvm[7],
    cvm[11],
    cvm[15]
  );
  //设置宽高比例
  let width = cesiumContainer.clientWidth;
  let height = cesiumContainer.clientHeight;
  camera.aspect = width / height;
  //更新相机矩阵
  camera.updateProjectionMatrix();
  //设置尺寸大小
  renderer.setSize(width, height);
  renderer.clear();
  renderer.render(scene, camera);
}

// 添加控制面板
function addGUI(lines) {
  const gui = new GUI();

  const params = {
    selectedPlane: '全部',
  };

  // 定义工作面选项
  const planes = {
    '全部': '全部',
    '22910': '22910',
  };

  // 添加下拉框
  gui.add(params, 'selectedPlane', planes).name('工作面').onChange(function (value) {
    if (value === '22910') {
      if (!scene.children.includes(pointGroup)) {
        scene.add(pointGroup);
        scene.add(planeGroup);
        scene.remove(meshGroup);
      }
      // 路由跳转到 /edit
      // router.push({ name: 'edit' });
    } else {
      if (scene.children.includes(pointGroup)) {
        scene.remove(pointGroup);
        scene.remove(planeGroup);
        scene.add(meshGroup);
      }
    }

    // 方案一
    // if (value === '22910') {
    //   // 清理当前场景
    //   while (scene.children.length > 0) {
    //     scene.remove(scene.children[0]);
    //   }

    //   // 初始化新场景
    //   const newSceneData = initNewScene();
    //   scene = newSceneData.scene;
    //   camera = newSceneData.camera;

    //   // 在新场景中创建和添加22910工作面模型
    //   createMeshForNewScene();
    // } 

  });

  // 其他控件，如复选框等
  const visibility = {
    '煤巷中心线': true,
    '煤巷': true,
    '岩巷': true,
  };

  for (let key in lines) {
    gui.add(visibility, key).onChange(function (value) {
      lines[key].visible = value;
    });
  }

  // 默认关闭面板
  gui.close();
}

// 更新Z坐标
function updateCoords() {
  const object = transformControl.object;
  const minX = 39476000;
  const maxX = 39489000;
  const minY = 3849500;
  const maxY = 3856000;
  if (object) {
    const objectPos = object.geometry.attributes.position.array
    const originalX = denormalize(objectPos[0], minX, maxX)
    const originalY = denormalize(objectPos[1], minY, maxY)


    const coordsDiv = document.getElementById('coords');
    coordsDiv.innerHTML = `X: ${originalX.toFixed(3)}, Z: ${originalY.toFixed(3)}, Y:<input type="number" id="y-input" step="1" value=${objectPos[2].toFixed(3)}> `;

    // 添加输入框事件监听器
    const Input = document.getElementById('y-input');
    Input.addEventListener('change', function () {
      object.position.y = parseFloat(Input.value);
    });
  }
}

// 处理鼠标移动事件
function onPointerMove(event) {
  updateCoords(); // 选中立方体时立即更新坐标

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(HelperObjects, false);

  if (intersects.length > 0) {
    const object = intersects[0].object;

    if (object !== transformControl.object) {
      // 恢复上一个选中的对象的颜色
      if (selectedObject) {
        selectedObject.material.color.set(0xff0000); // 恢复为红色
      }

      // 将当前对象变为绿色
      object.material.color.set(0x00ff00);

      transformControl.attach(object);
      updateCoords(); // 选中立方体时立即更新坐标

      // 更新选中的对象
      selectedObject = object;
    }
  } else {
    // 如果没有选中任何对象，恢复上一个选中对象的颜色
    if (selectedObject) {
      selectedObject.material.color.set(0xff0000); // 恢复为红色
      selectedObject = null; // 清除选中对象
    }
  }
}

// 添加点对象
function addPointObject(object) {
  // 创建红色的立方体对象
  // const geometry = new THREE.BoxGeometry(20, 20, 20);
  // const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  // const object = new THREE.Mesh(geometry, material);

  scene.add(object);
  HelperObjects.push(object);

  return object;
}

export { initThree, createMesh, renderThree }; 
