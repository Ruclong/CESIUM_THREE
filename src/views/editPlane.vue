<template>
    <div>
        <div id="container"></div>
        <input type="range" id="timeRange" min="0" max="100" value="100">
        <div id="timeDisplay">当前时间: </div>
        <button class="expand" @click="expand">展开</button>
        <button class="collapse" @click="collapse">闭合</button>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';

import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js';
import { getQuakeResult } from '@/api/quakeResult.js';

import { workPlane, CreateTunnel, generateHeight, getColorAndSize } from './js/editPlane.js'

// 创建 TWEEN 组
const tweenGroup = new TWEEN.Group();

let quakeDots = [];
let quakeTimes = [];
let currentQuakeIndex = 0;

let container;
let camera, scene, renderer;
let plane, cube0, cube, cube2, cube3;

let depthTestEnabled = true; // 初始化深度检测状态为开启

onMounted(() => {
    init();
    animate();
});

async function init() {
    //基础场景设置
    basicInit();
    // 巷道
    await CreateTunnel(scene)
    // 工作面
    await workPlane(scene)
    // 创建地层
    CreateGroup()
    // 加载微震点
    await fetchQuakeResult()

    // 监听时间滚动条变化
    const timeRange = document.getElementById('timeRange');
    timeRange.addEventListener('input', function () {
        const value = parseFloat(timeRange.value);
        const timeDisplay = document.getElementById('timeDisplay'); // 显示时间的文本元素
        const startTime = new Date(quakeTimes[0]);
        const endTime = new Date(quakeTimes[quakeTimes.length - 1]);
        const totalTime = endTime - startTime; // 计算总时间差

        // 根据滚动条值来调整地震点显示情况
        const currentTime = new Date(startTime.getTime() + (totalTime * value / 100));
        // 使用toLocaleString()将时间转为本地格式
        const formattedTime = currentTime.toLocaleString('zh-CN', {
            hour12: false, // 24小时制
            timeZone: 'Asia/Shanghai' // 指定时区
        });

        // 更新时间显示
        timeDisplay.innerText = `当前时间: ${formattedTime}`;

        quakeDots.forEach((dot, index) => {
            if (new Date(quakeTimes[index]) < currentTime) {
                dot.material.opacity = 1;  // 显示
            } else {
                dot.material.opacity = 0;  // 隐藏
            }
        });
    });
}


