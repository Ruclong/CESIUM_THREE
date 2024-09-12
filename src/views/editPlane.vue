<template>
    <div>
        <div id="container"></div>
        <div id="coords" class="coords-display">
            经度: 0, 纬度: 0, 高度: 0
        </div>
        <button class="save-button" @click="saveGeometry">
            保存场景
        </button>
        <!-- 表格来展示所有点的信息 -->
        <div style="position: absolute; top: 50px; left: 10px; max-height: 300px; overflow-y: scroll; opacity: 0;">
            <table border="1">
                <thead>
                    <tr>
                        <th>索引</th>
                        <th>X</th>
                        <th>Y</th>
                        <th>Z</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(vertex, index) in vertices" :key="vertex.id"
                        :class="{ 'highlight': selectedIndex === index }">
                        <td>{{ index + 1 }}</td>
                        <td>{{ vertex.x.toFixed(3) }}</td>
                        <td>{{ vertex.y.toFixed(3) }}</td>
                        <td>{{ vertex.z.toFixed(3) }}</td>
                    </tr>

                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { FetchOutLine } from '../three/three_cad';
import { DrawTunnel } from '../three/edit';
import { denormalize } from '../three/Utils';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { grahamScan, TIN } from '../three/Utils'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';


// 创建一个 Map 来按材质存储几何体
const materialGeometriesMap = new Map();
let selectedObject = null; // 存储当前选中的对象
let container;
let camera, scene, renderer;
let HelperObjects = [];

//用于表格渲染
const vertices = ref([]); // 用于存储点信息
const selectedIndex = ref(-1);  // 默认-1表示没有选中任何对象

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const onUpPosition = new THREE.Vector2();
const onDownPosition = new THREE.Vector2();
let transformControl;
let geometryTop, geometryBottom, sideGeometry; // 合并后几何体

onMounted(() => {
    init();

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointermove', onPointerMove);
});

