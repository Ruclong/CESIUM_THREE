import * as THREE from "three";
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';  // 导入字体加载器
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'; //导入gui面板
import * as Cesium from "cesium";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import DxfParser from 'dxf-parser';
import Papa from 'papaparse';
import * as d3 from 'd3';
const dxfFilePath = '/Drawing4.dxf'


THREE.MathUtils.angle2 = function (p1, p2) {
  const v1 = new THREE.Vector2(p1.x, p1.y);
  const v2 = new THREE.Vector2(p2.x, p2.y);
  v2.sub(v1);
  v2.normalize();
  if (v2.y < 0) return -Math.acos(v2.x);
  return Math.acos(v2.x);
};

THREE.MathUtils.polar = function (point, distance, angle) {
  const result = {};
  result.x = point.x + distance * Math.cos(angle);
  result.y = point.y + distance * Math.sin(angle);
  return result;
};

class BulgeGeometry extends THREE.BufferGeometry {
  constructor(startPoint, endPoint, bulge, segments) {
    super();
    const vertices = [];
    const p0 = new THREE.Vector2(startPoint.x, startPoint.y);
    const p1 = new THREE.Vector2(endPoint.x, endPoint.y);
    const angle = 4 * Math.atan(bulge);
    const radius = p0.distanceTo(p1) / 2 / Math.sin(angle / 2);
    const center = THREE.MathUtils.polar(startPoint, radius, THREE.MathUtils.angle2(p0, p1) + (Math.PI / 2 - angle / 2));
    const segmentCount = segments || Math.max(Math.abs(Math.ceil(angle / (Math.PI / 18))), 6);
    const startAngle = THREE.MathUtils.angle2(center, p0);
    const thetaAngle = angle / segmentCount;
    vertices.push(p0.x, p0.y, 0);
    for (let i = 1; i <= segmentCount - 1; i++) {
      const vertex = THREE.MathUtils.polar(center, Math.abs(radius), startAngle + thetaAngle * i);
      vertices.push(vertex.x, vertex.y, 0);
    }
    vertices.push(p1.x, p1.y, 0);
    this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  }
}


// three全局对象
let three = {
  renderer: null,
  camera: null,
  scene: null,
  sceneInsetTop: null,
  sceneInsetSide: null,
  object: null
};

// 坐标信息
const drillData = [
  [3851670.65, 39481878.68, 38.2, -490.77],
  [3853451.44, 39484801.52, 38.23, -780.03],
  [3851810.89, 39481631.88, 37.82, -730.81],
  [3852522.8, 39483501.3, 38.23, -681.76],
  [3852715, 39484939.3, 36.92, -705.31],
  [3851786.38, 39479075.57, 38.8, -860.32],
  [3852217.16, 39485594.02, 36.6, -508.68],
  [3852948.51, 39484500.95, 37.97, -603.43],
  [3852280.13, 39482546.22, 37.84, -784.23],
  [3851173.66, 39482247.78, 38.64, -367.55],
  [3851620.91, 39484670.85, 37.69, -317.08],
  [3851418.06, 39482737.02, 38.2, -375.98],
  [3851919.48, 39480564.63, 38.98, -691.99],
  [3851362.04, 39479184.14, 38.68, -552.18],
  [3853900.1, 39486757.05, 37.27, -868.04],
  [3851318.47, 39482763.89, 38.56, -365.39],
  [3850798.76, 39481359.99, 38.78, -348.98],
  [3853388.1, 39485779.46, 37.71, -850.26],
  [3851225.34, 39478667.74, 38.1, -517.81],
  [3853284.63, 39488088.44, 37.2, -813.65],
  [3853347, 39488599.33, 36.95, -550.61],
  [3852434.81, 39482941.04, 38.13, -800.93],
  [3850995.32, 39479287.55, 39.22, -562.33],
  [3852578.63, 39485524.95, 37.31, -645.56],
  [3851072.61, 39480224.97, 38.74, -511.41],
  [3852508.07, 39478841.57, 40.05, -986],
  [3852405.35, 39487099.04, 36.99, -332.91],
  [3852095.66, 39484579.68, 37.89, -524.73],
  [3852082.86, 39482008.59, 37.76, -791.09],
  [3850804.04, 39480895, 38.71, -418.33],
  [3851599.62, 39483701.5, 37.07, -365.25],
  [3852193.78, 39483571.82, 38.15, -432.91],
  [3851017.38, 39480840.42, 38.68, -346.2],
  [3851656.04, 39480090.83, 38.91, -765.27],
  [3852108.72, 39486603.36, 36.92, -315.82],
  [3853764.18, 39488471.36, 37.15, -762.04],
  [3850682.06, 39479950.29, 39.25, -436.97],
  [3851915.71, 39485160.93, 36.73, -389.22],
  [3850571.09, 39479415.78, 39.21, -356.57],
  [3853646.32, 39484801.52, 37.79, -693.47],
  [3853224.42, 39483790.33, 37.07, -791.35],
  [3852370.44, 39486511.78, 37.38, -494.25],
  [3851640.54, 39479652.31, 38.92, -791.35],
  [3852586.33, 39484473.89, 37.87, -671.86],
  [3851501.7, 39480829.33, 38.01, -547.88],
  [3854091.09, 39487884.24, 37.22, -829.63],
  [3853585.4, 39487483.9, 37.33, -920.58],
  [3852135.03, 39487162.06, 37.29, -410.52],
  [3850921.64, 39480269.95, 39.33, -372.37],
  [3850769.02, 39480304.59, 39.47, -455.78],
  [3851666.26, 39484188.2, 37.65, -362.05],
  [3853381.6, 39482686.05, 38.56, -892.38],
  [3852690.36, 39486446.43, 37.68, -630.99],
  [3850932.72, 39479866.22, 39.23, -518.04],
  [3851752.66, 39484670.85, 37.56, -334.66],
  [3851639.3, 39482693.47, 38.06, -314.2],
  [3852311.26, 39483546.3, 38.25, -587.15],
  [3852917.81, 39483402.26, 37.53, -734.75],
  [3851767.21, 39481103.75, 38.66, -580.77],
  [3852091.75, 39486154.47, 37.34, -358.25],
  [3850686.92, 39478797.66, 39.17, -324.51],
  [3852748.68, 39480650.72, 38.95, -926.78],
  [3851102.2, 39478181.56, 38.28, -625.44],
  [3850497, 39478850.5, 39.42, -394.46],
  [3851868.33, 39485684.43, 36.88, -313.57],
  [3853146.38, 39487573.63, 36.78, -760.58],
  [3854357.71, 39485624.96, 37.56, -1002],
  [3851151.03, 39481757.93, 38.8, -439.23],
  [3851919.79, 39482626.91, 38.19, -645.86],
];