//创建各个地层
function CreateGroup() {
    const loaderDDS = new DDSLoader();  // 创建 DDSLoader 加载器
    // 加载不同类型的 DDS 纹理
    const map5 = loaderDDS.load('texture/disturb_argb_nomip.dds');
    map5.minFilter = map5.magFilter = THREE.LinearFilter;
    map5.anisotropy = 4;
    map5.colorSpace = THREE.SRGBColorSpace;
    const material7 = new THREE.MeshBasicMaterial({ map: map5 });

    // 使用 TextureLoader 加载 JPG 纹理
    const loader = new THREE.TextureLoader();
    const texture = loader.load('texture/grasslight-big.jpg'); // 替换为你的 JPG 图片路径
    const textureLava = loader.load('texture/lavatile.jpg'); // 替换为你的 JPG 图片路径
    const textureYanshi = loader.load('texture/yanshi.jpg'); // 替换为你的 JPG 图片路径


    // 创建基础材质，使用加载的 JPG 纹理
    const materialTest = new THREE.MeshBasicMaterial({ map: texture });
    const materialLava = new THREE.MeshBasicMaterial({ map: textureLava });
    const materialYanshi = new THREE.MeshBasicMaterial({ map: textureYanshi });



    const data = generateHeight(1600, 800);
    // 地表
    const geometry = new THREE.PlaneGeometry(1600, 800, 1600 - 1, 800 - 1);
    geometry.rotateX(-Math.PI / 2);  // 旋转使平面平行于地面
    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
        vertices[j + 1] = data[i] * 0.2;
    }
    // const color = new THREE.Color(180 / 255, 134 / 255, 80 / 255); // 将 RGB 值转换为 0 到 1 之间的范围
    // const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    plane = new THREE.Mesh(geometry, materialTest);
    plane.position.set(0, 399, 0);  // 设置平面的位置
    scene.add(plane);

    // 地层0
    const geometryCube0 = new THREE.BoxGeometry(1600, 60, 800);  // 创建空几何体

    cube0 = new THREE.Mesh(geometryCube0, materialYanshi);
    cube0.position.set(0, 380, 0)
    scene.add(cube0);

    // 地层1
    // const vertices11 = [
    //     // 第一个面
    //     800, 50, 400,  // 顶点1
    //     800, 60, -400, // 顶点2
    //     800, -60, 400, // 顶点3

    //     // 800, -60, 400, // 顶点3
    //     // 800, 160, -400, // 顶点2
    //     800, -60, -400, // 顶点4

    //     // 第二个面
    //     -800, 1, -400, // 顶点5
    //     -800, 1, 400,  // 顶点6
    //     -800, -60, -400, // 顶点7

    //     // -800, -60, -400, // 顶点7
    //     // -800, 10, 400,  // 顶点6
    //     -800, -60, 400,  // 顶点8

    //     // 前面（+Z方向）
    //     800, 50, 400,    // 顶点1
    //     -800, 1, 400,   // 顶点6
    //     800, -60, 400,   // 顶点3

    //     // 800, -60, 400,   // 顶点3
    //     // -800, 10, 400,   // 顶点6
    //     -800, -60, 400,  // 顶点8

    //     // 背面（-Z方向）
    //     800, 60, -400,   // 顶点2
    //     -800, 1, -400,  // 顶点5
    //     800, -60, -400,  // 顶点4

    //     // 800, -60, -400,  // 顶点4
    //     // -800, 10, -400,  // 顶点5
    //     -800, -60, -400, // 顶点7

    //     // 顶面
    //     800, 50, 400,    // 顶点1
    //     -800, 1, 400,   // 顶点6
    //     800, 60, -400,   // 顶点2

    //     // 800, 160, -400,   // 顶点2
    //     // -800, 10, 400,   // 顶点6
    //     -800, 1, -400,  // 顶点5

    //     // 底面
    //     800, -60, 400,   // 顶点3
    //     -800, -60, 400,  // 顶点8
    //     800, -60, -400,  // 顶点4

    //     // 800, -60, -400,  // 顶点4
    //     // -800, -60, 400,  // 顶点8
    //     -800, -60, -400  // 顶点7
    // ];
    const geometryCube = new THREE.BoxGeometry(1600, 200, 800);
    // const verticesArray = new Float32Array(vertices11);

    // geometryCube.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));
    const materialCube = new THREE.MeshBasicMaterial({
        color: new THREE.Color(116 / 255, 190 / 255, 194 / 255),
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.8,
        wireframe: false
    });
    cube = new THREE.Mesh(geometryCube, materialCube);
    cube.position.set(0, 245, 0)
    scene.add(cube);

    // 地层2
    const geometryCube2 = new THREE.BoxGeometry(1600, 200, 800);  // 创建空几何体
    // 设置顶点数据
    // const materialCube2 = new THREE.MeshBasicMaterial({
    //     color: new THREE.Color(163 / 255, 128 / 255, 90 / 255),
    //     transparent: true,
    //     side: THREE.DoubleSide,
    //     opacity: 0.2,
    //     wireframe: false
    // });
    cube2 = new THREE.Mesh(geometryCube2, material7);
    cube2.position.set(0, 40, 0)
    scene.add(cube2);

    // 地层3
    const geometryCube3 = new THREE.BoxGeometry(1600, 340, 800);  // 创建空几何体
    // const materialCube3 = new THREE.MeshBasicMaterial({
    //     color: new THREE.Color(163 / 255, 0 / 255, 90 / 255),
    //     transparent: true,
    //     side: THREE.DoubleSide,
    //     opacity: 0.2,
    //     wireframe: false
    // });
    cube3 = new THREE.Mesh(geometryCube3, materialLava);
    cube3.position.set(0, -235, 0)
    scene.add(cube3);
}

async function fetchQuakeResult() {
    const quakeData = await getQuakeResult(); // 调用封装的 API 获取数据
    const data = quakeData.data;

    const processedData = data.map(item => ({
        X: item[0],
        Y: item[1],
        Z: item[2],
        energy: item[3],
        quaketime: item[4],
        quakelevel: item[5]
    })).slice(1);

    // console.log(processedData);
    // 获取X和Y的最大值最小值
    const X_values = processedData.map(quake => quake.X);
    const Y_values = processedData.map(quake => quake.Y);

    const minX = Math.min(...X_values);
    const maxX = Math.max(...X_values);
    const minY = Math.min(...Y_values);
    const maxY = Math.max(...Y_values);

    processedData.forEach(quake => {
        // 归一化X和Y
        const position_X = 2 * ((quake.X - minX) / (maxX - minX)) - 1;
        const position_Y = 2 * ((quake.Y - minY) / (maxY - minY)) - 1;
        const energy = quake.energy;
        const quakelevel = quake.quakelevel;

        let { color, size } = getColorAndSize(energy, quakelevel);

        // 添加离散点
        const dotGeometry = new THREE.SphereGeometry(size, 12, 12);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
            depthTest: true  // 关闭深度检测 
        });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.set(position_X * 800, quake.Z * 0.6 + 390, position_Y * 300);

        scene.add(dot);
        quakeDots.push(dot);
        quakeTimes.push(quake.quaketime);

    })
    // console.log(quakeTimes);
    // 启动展示动画
    showQuakesWithTween();
}