async function init() {
    //基础场景设置
    basicInit();

    // 巷道
    const Tunnels = await DrawTunnel()
    // console.log(Tunnels);

    CreateLine(Tunnels)

    // 22910工作面
    const dxf_22910 = await FetchOutLine();
    dxf_22910.forEach(lineSegment => {
        // 更新几何体的世界矩阵
        lineSegment.updateMatrix();
        // 获取当前几何体
        const geometry = lineSegment.geometry.clone().applyMatrix4(lineSegment.matrix);
        // 获取当前材质
        const material = lineSegment.material;
        // 如果该材质已有存储的几何体，添加到数组，否则创建一个新的数组
        if (!materialGeometriesMap.has(material)) {
            materialGeometriesMap.set(material, []);
        }
        materialGeometriesMap.get(material).push(geometry);
    });

    // 遍历材质-几何体对，合并几何体
    materialGeometriesMap.forEach((geometries) => {
        // 合并几何体
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);
        //几何体中所有点信息
        const mergedPoints = mergedGeometry.attributes.position.array;

        let verticeTop = []

        /**  
         * 数据处理,格式化
         * 取外围点
        */
        let Outvertices = []
        for (let i = 0; i < mergedPoints.length; i += 3) {
            const vertex = {
                X: mergedPoints[i],
                Y: mergedPoints[i + 1],
                altitude: mergedPoints[i + 2],
                bottom: 0
            };
            Outvertices.push(vertex);
        }
        const data = Outvertices.map(row => [row['X'], row['Y'], row['altitude'], row['bottom']]);
        const points = data.map(row => [row[0], row[1]]);
        const hull = grahamScan(points);
        for (let i = 0; i < hull.length; i++) {
            verticeTop.push(...hull[i], 0)
        }

        /**
         *根据外围点信息，连接生成面
          生成形状对象
        */
        const shape = new THREE.Shape();
        shape.moveTo(verticeTop[0], verticeTop[1]);
        for (let i = 3; i < verticeTop.length; i += 3) {
            shape.lineTo(verticeTop[i], verticeTop[i + 1]);
        }
        // 确保闭合路径
        shape.lineTo(verticeTop[0], verticeTop[1]);
        const arry = [
            -0.27815383672714233, -0.11492307484149933, 40,
            -0.2769230902194977, -0.1143076941370964, 36,
            -0.16861538589000702, -0.048692308366298676, 49,
            -0.11630769073963165, -0.016307692974805832, 50,
            -0.11569231003522873, -0.01592307724058628, 50,
            -0.1120000034570694, -0.013461538590490818, 55,
            -0.11076922714710236, -0.011384615674614906, 65,
            -0.1156923100352287, -0.0037692307960242033, 25,
            -0.12123076617717743, 0.00469230767339468, -5,
            -0.1316923052072525, 0.020384615287184715, -53,
            -0.1341538429260254, 0.022923076525330544, -77,
            -0.14523077011108398, 0.02515384554862976, -58,
            -0.14646153151988983, 0.02500000037252903, -60,
            -0.27261537313461304, -0.05000000074505806, -58,
            -0.29046154022216797, -0.06530769169330597, -37,
            -0.29046154022216797, -0.06715384870767593, -29,
            -0.2793846130371094, -0.11246153712272644, 32,
            -0.27876922488212585, -0.1138461530208587, 35
        ]
        geometryTop = new THREE.ShapeGeometry(shape);
        geometryTop.setAttribute('position', new THREE.Float32BufferAttribute(arry, 3));

        const materialTest = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, side: THREE.DoubleSide, opacity: 0.5 });
        const MeshTop = new THREE.Mesh(geometryTop, materialTest);
        // 应用平移、缩放和旋转变换
        MeshTop.position.set(1600, 10, 120);
        MeshTop.scale.set(8000, 4000, 1);
        MeshTop.rotateX(Math.PI / 2);

        geometryBottom = geometryTop.clone();
        const MeshBottom = new THREE.Mesh(geometryBottom, materialTest);
        // 应用平移、缩放和旋转变换
        MeshBottom.position.set(1600, -10, 120);
        MeshBottom.scale.set(8000, 4000, 1);
        MeshBottom.rotateX(Math.PI / 2);
        // console.log('底部', geometryTop);

        scene.add(MeshTop, MeshBottom);
        createSides(geometryTop, geometryBottom);

    });
    // 显示顶点
    displayPoints(geometryTop, [1300, 10, 120], 0xff0000);
    displayPoints(geometryBottom, [1300, -10, 120], 0xff0000);
    CreateGroup()
    render();
}