// three.js物体
let objects3D = [];
//封装three物体（使three物体具有经纬度）
function Object3D(mesh, minWGS84, maxWGS84) {
  this.threeMesh = mesh; //物体
  this.minWGS84 = minWGS84; //范围
  this.maxWGS84 = maxWGS84; //范围
}

function initThree() {
  // 设置相机配置
  let fov = 45; //视角
  let aspect = window.innerWidth / window.innerHeight; //宽高比例
  let near = 0.1;
  let far = 100000; //视域范围

  // 初始化场景
  three.scene = new THREE.Scene();
  three.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  three.renderer = new THREE.WebGLRenderer({
    antialias: true, //抗锯齿
    alpha: true,
  });
  // 设置渲染器大小
  three.renderer.setSize(window.innerWidth, window.innerHeight);
  // 添加环境光
  let ambientLight = new THREE.AmbientLight(0xffffff, 10);
  three.scene.add(ambientLight);
  // 添加three.js canvas元素到cesium容器
  cesiumContainer.appendChild(three.renderer.domElement);
}

// 创建three.js物体
async function createMesh(minWGS84, maxWGS84) {

  let meshGroup = new THREE.Group();

  const MeshDXF = await DXFtoThree();

  // 全部实体按比例放大，长：宽 = 2：1
  for (let i = 0; i < MeshDXF.length; i++) {
    let lineSegments = MeshDXF[i]
    lineSegments.scale.set(6100, 3050, 1000); // 放大
    lineSegments.rotateZ(Math.PI); // 绕Z轴旋转180度

  }

  // 定义线条对象
  let lines = {
    '煤巷中心线': MeshDXF[0],
    '设计巷道': MeshDXF[1],
    '未知': MeshDXF[2],
    '井田边界': MeshDXF[3],
    '煤巷': MeshDXF[4],
    '岩巷': MeshDXF[5],
    '巷道注记': MeshDXF[6],
    '三维矿区': null
  };

  // 添加到组
  for (let key in lines) {
    meshGroup.add(lines[key]);
  }

  // 定义几何体的颜色
  const colors = [
    0xff0000, // 红色
    0x00ff00, // 绿色
    0x0000ff, // 蓝色
    0xffff00,  // 黄色
    0x000000, // 黑色
  ];

  const coalGeometry = await fetchHoleData();

  // 对几何体
  const coal = createZhu(coalGeometry, colors[4]); // 黑色
  meshGroup.add(coal);
  //  console.log(coal);

  // createZhu(shanxiGeometry, colors[0]); // 红色  
  // createZhu(taiyuanGeometry, colors[1]); // 绿色
  // createZhu(xiashiheGeometry, colors[2]); // 蓝色

  // meshGroup.add(coal)
  // 添加至场景
  three.scene.add(meshGroup);

  // 创建3D物体 
  let OB3d = new Object3D(
    meshGroup,
    [minWGS84[0], minWGS84[1]],
    [maxWGS84[0], maxWGS84[1]]
  );

  // 添加到3D物体数组
  objects3D.push(OB3d);

  // 使用 GUI 控制显示与隐藏
  const gui = new GUI();
  const visibility = {
    '煤巷中心线': true,
    '设计巷道': true,
    '未知': true,
    '井田边界': true,
    '煤巷': true,
    '岩巷': true,
    '巷道注记': true,
    '三维矿区': false
  };
  for (let key in lines) {
    gui.add(visibility, key).onChange(function (value) {
      lines[key].visible = value;
    });
  }

}

