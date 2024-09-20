<template>
        <div id="container"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import * as THREE from 'three/tsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mx_noise_float, color, cross, dot, float, modelNormalMatrix, positionLocal, sign, step, Fn, uniform, varying, vec2, vec3, Loop } from 'three/tsl';

// 创建 TWEEN 组
let camera, scene, renderer, controls, container;
onMounted(() => {
    init();
});

function init() {
    // 设置相机
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(- 10, 8, - 2.2);

    // 创建场景并设置背景颜色
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x201919);

    // 创建地形材质
    const material = new THREE.MeshStandardMaterial({
        metalness: 0,
        roughness: 0.5,
        color: '#85d534'
    });

    // 定义地形相关的变量
    const noiseIterations = uniform(3);
    const positionFrequency = uniform(0.175);
    const warpFrequency = uniform(6);
    const warpStrength = uniform(1);
    const strength = uniform(10);
    const offset = uniform(vec2(0, 0));
    const normalLookUpShift = uniform(0.01);
    const colorSand = uniform(color('#ffe894'));
    const colorGrass = uniform(color('#85d534'));
    const colorSnow = uniform(color('#ffffff'));
    const colorRock = uniform(color('#bfbd8d'));

    // 定义法线和位置的变化量
    const vNormal = varying(vec3());
    const vPosition = varying(vec3());

    // 生成地形的高程函数
    const terrainElevation = Fn(([position]) => {
        const warpedPosition = position.add(offset).toVar();
        warpedPosition.addAssign(mx_noise_float(warpedPosition.mul(positionFrequency).mul(warpFrequency), 1, 0).mul(warpStrength));
        const elevation = float(0).toVar();
        Loop({ type: 'float', start: float(1), end: noiseIterations.toFloat(), condition: '<=' }, ({ i }) => {
            const noiseInput = warpedPosition.mul(positionFrequency).mul(i.mul(2)).add(i.mul(987));
            const noise = mx_noise_float(noiseInput, 1, 0).div(i.add(1).mul(2));
            elevation.addAssign(noise);
        });
        const elevationSign = sign(elevation);
        elevation.assign(elevation.abs().pow(2).mul(elevationSign).mul(strength));
        return elevation;
    });

    // 生成地形的位置信息
    material.positionNode = Fn(() => {
        const neighbourA = positionLocal.xyz.add(vec3(normalLookUpShift, 0.0, 0.0)).toVar();
        const neighbourB = positionLocal.xyz.add(vec3(0.0, 0.0, normalLookUpShift.negate())).toVar();

        // 计算高程
        const position = positionLocal.xyz.toVar();
        const elevation = terrainElevation(positionLocal.xz);
        position.y.addAssign(elevation);
        neighbourA.y.addAssign(terrainElevation(neighbourA.xz));
        neighbourB.y.addAssign(terrainElevation(neighbourB.xz));

        // 计算法线
        const toA = neighbourA.sub(position).normalize();
        const toB = neighbourB.sub(position).normalize();
        vNormal.assign(cross(toA, toB));

        // 传递位置信息
        vPosition.assign(position.add(vec3(offset.x, 0, offset.y)));
        return position;
    })();

    // 设置材质的法线和颜色
    material.normalNode = modelNormalMatrix.mul(vNormal);
    material.colorNode = Fn(() => {
        const finalColor = colorSand.toVar();
        const grassMix = step(-0.06, vPosition.y);
        finalColor.assign(grassMix.mix(finalColor, colorGrass));
        const rockMix = step(0.5, dot(vNormal, vec3(0, 1, 0))).oneMinus().mul(step(-0.06, vPosition.y));
        finalColor.assign(rockMix.mix(finalColor, colorRock));
        const snowThreshold = mx_noise_float(vPosition.xz.mul(25), 1, 0).mul(0.1).add(0.45);
        const snowMix = step(snowThreshold, vPosition.y);
        finalColor.assign(snowMix.mix(finalColor, colorSnow));
        return finalColor;
    })();

    // 创建地形网格
    const geometry = new THREE.PlaneGeometry(10, 10, 500, 500);
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('normal');
    geometry.rotateX(-Math.PI * 0.5);

    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    scene.add(terrain);
    basicSet();



}

function basicSet() {
    container = document.getElementById('container');

    // 渲染器
    renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    container.appendChild(renderer.domElement);


    // 控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.target.y = -0.5;
    controls.enableDamping = true;
    controls.minDistance = 0.1;
    controls.maxDistance = 50;

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // 添加方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // 监听窗口调整大小事件
    window.addEventListener('resize', onWindowResize);
}

// 窗口调整大小时更新相机和渲染器
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 动画循环
async function animate() {
    controls.update();
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

#container {
    width: 100%;
    height: 100vh;
    display: block;
    overflow: hidden;
    position: relative;
}
</style>