function CreateGroup() {
    const data = generateHeight(1600, 800);
    // 创建1600x800的平面几何体
    const geometry = new THREE.PlaneGeometry(1600, 800, 1600 - 1, 800 - 1);
    geometry.rotateX(-Math.PI / 2);  // 旋转使平面平行于地面
    const vertices = geometry.attributes.position.array;

    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
        vertices[j + 1] = data[i] * 0.2;
    }
    const color = new THREE.Color(180 / 255, 134 / 255, 80 / 255); // 将 RGB 值转换为 0 到 1 之间的范围
    // 创建材质
    const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    // 创建网格
    const plane = new THREE.Mesh(geometry, material);
    // 设置平面的位置和旋转
    plane.position.set(0, 399, 0);  // 设置平面的位置
    // 将平面添加到场景
    scene.add(plane);

    // 创建一个立方体几何体和材质

    const vertices11 = [
        // 第一个面
        800, 50, 400,  // 顶点1
        800, 60, -400, // 顶点2
        800, -60, 400, // 顶点3

        // 800, -60, 400, // 顶点3
        // 800, 160, -400, // 顶点2
        800, -60, -400, // 顶点4

        // 第二个面
        -800, 1, -400, // 顶点5
        -800, 1, 400,  // 顶点6
        -800, -60, -400, // 顶点7

        // -800, -60, -400, // 顶点7
        // -800, 10, 400,  // 顶点6
        -800, -60, 400,  // 顶点8

        // 前面（+Z方向）
        800, 50, 400,    // 顶点1
        -800, 1, 400,   // 顶点6
        800, -60, 400,   // 顶点3

        // 800, -60, 400,   // 顶点3
        // -800, 10, 400,   // 顶点6
        -800, -60, 400,  // 顶点8

        // 背面（-Z方向）
        800, 60, -400,   // 顶点2
        -800, 1, -400,  // 顶点5
        800, -60, -400,  // 顶点4

        // 800, -60, -400,  // 顶点4
        // -800, 10, -400,  // 顶点5
        -800, -60, -400, // 顶点7

        // 顶面
        800, 50, 400,    // 顶点1
        -800, 1, 400,   // 顶点6
        800, 60, -400,   // 顶点2

        // 800, 160, -400,   // 顶点2
        // -800, 10, 400,   // 顶点6
        -800, 1, -400,  // 顶点5

        // 底面
        800, -60, 400,   // 顶点3
        -800, -60, 400,  // 顶点8
        800, -60, -400,  // 顶点4

        // 800, -60, -400,  // 顶点4
        // -800, -60, 400,  // 顶点8
        -800, -60, -400  // 顶点7
    ];
    const geometryCube = new THREE.BoxGeometry();  // 创建空几何体
    const verticesArray = new Float32Array(vertices11);  // 创建顶点数组

    // 设置顶点数据
    geometryCube.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));
    const materialCube = new THREE.MeshBasicMaterial({
        color: new THREE.Color(116 / 255, 190 / 255, 194 / 255),
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.8,
        wireframe: false
    });
    const cube = new THREE.Mesh(geometryCube, materialCube);
    cube.position.set(0, 200, 0)
    scene.add(cube);

    const geometryCube2 = new THREE.BoxGeometry(1600, 200, 800);  // 创建空几何体
    // 设置顶点数据
    const materialCube2 = new THREE.MeshBasicMaterial({
        color: new THREE.Color(163 / 255, 128 / 255, 90 / 255),
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.2,
        wireframe: false
    });
    const cube2 = new THREE.Mesh(geometryCube2, materialCube2);
    cube2.position.set(0, 40, 0)
    scene.add(cube2);

    const geometryCube3 = new THREE.BoxGeometry(1600, 340, 800);  // 创建空几何体
    // 设置顶点数据
    const materialCube3 = new THREE.MeshBasicMaterial({
        color: new THREE.Color(163 / 255, 0 / 255, 90 / 255),
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.2,
        wireframe: false
    });
    const cube3 = new THREE.Mesh(geometryCube3, materialCube3);
    cube3.position.set(0, -235, 0)
    scene.add(cube3);

}

function generateHeight(width, height) {

    const size = width * height, data = new Uint8Array(size),
        perlin = new ImprovedNoise(), z = Math.random() * 100;

    let quality = 1;

    for (let j = 0; j < 4; j++) {

        for (let i = 0; i < size; i++) {

            const x = i % width, y = ~ ~(i / width);
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);

        }

        quality *= 5;

    }

    return data;

}

function CreateLine(GeometryLine) {
    GeometryLine.forEach(lineSegment => {

        if (lineSegment) {
            const posArray = lineSegment.geometry.attributes.position.array;
            const lineGeometry = new LineGeometry();
            lineGeometry.setPositions(posArray);
            // displayPoints(lineGeometry, [1300, 200, 120], 0xffff00);
            const lineMaterial = new LineMaterial({
                color: 0x5f5f5f,
                linewidth: 3,
            });

            const mergedLineSegments = new Line2(lineGeometry, lineMaterial);

            mergedLineSegments.position.set(-500, 1300, -400);
            mergedLineSegments.scale.set(1, 1, 2);
            mergedLineSegments.rotateX(Math.PI / 2);
            scene.add(mergedLineSegments)
        }

    });


}