function renderThree(cesium) {
  // 设置相机跟cesium保持一致
  three.camera.fov = Cesium.Math.toDegrees(cesium.viewer.camera.frustum.fovy);
  //console.log(cesium);
  // 声明一个将cesium框架的cartesian3转换为three.js的vector3（笛卡尔坐标转换为三维向量）
  let cartToVec = function (cart) {
    return new THREE.Vector3(cart.x, cart.y, cart.z);
  };

  // 将3D的物体通过 经纬度 转换成 笛卡尔坐标系
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

  //设置摄像机矩阵
  // 设置相机跟cesium保持一致
  three.camera.matrixAutoUpdate = false; //自动更新
  //复制cesium相机矩阵
  let cvm = cesium.viewer.camera.viewMatrix;
  let civm = cesium.viewer.camera.inverseViewMatrix;
  // three相机默认朝向0,0,0
  three.camera.lookAt(three.scene.position);

  // 设置threejs相机矩阵
  three.camera.matrixWorld.set(
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

  three.camera.matrixWorldInverse.set(
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
  three.camera.aspect = width / height;
  //更新相机矩阵
  three.camera.updateProjectionMatrix();
  //设置尺寸大小
  three.renderer.setSize(width, height);
  three.renderer.clear();
  three.renderer.render(three.scene, three.camera);
}

// 获取数据
async function DXFtoThree() {
  try {
    const response = await fetch(dxfFilePath);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const dxfText = await response.text();
    // 创建一个DxfParser实例，用于解析DXF文件内容
    var parser = new DxfParser();
    var dxf = parser.parseSync(dxfText);
    let dxfData = await Viewer(dxf)

    return dxfData;  // 将 dxfData 作为函数返回值返回
  } catch (error) {
    console.error('加载DXF错误:', error);
  }
}

//格式化最坐标[-1,1]
function normalize(val, min, max) {
  return 2 * (val - min) / (max - min) - 1;
}

function Viewer(data) {
  var font;
  var loader = new FontLoader();

  // console.log('cad原始数据中所有实体：\n', data.entities);

  return new Promise((resolve, reject) => {
    // 加载字体文件
    loader.load('../fonts/zhongsong_regular.typeface.json', function (response) {
      font = response;
      createLineTypeShaders(data);

      var scene = new THREE.Scene();  // 创建场景
      var res_entities = {}, layer_num = {}, group = new THREE.Group(), textgeo = [];
      var meshes = []; // 存储所有 mesh 对象

      // 从 dxf 对象 (data) 创建场景
      var i, entity, obj;
      var dims = {
        min: { x: false, y: false, z: false },
        max: { x: false, y: false, z: false }
      };

      function updateDimensions(bbox) {
        if (!dims.min.x || dims.min.x > bbox.min.x) dims.min.x = bbox.min.x;
        if (!dims.min.y || dims.min.y > bbox.min.y) dims.min.y = bbox.min.y;
        if (!dims.min.z || dims.min.z > bbox.min.z) dims.min.z = bbox.min.z;
        if (!dims.max.x || dims.max.x < bbox.max.x) dims.max.x = bbox.max.x;
        if (!dims.max.y || dims.max.y < bbox.max.y) dims.max.y = bbox.max.y;
        if (!dims.max.z || dims.max.z < bbox.max.z) dims.max.z = bbox.max.z;
      }

      // 遍历所有实体，并绘制到场景中
      for (i = 0; i < data.entities.length; i++) {

        entity = data.entities[i];
        // if (entity.type==='TEXT') {
        //   console.log(entity.text);
        // }

        // 如果实体类型是 'DIMENSION'，则处理其块
        if (entity.type === 'DIMENSION' && entity.block) {

          //类型是entity.block
          if (entity.block) {
            const block = data.blocks[entity.block];
            if (!block) {
              continue;
            }

            // 绘制块中的每个实体
            for (var j = 0; j < block.entities.length; j++) {
              obj = drawEntity(block.entities[j], data, font, scene);
              if (obj) {
                var bbox = new THREE.Box3().setFromObject(obj); // 获取包围盒
                updateDimensions(bbox);
                renderGeometry(obj, layer_num, res_entities, scene); // 渲染几何对象
              }
              obj = undefined;
            }

          }
          else {
            console.log('WARNING: No block for DIMENSION entity'); // 警告：DIMENSION 实体没有块
          }
        }

        else {
          obj = drawEntity(entity, data, font, scene); // 绘制普通实体
          // console.log(obj);

        }

        if (obj) {
          var bbox = new THREE.Box3().setFromObject(obj); // 获取包围盒
          updateDimensions(bbox);
          renderGeometry(obj, layer_num, res_entities, scene); // 渲染几何对象
        }
        obj = null;
      }
      //res_entities中实体
      // console.log('按图层分类后的所有实体：\n', res_entities);

      // scene.add(mesh);
      // 基础线条材质
      var line_material = new THREE.LineBasicMaterial({ vertexColors: true });
      // 虚线材质(LineDashedMaterial)
      var dash_material = new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 3, gapSize: 1, linewidth: 2 });

      // 遍历所有实体并根据类型创建网格对象
      for (var key in res_entities) {
        console.log('实体类型', key);

        var mesh, ent = new THREE.BufferGeometry();

        if (key == 'Dashed') {
          ent.setIndex(res_entities[key].indices);
          ent.setAttribute('position', new THREE.Float32BufferAttribute(res_entities[key].points, 3));
          ent.setAttribute('color', new THREE.Float32BufferAttribute(res_entities[key].colors, 3));
          ent.computeBoundingBox();
          mesh = new THREE.LineSegments(ent, dash_material);
          mesh.computeLineDistances();
        }
        else {
          ent.setIndex(res_entities[key].indices);
          ent.setAttribute('position', new THREE.Float32BufferAttribute(res_entities[key].points, 3));
          ent.setAttribute('color', new THREE.Float32BufferAttribute(res_entities[key].colors, 3));
          mesh = new THREE.LineSegments(ent, line_material);
        }

        mesh.userData = { layer: key };
        // scene.add(mesh);
        meshes.push(mesh); // 将 mesh 对象添加到数组中
      }
      // 所有threejs中实体对象
      console.log('三维绘制对象：\n', meshes);
      // 返回所有 mesh 对象
      resolve(meshes);
    }, undefined, function (error) {
      reject(error);
    });
  });
}

