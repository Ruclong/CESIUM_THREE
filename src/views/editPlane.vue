<template>
    <div>
        <div id="container"></div>
        <div id="coords" style="position: absolute; top: 10px; left: 10px; color: #444; font-size: 16px;">
            经度: 0,纬度: 0,高度: 0
        </div>
        <button style="position: absolute; top: 10px; right: 10px; color: #444; font-size: 16px;" @click="saveGeometry">
            <b> 保存场景</b>
        </button>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DXFtoThreeAll, DXFtoThree } from '../three/three_cad';
import { denormalize } from '../three/Utils';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';


// 创建一个 Map 来按材质存储几何体
const materialGeometriesMap = new Map();
let selectedObject = null; // 存储当前选中的对象

let container;
let camera, scene, renderer;
let HelperObjects = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const onUpPosition = new THREE.Vector2();
const onDownPosition = new THREE.Vector2();
let transformControl;
let mergedGeometry; // 合并后几何体

onMounted(() => {
    init();

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointermove', onPointerMove);
});

async function init() {
    //基础场景设置
    basicInit();

    // 22910工作面
    const dxf_22910 = await DXFtoThree();
    // console.log(dxf_22910);

    // 将工作面平移到原点
    dxf_22910.forEach(lineSegment => {
        // console.log(lineSegment);
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
    materialGeometriesMap.forEach((geometries, material) => {
        // 合并几何体
        mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, true);

        // 创建新的 LineSegments 对象
        const mergedLineSegments = new THREE.LineSegments(mergedGeometry, material);

        // 应用平移、缩放和旋转变换
        mergedLineSegments.position.set(1300, 0, 120);
        mergedLineSegments.scale.set(6100, 3050, 1);
        mergedLineSegments.rotateX(Math.PI / 2);

        // 将合并后的 LineSegments 添加到场景
        scene.add(mergedLineSegments);
        // console.log(mergedGeometry);
        // 显示几何体所有点并创建修改Y值的UI
        displayPoints(mergedGeometry);
    });

    render();
}

function saveGeometry() {
    const strplace = mergedGeometry.attributes.position.array;
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

function displayPoints(mergedGeometry) {
    // 取出合并后的所有点
    const positions = mergedGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        let vertices = [];

        // 提取X, Y, Z坐标
        vertices.push(positions[i]);   // X
        vertices.push(positions[i + 1]); // Y
        vertices.push(positions[i + 2]); // Z

        // console.log(positions);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({ color: 0xff0000, size: 2 });

        const object = new THREE.Points(geometry, material);

        // 应用平移、缩放和旋转变换
        object.position.set(1300, 0, 120);
        object.scale.set(6100, 3050, 1);
        object.rotateX(Math.PI / 2);
        // console.log(object);
        scene.add(object);
        HelperObjects.push(object);
    }

}

function render() {
    renderer.render(scene, camera);
}

function updateCoords() {
    const object = transformControl.object;
    if (object) {
        const objectPos = object.geometry.attributes.position.array
        console.log(objectPos);

        const originalX = denormalize(objectPos[0], 39476000, 39489000)
        const originalZ = denormalize(objectPos[1], 3849500, 3856000)
        const coordsDiv = document.getElementById('coords');
        coordsDiv.innerHTML = `经度: ${originalX.toFixed(3)}, 纬度: ${originalZ.toFixed(3)}, 高度:<input type="number" id="y-input" step="1" value=${objectPos[2].toFixed(3)}> `;

        const Input = document.getElementById('y-input');
        Input.addEventListener('change', function () {
            objectPos[2] = parseFloat(-Input.value); // 更新当前对象的 Y 位置
            object.geometry.attributes.position.needsUpdate = true;
            // 更新 mergedGeometry 中的对应位置
            const index = HelperObjects.indexOf(object);
            //console.log(index);

            if (index >= 0) {
                const mergedPositions = mergedGeometry.attributes.position.array;
                mergedPositions[index * 3] = objectPos[0];
                mergedPositions[index * 3 + 1] = objectPos[1];
                mergedPositions[index * 3 + 2] = objectPos[2];
                mergedGeometry.attributes.position.needsUpdate = true; // 通知 Three.js 更新几何体位置
            }

            render(); // 重新渲染场景

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

        if (object !== transformControl.object) {
            transformControl.attach(object);
            updateCoords();
            // 恢复上一个选中的对象的颜色
            if (selectedObject) {
                selectedObject.material.color.set(0xff0000); // 恢复为红色
            }
            // 将当前对象变为绿色
            object.material.color.set(0x00ff00);
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
    camera.position.set(0, 1000, 1000);
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

    // 添加 XYZ 辅助轴
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    // 创建网格辅助线
    const helper = new THREE.GridHelper(2000, 50);
    helper.position.y = 0;
    helper.material.opacity = 0.25;
    helper.material.transparent = true;
    scene.add(helper);
}
</script>

<style scoped>
body {
    background-color: #f0f0f0;
    color: #444;
}

a {
    color: #08f;
}
</style>