function createSides(geometryTop, geometryBottom) {
    const sideVertices = [];
    const topVertices = geometryTop.attributes.position.array;
    const bottomVertices = geometryBottom.attributes.position.array;

    for (let i = 0; i < topVertices.length; i += 3) {
        const nextI = (i + 3) % topVertices.length;

        // 获取四个顶点
        const topVertex1 = new THREE.Vector3(topVertices[i], topVertices[i + 1], topVertices[i + 2] + 10);
        const topVertex2 = new THREE.Vector3(topVertices[nextI], topVertices[nextI + 1], topVertices[nextI + 2] + 10);
        const bottomVertex1 = new THREE.Vector3(bottomVertices[i], bottomVertices[i + 1], bottomVertices[i + 2] - 10);
        const bottomVertex2 = new THREE.Vector3(bottomVertices[nextI], bottomVertices[nextI + 1], bottomVertices[nextI + 2] - 10);

        // 按照逆时针顺序插入顶点，形成两个三角面
        sideVertices.push(
            topVertex1.x, topVertex1.y, topVertex1.z,
            bottomVertex2.x, bottomVertex2.y, bottomVertex2.z,
            topVertex2.x, topVertex2.y, topVertex2.z,

            topVertex1.x, topVertex1.y, topVertex1.z,
            bottomVertex1.x, bottomVertex1.y, bottomVertex1.z,
            bottomVertex2.x, bottomVertex2.y, bottomVertex2.z
        );
    }

    const sideGeometry = new THREE.BufferGeometry();
    sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sideVertices, 3));

    // 使用双面材质以确保正确渲染
    const sideMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, side: THREE.DoubleSide, opacity: 0.5 });
    const sideMesh = new THREE.Mesh(sideGeometry, sideMaterial);

    sideMesh.position.set(1600, 0, 120);
    sideMesh.scale.set(8000, 4000, 1);
    sideMesh.rotateX(Math.PI / 2);

    scene.add(sideMesh);
}

function displayPoints(Geometrys, positionOffset, color) {
    const positions = Geometrys.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        const vertex = {
            x: positions[i],
            y: positions[i + 1],
            z: positions[i + 2]
        };
        vertices.value.push(vertex);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([vertex.x, vertex.y, vertex.z], 3));

        const material = new THREE.PointsMaterial({ color: color, size: 1 });

        const object = new THREE.Points(geometry, material);

        // 应用平移、缩放和旋转变换
        object.position.set(...positionOffset);
        object.scale.set(8000, 4000, 1);
        object.rotateX(Math.PI / 2);
        scene.add(object);
        HelperObjects.push(object);
    }
}

function render() {
    renderer.render(scene, camera);
}

// 更新并显示当前选中对象的坐标
function updateCoords() {
    const object = transformControl.object;

    if (object) {
        const objectPos = object.geometry.attributes.position.array
        // console.log(objectPos);

        const originalX = denormalize(objectPos[0], 39476000, 39489000)
        const originalZ = denormalize(objectPos[1], 3849500, 3856000)
        const coordsDiv = document.getElementById('coords');
        coordsDiv.innerHTML = `经度: ${originalX.toFixed(3)}, 纬度: ${originalZ.toFixed(3)}, 高度:<input type="number" id="y-input" step="1" value=${objectPos[2].toFixed(3)}> `;

        const Input = document.getElementById('y-input');
        Input.addEventListener('change', function () {
            objectPos[2] = parseFloat(Input.value); // 更新当前对象的 Y 位置
            object.geometry.attributes.position.needsUpdate = true;

            // 更新 几何体 中的对应位置
            const index = HelperObjects.indexOf(object);
            console.log('目标索引：', index);

            if (index <= 18) {
                let mergedPositions = geometryTop.attributes.position.array;
                mergedPositions[index * 3] = objectPos[0];
                mergedPositions[index * 3 + 1] = objectPos[1];
                mergedPositions[index * 3 + 2] = objectPos[2];
                geometryTop.attributes.position.needsUpdate = true; //更新几何体位置

            } else {
                const num = index % 18
                let BottomPositions = geometryBottom.attributes.position.array;
                BottomPositions[num * 3] = objectPos[0];
                BottomPositions[num * 3 + 1] = objectPos[1];
                BottomPositions[num * 3 + 2] = objectPos[2];
                geometryBottom.attributes.position.needsUpdate = true; //更新几何体位置

            }
            // console.log(sideGeometry.attributes.position);

            // sideGeometry.attributes.position.needsUpdate = true;

            // render(); // 重新渲染场景

        });
    }
}