// 线段着色器
function createLineTypeShaders(data) {
  var ltype, type;
  if (!data.tables || !data.tables.lineType) return; // 如果 data.tables 或 data.tables.lineType 不存在，直接返回。
  var ltypes = data.tables.lineType.lineTypes; // 获取所有的线条类型。

  for (type in ltypes) { // 遍历每一个线条类型。
    ltype = ltypes[type]; // 获取当前的线条类型。
    if (!ltype.pattern) continue; // 如果当前线条类型没有 pattern 属性，跳过。
    ltype.material = createDashedLineShader(ltype.pattern); // 为有 pattern 的线条类型创建虚线着色器，并赋值给 material 属性。
  }
}

//虚线着色器
function createDashedLineShader(pattern) {
  var i,
    dashedLineShader = {},
    totalLength = 0.0;

  for (i = 0; i < pattern.length; i++) {
    totalLength += Math.abs(pattern[i]);
  }

  dashedLineShader.uniforms = THREE.UniformsUtils.merge([

    THREE.UniformsLib['common'],
    THREE.UniformsLib['fog'],

    {
      'pattern': { type: 'fv1', value: pattern },
      'patternLength': { type: 'f', value: totalLength }
    }

  ]);

  dashedLineShader.vertexShader = [
    'attribute float lineDistance;',

    'varying float vLineDistance;',

    THREE.ShaderChunk['color_pars_vertex'],

    'void main() {',

    THREE.ShaderChunk['color_vertex'],

    'vLineDistance = lineDistance;',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}'
  ].join('\n');

  dashedLineShader.fragmentShader = [
    'uniform vec3 diffuse;',
    'uniform float opacity;',

    'uniform float pattern[' + pattern.length + '];',
    'uniform float patternLength;',

    'varying float vLineDistance;',

    THREE.ShaderChunk['color_pars_fragment'],
    THREE.ShaderChunk['fog_pars_fragment'],

    'void main() {',

    'float pos = mod(vLineDistance, patternLength);',

    'for ( int i = 0; i < ' + pattern.length + '; i++ ) {',
    'pos = pos - abs(pattern[i]);',
    'if( pos < 0.0 ) {',
    'if( pattern[i] > 0.0 ) {',
    'gl_FragColor = vec4(1.0, 0.0, 0.0, opacity );',
    'break;',
    '}',
    'discard;',
    '}',

    '}',

    THREE.ShaderChunk['color_fragment'],
    THREE.ShaderChunk['fog_fragment'],

    '}'
  ].join('\n');

  return dashedLineShader;
}

