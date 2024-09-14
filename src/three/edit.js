import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import DxfParser from 'dxf-parser';
import { BulgeGeometry } from './Utils';

const Tunnel = '/tunnel2.dxf';  // DXF文件路径

// 异步函数：加载和绘制隧道
export async function DrawTunnel() {
    try {
        const response = await fetch(Tunnel);  // 请求加载DXF文件
        if (!response.ok) throw new Error('无法加载DXF文件');
        
        const dxfText = await response.text();  // 读取DXF文件内容为文本
        const parser = new DxfParser();  // 创建DxfParser实例
        const dxf = parser.parseSync(dxfText);  // 解析DXF文本

        return await parseDXFToScene(dxf);  // 将解析的DXF数据转换为Three.js场景
    } catch (error) {
        console.error('加载DXF文件出错:', error);  // 错误处理
    }
}

// 解析DXF数据并生成场景
function parseDXFToScene(data) {
    return new Promise((resolve, reject) => {
        const scene = new THREE.Scene();  // 创建Three.js场景
        const meshes = [];  // 存储所有生成的几何体

        // 遍历DXF中的所有实体，绘制几何体并添加到场景中
        data.entities.forEach(entity => {
            const mesh = drawEntity(entity, data);  // 绘制单个实体
            if (mesh) scene.add(mesh);  // 将mesh添加到场景中
            meshes.push(mesh);  // 保存生成的mesh
        });

        resolve(meshes);  // 返回所有的几何体
    });
}

// 根据实体类型绘制几何体
function drawEntity(entity, data) {
    switch (entity.type) {
        case 'CIRCLE':  // 如果是圆
        case 'ARC':     // 如果是圆弧
            return drawArc(entity, data);  // 调用绘制圆弧的函数
        case 'LWPOLYLINE':  // 如果是轻量折线
        case 'LINE':        // 如果是线段
        case 'POLYLINE':    // 如果是折线
            return drawLine(entity, data);  // 调用绘制线段的函数
        default:
            console.log("不支持的实体类型:", entity.type);  // 对于不支持的类型进行提示
    }
}

// 绘制线段或折线
function drawLine(entity, data) {
    const geometry = new LineGeometry();  // 创建几何体
    const color = getColor(entity, data);  // 获取实体的颜色
    const vertices = [];  // 存储顶点信息

    // 遍历实体的所有顶点
    entity.vertices.forEach((vertex, i) => {
        if (vertex.bulge) {  // 如果顶点有弯曲属性
            const endPoint = entity.vertices[i + 1] || entity.vertices[0];  // 获取终点
            const bulgeGeometry = new BulgeGeometry(vertex, endPoint, vertex.bulge);  // 计算弯曲几何
            vertices.push(...bulgeGeometry.attributes.position.array);  // 添加顶点
        } else {
            vertices.push(vertex.x, vertex.y, vertex.z || 0);  // 添加普通顶点
        }
    });

    // 如果是闭合的形状，添加第一个顶点以闭合
    if (entity.shape) vertices.push(vertices[0], vertices[1], vertices[2]);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));  // 设置几何体的顶点数据

    const material = new LineMaterial({ color, linewidth: 5 });  // 创建线条材质
    return new Line2(geometry, material);  // 返回Line2对象
}

// 绘制圆弧
function drawArc(entity, data) {
    const { center, radius, startAngle = 0, endAngle = startAngle + 2 * Math.PI } = entity;  // 获取圆弧的中心、半径和起始角度
    const curve = new THREE.ArcCurve(center.x, center.y, radius, startAngle, endAngle);  // 创建圆弧曲线
    const points = curve.getPoints(32);  // 获取圆弧的点

    const geometry = new THREE.BufferGeometry().setFromPoints(points);  // 创建几何体并设置顶点数据
    const material = new THREE.LineBasicMaterial({ color: getColor(entity, data) });  // 创建线条材质

    return new THREE.Line(geometry, material);  // 返回线条对象
}

// 获取实体的颜色
function getColor(entity, data) {
    // 如果实体有颜色则使用实体的颜色，否则使用图层的颜色，默认黑色
    return entity.color || data.tables?.layer?.layers[entity.layer]?.color || 0x000000;
}