function showQuakesWithTween() {
    if (currentQuakeIndex >= quakeDots.length) {
        return;  // 如果所有点都展示完毕
    }

    const dot = quakeDots[currentQuakeIndex];
    const startTime = new Date(quakeTimes[0]);
    const endTime = new Date(quakeTimes[quakeDots.length - 1]);
    const totalTime = endTime - startTime;

    // 获取滑动条和时间显示元素
    const timeRange = document.getElementById('timeRange');
    const timeDisplay = document.getElementById('timeDisplay');

    new TWEEN.Tween(dot.material, tweenGroup)
        .to({ opacity: 1 }, 10)  // 0.1 秒内让点的透明度变为 1（完全可见）
        .onUpdate(() => {
            // 根据当前微震点的时间更新显示
            const currentTime = new Date(startTime.getTime() + (totalTime * currentQuakeIndex / quakeDots.length));

            // 使用 toLocaleString() 将时间转为本地格式
            const formattedTime = currentTime.toLocaleString('zh-CN', {
                hour12: false, // 24小时制
                timeZone: 'Asia/Shanghai' // 指定时区
            });

            // 更新显示时间
            timeDisplay.innerText = `当前时间: ${formattedTime}`;

            // 计算当前时间在总时间中的百分比，更新进度条
            const progress = (currentQuakeIndex / quakeDots.length) * 100;
            timeRange.value = progress;
        })
        .onComplete(() => {
            currentQuakeIndex++;
            showQuakesWithTween();  // 展示下一个点
        })
        .start();
}

// 展开
function expand() {
    // 关闭深度检测
    depthTestEnabled = false;
    updateDotMaterials();
    new TWEEN.Tween(plane.position, tweenGroup)
        .to({ y: 600 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube0.position, tweenGroup)
        .to({ y: 600 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube.position, tweenGroup)
        .to({ y: 250 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube2.position, tweenGroup)
        .to({ y: -180 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube3.position, tweenGroup)
        .to({ y: -600 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

//闭合
function collapse() {
    // 打开深度检测
    depthTestEnabled = true;
    updateDotMaterials();
    new TWEEN.Tween(plane.position, tweenGroup)
        .to({ y: 399 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube0.position, tweenGroup)
        .to({ y: 380 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube.position, tweenGroup)
        .to({ y: 245 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube2.position, tweenGroup)
        .to({ y: 40 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(cube3.position, tweenGroup)
        .to({ y: -235 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

// 更新所有地震点材质的深度检测状态
function updateDotMaterials() {
    quakeDots.forEach(dot => {
        dot.material.depthTest = depthTestEnabled; // 根据状态更新深度检测
        dot.material.needsUpdate = true; // 确保材质更新
    });
}

function basicInit() {
    container = document.getElementById('container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 正交相机
    // const aspect = window.innerWidth / window.innerHeight;
    // const frustumSize = 1000;
    // camera =new THREE.OrthographicCamera(
    //     (frustumSize * aspect) / -2,
    //     (frustumSize * aspect) / 2,
    //     frustumSize / 2,
    //     frustumSize / -2,
    //     1,
    //     10000
    // );

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


    // 创建一个立方体几何体和材质
    const geometry = new THREE.BoxGeometry(1600, 800, 800);
    const color = new THREE.Color(255 / 255, 255 / 255, 229 / 255); // 将 RGB 值转换为 0 到 1 之间的范围

    const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 });
    const cube = new THREE.Mesh(geometry, material);
    const box = new THREE.BoxHelper(cube, 0x708090);
    scene.add(box);
}

function animate() {
    requestAnimationFrame(animate);
    tweenGroup.update();
    render();
}

function render() {
    renderer.render(scene, camera);
}

</script>

<style scoped>
body {
    background-color: #f0f0f0;
    color: #444;
}

button.expand,
button.collapse {
    position: absolute;
    left: 20px;
    top: 20px;
    margin: 10px;
    padding: 10px 20px;
    background-color: #4CAF50;
    /* 绿色背景 */
    color: white;
    /* 白色字体 */
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button.collapse {
    top: 60px;
    /* 间隔 */
}

button.expand:hover,
button.collapse:hover {
    background-color: #45a049;
    /* 鼠标悬停时的颜色 */
}

#timeRange {
    position: absolute;
    top: 25px;
    left: 10%;
    width: 80%;
}

#timeDisplay {
    position: absolute;
    top: 5px;
    left: 10%;
    width: 80%;
}

#container {
    width: 100%;
    height: 100vh;
    display: block;
    overflow: hidden;
    position: relative;
}
</style>