function drawEntity(entity, data, font, scene) {
  var mesh;

  // 根据实体类型调用相应的绘制函数

  // 绘制圆或弧
  if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
    mesh = drawArc(entity, data);
  }
  // 绘制折线或线条
  else if (entity.type === 'LWPOLYLINE' || entity.type === 'LINE' || entity.type === 'POLYLINE') {
    mesh = drawLine(entity, data);
  }
  // // 绘制文本 
  // else if (entity.type === 'TEXT') {
  //   mesh = drawText(scene,entity, data, font);

  // }
  // // 绘制多行文本 
  // else if (entity.type === 'MTEXT') {
  //   mesh = drawMtext(entity, data, font);
  //   mesh.userData.text = entity.text
  // }
  else if (entity.type === 'SOLID') {
    // 绘制实心对象
    mesh = drawSolid(entity, data);
  }
  else if (entity.type === 'POINT') {
    // 绘制点
    mesh = drawPoint(entity, data, scene);
  }
  else if (entity.type === 'INSERT') {
    // 绘制块引用
    mesh = drawBlock(entity, data, scene);
  }
  else if (entity.type === 'SPLINE') {
    // 绘制样条曲线
    mesh = drawSpline(entity, data);
  }

  else if (entity.type === 'ELLIPSE') {
    // 绘制椭圆 
    mesh = drawEllipse(entity, data);
  }
  else {
    // 如果实体类型不受支持，输出日志
    console.log("实体类型不支持: " + entity.type);
  }

  // 如果成功生成了 mesh 对象
  if (mesh) {
    // 将实体的图层信息保存到 mesh 的用户数据中
    mesh.userData.layer = entity.layer;
    // 将实体的类型信息保存到 mesh 的用户数据中
    mesh.userData.type = entity.type;
    // if(entity.lineType){
    //     // 如果实体有线型属性，保存线型信息到 mesh 的用户数据中 (代码被注释掉了)
    //     mesh.userData.lineType = data.tables.lineType.lineTypes[entity.lineType];
    // } 
    // 如果实体有颜色属性，保存颜色信息到 mesh 的用户数据中
    if (entity.color) {
      mesh.userData.color = entity.color;
    }
  }

  // 返回生成的 mesh 对象
  return mesh;
}

function drawLine(entity, data) {
  const geometry = new THREE.BufferGeometry();
  const color = getColor(entity, data);
  let material, lineType, startPoint, endPoint, bulgeGeometry, bulge, i;

  const vertices = [];
  for (i = 0; i < entity.vertices.length; i++) {
    if (entity.vertices[i].bulge) {
      bulge = entity.vertices[i].bulge;
      startPoint = entity.vertices[i];
      endPoint = i + 1 < entity.vertices.length ? entity.vertices[i + 1] : entity.vertices[0];
      bulgeGeometry = new BulgeGeometry(startPoint, endPoint, bulge);
      vertices.push(...bulgeGeometry.attributes.position.array);
    } else {
      const vertex = entity.vertices[i];
      vertices.push(vertex.x, vertex.y, 0);
    }
  }
  if (entity.shape) vertices.push(vertices[0], vertices[1], vertices[2]);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  if (entity.lineType) {
    lineType = data.tables.lineType.lineTypes[entity.lineType];
  }

  if (lineType && lineType.pattern && lineType.pattern.length !== 0) {
    material = new THREE.LineDashedMaterial({ color: color, gapSize: 1, dashSize: 2 });
  } else {
    material = new THREE.LineBasicMaterial({ linewidth: 1, color: color });
  }

  const line = new THREE.Line(geometry, material);
  return line;
}

function drawSpline(entity, data) {
  console.log("绘制样条曲线");
}

function drawArc(entity, data) {
  let endAngle, startAngle;
  if (entity.type === 'CIRCLE') {
    startAngle = entity.startAngle || 0;
    endAngle = startAngle + 2 * Math.PI;
  } else {
    startAngle = entity.startAngle;
    endAngle = entity.endAngle;
  }

  const curve = new THREE.ArcCurve(
    entity.center.x, entity.center.y,
    entity.radius,
    startAngle,
    endAngle);
  const points = curve.getPoints(32);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: getColor(entity, data) });
  const arc = new THREE.Line(geometry, material);
  return arc;
}

function drawBlock(entity, data, scene) {
  var block = data.blocks[entity.name];

  if (!block.entities) return null;

  var group = new THREE.Object3D()

  if (entity.xScale) group.scale.x = entity.xScale;
  if (entity.yScale) group.scale.y = entity.yScale;

  if (entity.rotation) {
    group.rotation.z = entity.rotation * Math.PI / 180;
  }

  if (entity.position) {
    group.position.x = entity.position.x;
    group.position.y = entity.position.y;
    group.position.z = entity.position.z;
  }

  for (var i = 0; i < block.entities.length; i++) {
    var childEntity = drawEntity(block.entities[i], data, group, scene);
    if (childEntity) group.add(childEntity);
  }

  return group;
}