function onPointerDown(event) {
    onDownPosition.x = event.clientX;
    onDownPosition.y = event.clientY;
}

function onPointerUp(event) {
    onUpPosition.x = event.clientX;
    onUpPosition.y = event.clientY;

    if (onDownPosition.distanceTo(onUpPosition) === 0) {
        transformControl.detach();
        render();
    }
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(HelperObjects, false);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        // 更新选中的对象
        selectedIndex.value = HelperObjects.indexOf(object);
        if (object !== transformControl.object) {
            transformControl.attach(object);
            updateCoords();
            // 恢复上一个选中的对象的颜色
            if (selectedObject) {
                selectedObject.material.color.set(0xff0000); // 恢复为红色
            }
            // 将当前对象变为绿色
            object.material.color.set(0x00ffff);
            // 更新选中的对象
            selectedObject = object;
        }
    }
}

function basicInit() {
    container = document.getElementById('container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 200, 1500);
    scene.add(camera);

    scene.add(new THREE.AmbientLight(0xf0f0f0, 3));

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.damping = 0.2;
    controls.addEventListener('change', render);

    transformControl = new TransformControls(camera, renderer.domElement);
    transformControl.addEventListener('change', render);
    transformControl.size = 0.2
    transformControl.addEventListener('dragging-changed', function (event) {
        controls.enabled = !event.value;
    });
    scene.add(transformControl);

    transformControl.showX = false;
    transformControl.showY = false;
    transformControl.showZ = false;
    transformControl.addEventListener('objectChange', updateCoords);

    // 创建网格辅助线
    const helper = new THREE.GridHelper(2000, 50);
    helper.position.y = 0;
    helper.material.opacity = 0.25;
    helper.material.transparent = true;
    // scene.add(helper);

    // 创建一个立方体几何体和材质
    const geometry = new THREE.BoxGeometry(1600, 800, 800);
    const color = new THREE.Color(255 / 255, 255 / 255, 229 / 255); // 将 RGB 值转换为 0 到 1 之间的范围

    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 });
    const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    const box = new THREE.BoxHelper(cube, 0x708090);
    scene.add(box);
}

function saveGeometry() {
    const strplace = geometryTop.attributes.position.array;
    const formattedPositions = [];
    // const originalX = 
    // const originalZ = 
    for (let i = 0; i < strplace.length; i += 3) {
        // 每三个数据表示一个点的 x, y, z
        const x = denormalize(strplace[i].toFixed(3), 39476000, 39489000);
        const z = denormalize(strplace[i + 1].toFixed(3), 3849500, 3856000);
        const h = strplace[i + 2].toFixed(3);

        // 格式化输出为 "x= , y= , z= "
        const formattedPosition = `x= ${x}, z= ${z},h= ${h}`;
        formattedPositions.push(formattedPosition);
    }

    // 将所有位置格式化为字符串
    const code = '[' + (formattedPositions.join(',\n\t')) + ']';

    // 输出到控制台
    console.log(formattedPositions.join(',\n'));

    // 通过 prompt 弹出框显示可复制的代码
    prompt('保存高度信息', code);
}

</script>

<style scoped>
.highlight {
    background-color: yellow;
    /* 高亮颜色设置为黄色 */
}

body {
    background-color: #f0f0f0;
    color: #444;
}

a {
    color: #08f;
}

.coords-display {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(230, 230, 225, 0.86);
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 14px;
    color: #000;
    z-index: 1;
}

.save-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #4caf50;
    color: #fff;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 1;
}

.save-button:hover {
    background: #45a049;
}

#container {
    width: 100%;
    height: 100vh;
    display: block;
    overflow: hidden;
    position: relative;
}
</style>