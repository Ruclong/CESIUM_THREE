import * as THREE from "three";
import { normalize,denormalize } from './Utils';
import DxfParser from 'dxf-parser';

const dxf_22910 = '/22910.dxf'

// 获取数据
export async function PointCad() {
    try {
        const response = await fetch(dxf_22910);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const dxfText = await response.text();

        // 创建一个DxfParser实例，用于解析DXF文件内容
        var parser = new DxfParser();
        var dxf = parser.parseSync(dxfText);
        let dxfData = await Viewer(dxf);

        return dxfData;
    } catch (error) {
        console.error('加载DXF错误:', error);
    }
}

async function Viewer(data) {
    const scene = new THREE.Scene();  // 创建场景
    let entity, points = [];

    // 遍历所有实体，并绘制到场景中
    for (let i = 0; i < data.entities.length; i++) {
        entity = data.entities[i];
        const pointCloud = drawEntity(entity, scene); // 绘制普通实体
        if (pointCloud) {
            points.push(...pointCloud);
        }
    }

    return points;
}

// 绘制实体
function drawEntity(entity, scene) {
    let mesh = drawPoints(entity, scene);
    // console.log(...mesh);

    // if (mesh) {
    //     mesh.userData.layer = entity.layer;
    //     mesh.userData.type = entity.type;
    //     if (entity.color) {
    //         mesh.userData.color = entity.color;
    //     }
    // }
    return mesh;
}

// 绘制坐标点
// function drawPoints(entity) {
//     if (entity.vertices && entity.vertices.length > 0) {
//         const points = [];
//         for (let i = 0; i < entity.vertices.length; i++) {
//             const vertex = entity.vertices[i];
//             let position_X = normalize(vertex.x, 39476000, 39489000); // Normalize x
//             let position_Y = normalize(vertex.y, 3849500, 3856000); // Normalize y

//             points.push(new THREE.Vector3(position_X, position_Y, 0));
//         }

//         const geometry = new THREE.BufferGeometry().setFromPoints(points);
//         const material = new THREE.PointsMaterial({ color: 0xff0000, size: 7 });

//         const pointCloud = new THREE.Points(geometry, material);
//         return pointCloud;
//     }
// }
function drawPoints(entity) {
    if (entity.vertices && entity.vertices.length > 0) {
        const pointClouds = [];

        for (let i = 0; i < entity.vertices.length; i++) {
            const vertex = entity.vertices[i];
            let position_X = normalize(vertex.x, 39476000, 39489000); // 归一化 x
            let position_Y = normalize(vertex.y, 3849500, 3856000); // 归一化 y

            // 创建单独的点
            const point = new THREE.Vector3(position_X, position_Y, 0);
            const geometry = new THREE.BufferGeometry().setFromPoints([point]);
            const material = new THREE.PointsMaterial({ color: 0xff0000, size: 6 });
            const pointCloud = new THREE.Points(geometry, material);

            // 将每个点云对象添加到数组中
            pointClouds.push(pointCloud);
        }

        return pointClouds;
    }
}