function drawText(scene, entity, data, font) {

  if (!font) {
    console.warn('没有该字体');
    return;
  }
  // 创建文本几何体
  const geometry = new TextGeometry(entity.text, {
    font: font,
    depth: 0,
    curveSegments: entity.textHeight || 12,
    size: entity.textHeight || 12,
    bevelEnabled: false
  });

  // 创建材料并设置颜色
  const material = new THREE.MeshBasicMaterial({ color: getColor(entity, data) });

  // 创建网格并设置位置
  const text = new THREE.Mesh(geometry, material);

  // const position_X = normalize(entity.startPoint.x, 39476000, 39489000) * 6100; // Normalize x
  // const position_Y = normalize(entity.startPoint.y, 3849500, 3856000) * 3050; // Normalize y
  text.position.set(entity.startPoint.x, entity.startPoint.x, entity.startPoint.z);

  // text.scale.set(6100, 3050, 1000); // 放大
  // console.log(entity.text);
  // console.log(text);
  // scene.add(textMesh);
  return text;
}

function drawMtext(entity, data, font) {
  var color = getColor(entity, data);
  var str = entity.text.split("{").map(function (e) {
    var tex = e.split(";")
    return tex[tex.length - 1].replace("}", "")
  }).join(' ')
  if (!str) {
    // console.log(entity.text)
    str = entity.text
  }
  var rotate = 0
  if (entity.rotate) {
    rotate = entity.rotate
  }
  else {
    if (entity.tan) {
      rotate = Math.atan(entity.atan / entity.tan)
    }
  }

  // 使用正确导入的 TextGeometry
  var geometry = new TextGeometry(str, {
    font: font,
    size: entity.height * (4 / 5),
    curveSegments: 12,
    depth: 0
  });

  var material = new THREE.MeshBasicMaterial({ color: color });
  var text = new THREE.Mesh(geometry, material);

  var measure = new THREE.Box3();
  measure.setFromObject(text);

  var textWidth = measure.max.x - measure.min.x;

  if (textWidth > entity.width) {
    text.position.x = entity.position.x;
    text.position.y = entity.position.y;
  }

  text.position.z = 1000;
  text.rotation.z = rotate

  switch (entity.attachmentPoint) {
    case 1:
      // Top Left
      text.position.x = entity.position.x;
      text.position.y = entity.position.y - entity.height;
      break;
    case 2:
      // Top Center
      text.position.x = entity.position.x - textWidth / 2;
      text.position.y = entity.position.y - entity.height;
      break;
    case 3:
      // Top Right
      text.position.x = entity.position.x - textWidth;
      text.position.y = entity.position.y - entity.height;
      break;

    case 4:
      // Middle Left
      text.position.x = entity.position.x;
      text.position.y = entity.position.y - entity.height / 2;
      break;
    case 5:
      // Middle Center
      text.position.x = entity.position.x - textWidth / 2;
      text.position.y = entity.position.y - entity.height / 2;
      break;
    case 6:
      // Middle Right
      text.position.x = entity.position.x - textWidth;
      text.position.y = entity.position.y - entity.height / 2;
      break;

    case 7:
      // Bottom Left
      text.position.x = entity.position.x;
      text.position.y = entity.position.y;
      break;
    case 8:
      // Bottom Center
      text.position.x = entity.position.x - textWidth / 2;
      text.position.y = entity.position.y;
      break;
    case 9:
      // Bottom Right
      text.position.x = entity.position.x - textWidth;
      text.position.y = entity.position.y;
      break;

    default:
      return undefined;
  };

  return text;
}

function getColor(entity, data) {
  var color = 0x000000; //default
  if (entity.color) color = entity.color;
  else if (data.tables && data.tables.layer && data.tables.layer.layers[entity.layer])
    color = data.tables.layer.layers[entity.layer].color;

  if (color == null || color === 0xffffff) {
    color = 0x000000;
  }
  return color;
}

