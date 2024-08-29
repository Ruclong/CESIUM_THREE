<template>
    <div>
        <div id="container"></div>
        <div id="coords" style="position: absolute; top: 10px; left: 10px; color: #444; font-size: 16px;">
            X: 0, Z: 0, Y: 0
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DXFtoThreeAll, DXFtoThree } from '../three/three_cad';


let container;
let camera, scene, renderer;
let HelperObjects = [];
let PointsLength = 4;

const positions = [];
const point = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const onUpPosition = new THREE.Vector2();
const onDownPosition = new THREE.Vector2();
let transformControl;

const splines = {};

onMounted(() => {
     init();

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointermove', onPointerMove);
});

async function init() {
    container = document.getElementById('container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 250, 1000);
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
    transformControl.addEventListener('dragging-changed', function (event) {
        controls.enabled = !event.value;
    });
    scene.add(transformControl);

    transformControl.showX = false;
    transformControl.showY = true;
    transformControl.showZ = false;

    transformControl.addEventListener('objectChange', updateCoords);

    for (let i = 0; i < PointsLength; i++) {
        addPointObject(positions[i]);
        positions.push(HelperObjects[i].position);
    }

    load([
        new THREE.Vector3(289.76843686945404, 452.51481137238443, 56.10018915737797),
        new THREE.Vector3(-53.56300074753207, 171.49711742836848, -14.495472686253045),
        new THREE.Vector3(-91.40118730204415, 176.4306956436485, -6.958271935582161),
        new THREE.Vector3(-383.785318791128, 491.1365363371675, 47.869296953772746)
    ]);

    // 创建网格辅助线
    const helper = new THREE.GridHelper(2000, 50);
    helper.position.y = - 199;
    helper.material.opacity = 0.25;
    helper.material.transparent = true;
    scene.add(helper);

    // 22910工作面
    const dxf_22910 =  await DXFtoThree();
    console.log(dxf_22910);
    
    for (let i = 0; i < dxf_22910.length; i++) {
        let lines = dxf_22910[i]
        lines.scale.set(6100, 3050, 1000); // 放大
        lines.rotateZ(Math.PI); // 绕Z轴旋转180度
        scene.add(lines);
    }
    render();
}

function addPointObject() {
    const geometry = new THREE.BoxGeometry(20, 20, 20);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const object = new THREE.Mesh(geometry, material);

    scene.add(object);
    HelperObjects.push(object);
}

function load(data) {
    for (let i = 0; i < positions.length; i++) {
        positions[i].copy(data[i]);
    }
}

function render() {
    renderer.render(scene, camera);
}

function updateCoords() {
    const object = transformControl.object;
    if (object) {
        const coordsDiv = document.getElementById('coords');
        coordsDiv.innerHTML = `X: ${object.position.x.toFixed(3)}, Z: ${object.position.z.toFixed(3)}, Y:<input type="number" id="y-input" step="1" value=${object.position.y.toFixed(3)}> `;

        const Input = document.getElementById('y-input');
        Input.addEventListener('change', function () {
            object.position.y = parseFloat(Input.value);
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
        }
    }
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