function renderGeometry(obj, layer_num, res_entities, scene) {
  // 遍历几何体的所有层并更新每种类型的数量
  if (!layer_num[obj.userData.type]) {
    layer_num[obj.userData.type] = 0; // 如果layer_num中没有该类型，初始化为0
  }
  layer_num[obj.userData.type]++; // 该类型数量加1

  // 根据几何体的类型进行处理 
  switch (obj.userData.type) {
    case "LINE":
    case "LWPOLYLINE":
    case "POLYLINE":

      // 处理线类型的几何体
      if (obj.userData.lineType && obj.userData.lineType.pattern && obj.userData.lineType.pattern.length !== 0) {
        // 如果几何体有线型模式，则不做处理
      } else {
        // 否则，将几何体的数据存储到res_entities中
        if (!res_entities[obj.userData.layer]) {
          res_entities[obj.userData.layer] = { points: [], colors: [], indices: [] }; // 初始化该层的数据
        }

        const positionArray = obj.geometry.attributes.position.array;
        // console.log(positionArray);
        for (let i = 0; i < positionArray.length; i += 3) {

          if (i == 0 || i == positionArray.length - 3) {
            res_entities[obj.userData.layer].indices.push(res_entities[obj.userData.layer].points.length / 3);
          } else {
            res_entities[obj.userData.layer].indices.push(res_entities[obj.userData.layer].points.length / 3, res_entities[obj.userData.layer].points.length / 3);
          }
          let position_X = normalize(positionArray[i], 39476000, 39489000); // Normalize x
          let position_Y = normalize(positionArray[i + 1], 3849500, 3856000); // Normalize y
          // 将顶点的x, y, z坐标推入points数组中
          res_entities[obj.userData.layer].points.push(position_X, position_Y, positionArray[i + 2]);
          // 将材质的颜色推入colors数组中
          res_entities[obj.userData.layer].colors.push(obj.material.color.r, obj.material.color.g, obj.material.color.b);
        }
        // 遍历几何体的顶点
        // obj.geometry.attributes.position.array.map(function (e, i) {
        //   // 根据顶点的位置，更新indices数组
        //   if (i == 0 || i == obj.geometry.attributes.position.array.length - 1) {
        //     res_entities[obj.userData.layer].indices.push(res_entities[obj.userData.layer].points.length / 3);
        //   } else {
        //     res_entities[obj.userData.layer].indices.push(res_entities[obj.userData.layer].points.length / 3, res_entities[obj.userData.layer].points.length / 3);
        //   }
        //   // 将顶点坐标存储到points数组中
        //   res_entities[obj.userData.layer].points.push(e.x, e.y, e.z);
        //   // 将顶点颜色存储到colors数组中
        //   res_entities[obj.userData.layer].colors.push(obj.material.color.r, obj.material.color.g, obj.material.color.b);
        // });
      }
      break;
    case "MTEXT":
    case "TEXT":
    case "CIRCLE":
    case "SOLID":
    case "ARC":
      // 处理文本和形状类型的几何体，直接添加到场景中
      scene.add(obj);
      break;
    default:
      // 对于未处理的类型，默认不做处理
      scene.add(obj);
      break;
  }
}


async function fetchHoleData() {
  try {
    const response = await fetch('csv/9煤层及预测9煤.csv');
    const data = await response.text();

    const parsedData = Papa.parse(data, {
      header: true,
      dynamicTyping: true
    }).data;
    return parsedData;
  } catch (error) {
    console.error("Error fetching hole data:", error);
  }
}

async function fetchTaiyuanData() {
  try {
    const response = await fetch('csv/太原组.csv');
    const data = await response.text();

    const parsedData = Papa.parse(data, {
      header: true,
      dynamicTyping: true
    }).data;
    return parsedData;
  } catch (error) {
    console.error("Error fetching hole data:", error);
  }
}

async function fetchShanxiData() {
  try {
    const response = await fetch('csv/山西组.csv');
    const data = await response.text();

    const parsedData = Papa.parse(data, {
      header: true,
      dynamicTyping: true
    }).data;
    return parsedData;
  } catch (error) {
    console.error("Error fetching hole data:", error);
  }
}

async function fetchXiashihrData() {
  try {
    const response = await fetch('csv/下石盒子.csv');
    const data = await response.text();

    const parsedData = Papa.parse(data, {
      header: true,
      dynamicTyping: true
    }).data;
    return parsedData;
  } catch (error) {
    console.error("Error fetching hole data:", error);
  }
}

// 三角剖分计算绘制顺序 ,返回值 return indices
function performDelaunay(vertices) {
  //取x,z坐标，存到points2D中，算出绘制顺序，用以三角剖分
  let points2D = [];
  for (let i = 0; i < vertices.length; i += 3) {
    points2D.push([vertices[i], vertices[i + 2]]);
  }

  const delaunay = d3.Delaunay.from(points2D);
  const triangles = new Uint32Array(delaunay.triangles);
  const indices = [];
  for (let i = 0; i < triangles.length; i += 3) {
    indices.push(triangles[i], triangles[i + 1], triangles[i + 2]);
  }
  return indices
}

// 将质心添加上去,返回值vertices
function addCentroidsToVertices(vertices, centroids) {
  centroids.forEach(centroid => {
    vertices.push(centroid[0], centroid[1], centroid[2]);
  });
  return vertices;
}

// 计算质心,返回值return centroids
function calculateCentroids(vertices, indices) {
  let centroids = [];
  for (let i = 0; i < indices.length; i += 3) {
    const v1 = indices[i] * 3;
    const v2 = indices[i + 1] * 3;
    const v3 = indices[i + 2] * 3;
    const centroid = [
      (vertices[v1] + vertices[v2] + vertices[v3]) / 3,
      (vertices[v1 + 1] + vertices[v2 + 1] + vertices[v3 + 1]) / 3,
      (vertices[v1 + 2] + vertices[v2 + 2] + vertices[v3 + 2]) / 3,
    ];
    centroids.push(centroid);
  }
  return centroids;
}

// 执行多次三角剖分
function TIN(verticeTop) {
  for (let i = 0; i < 7; i++) {
    let index = performDelaunay(verticeTop);
    let centroids = calculateCentroids(verticeTop, index);
    verticeTop = addCentroidsToVertices(verticeTop, centroids);
  }
  let indices = performDelaunay(verticeTop);
  return indices
}

//计算外围点扫描算法
function grahamScan(points) {
  points.sort((a, b) => a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]);
  const n = points.length;
  const lower = [];
  for (let i = 0; i < n; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
      lower.pop();
    }
    lower.push(points[i]);
  }
  const upper = [];
  for (let i = n - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
      upper.pop();
    }
    upper.push(points[i]);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

//创建组
async function createZhu(holeData, color) {
  let verticeTop = [], verticeBottom = [];
  const drillDataX = drillData.map(item => item[0]);
  const drillDataY = drillData.map(item => item[1]);
  const minX = Math.min(...drillDataX);
  const maxX = Math.max(...drillDataX);
  const minY = Math.min(...drillDataY);
  const maxY = Math.max(...drillDataY);

  const data = holeData.map(row => [row['Y'], row['X'], row['top'], row['bottom'], row['id']]);
  const filteredData = data.filter(row => row[0] != null || row[1] != null);

  const points = filteredData.map(row => [row[0], row[1]]);
  const hull = grahamScan(points);
  const boundaryData = hull.map(point => {
    const original = data.find(row => row[0] === point[0] && row[1] === point[1]);
    return { 'id': original[4], 'Y': point[0], 'X': point[1], 'top': original[2], 'bottom': original[3], };
  });

  const boundaryVertices = [];
  const boundaryIndices = [];

  boundaryData.forEach((v, i) => {
    const xNorm = ((v.X - minX) / (maxX - minX) * 7800 - 3900) * 0.9;
    const yNorm = ((v.Y - minY) / (maxY - minY) * 7800 - 3900) * 0.9;
    boundaryVertices.push(yNorm, -v.top * 3, xNorm);
    boundaryVertices.push(yNorm, -v.bottom * 3, xNorm);

    const nextIndex = (i + 1) % boundaryData.length;
    boundaryIndices.push(i * 2, nextIndex * 2, nextIndex * 2 + 1);
    boundaryIndices.push(nextIndex * 2 + 1, i * 2 + 1, i * 2);
  });

  for (let i = 0; i < holeData.length; i++) {
    let normX = (holeData[i].X - minX) / (maxX - minX) * 7800 - 3900;
    let normZ = (holeData[i].Y - minY) / (maxY - minY) * 7800 - 3900;
    verticeTop.push(normZ * 0.9, -holeData[i].top * 3, normX * 0.9);
    verticeBottom.push(normZ * 0.9, -holeData[i].bottom * 3, normX * 0.9);
  }

  const indicesTop = TIN(verticeTop);
  const indicesBottom = TIN(verticeBottom);

  const geometryTop = new THREE.BufferGeometry();
  geometryTop.setAttribute('position', new THREE.Float32BufferAttribute(verticeTop, 3));
  geometryTop.setIndex(indicesTop);
  geometryTop.computeVertexNormals();

  const geometryBottom = new THREE.BufferGeometry();
  geometryBottom.setAttribute('position', new THREE.Float32BufferAttribute(verticeBottom, 3));
  geometryBottom.setIndex(indicesBottom);
  geometryBottom.computeVertexNormals();

  const geometryBoundary = new THREE.BufferGeometry();
  geometryBoundary.setAttribute('position', new THREE.Float32BufferAttribute(boundaryVertices, 3));
  geometryBoundary.setIndex(boundaryIndices);
  geometryBoundary.computeVertexNormals();

  // 合并几何体
  let material = new THREE.MeshBasicMaterial({
    color: color,
  });
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries([geometryTop, geometryBottom, geometryBoundary]);
  const mergedMesh = new THREE.Mesh(mergedGeometry, material);
  return mergedMesh
}

export { initThree, createMesh, renderThree };
