import * as THREE from 'three';
import { FetchOutLine } from '@/three/three_cad.js';
import { DrawTunnel } from '@/three/edit';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { grahamScan } from '@/three/Utils'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';


let geometryTop, geometryBottom; // 合并后几何体

// 工作面
export async function workPlane(scene) {
    // 创建一个 Map 来按材质存储几何体
    const materialGeometriesMap = new Map();
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
        const mergedPoints = mergedGeometry.attributes.position.array;

        let verticeTop = [], Outvertices = []
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
        const material = new THREE.MeshBasicMaterial({ color: 0x0, transparent: true, side: THREE.DoubleSide, opacity: 0.5 });
        const MeshTop = new THREE.Mesh(geometryTop, material);
        applySet(MeshTop, 10)

        geometryBottom = geometryTop.clone();
        const MeshBottom = new THREE.Mesh(geometryBottom, material);
        applySet(MeshBottom, -10)

        scene.add(MeshTop, MeshBottom);

        createSides(geometryTop, geometryBottom, scene);

    });

}
// 工作面侧面
function createSides(geometryTop, geometryBottom, scene) {
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
    const sideMaterial = new THREE.MeshBasicMaterial({ color: 0x0, transparent: true, side: THREE.DoubleSide, opacity: 0.5 });
    const sideMesh = new THREE.Mesh(sideGeometry, sideMaterial);

    sideMesh.position.set(1600, 0, 120);
    sideMesh.scale.set(8000, 4000, 1);
    sideMesh.rotateX(Math.PI / 2);

    scene.add(sideMesh);
}

function applySet(Mesh, H) {
    // 应用平移、缩放和旋转变换
    Mesh.position.set(1600, H, 120);
    Mesh.scale.set(8000, 4000, 1);
    Mesh.rotateX(Math.PI / 2);
}

// 生成高度
export function generateHeight(width, height) {

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

// 创建巷道
export async function CreateTunnel(scene) {
    const GeometryLine = await DrawTunnel();

    // 加载金属材质
    const metallicMaterial = new THREE.MeshStandardMaterial({
        //银灰
        color: 0xbacac6,
        // color:0x00A36C,//金属绿
        metalness: 1.0,
        roughness: 0.3,
        // map: texture,//纹理
    });
    // 增加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 环境光强度增大
    scene.add(ambientLight);

    // 调整方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);
    // 创建一个圆柱体的缓冲几何体，只创建一次
    const radius = 2;
    const radialSegments = 8;
    const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, 1, radialSegments);

    // 计算总的实例数量
    let instanceCount = 0;
    GeometryLine.forEach(lineSegment => {
        if (lineSegment) {
            const posArray = lineSegment.geometry.attributes.position.array;
            instanceCount += (posArray.length / 3) - 1;
        }
    });

    // 创建 InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(cylinderGeometry, metallicMaterial, instanceCount);

    let index = 0;
    GeometryLine.forEach(lineSegment => {
        if (lineSegment) {
            const posArray = lineSegment.geometry.attributes.position.array;
            const points = [];
            for (let i = 0; i < posArray.length; i += 3) {
                points.push(new THREE.Vector3(posArray[i], posArray[i + 1], posArray[i + 2]));
            }

            for (let i = 0; i < points.length - 1; i++) {
                const startPoint = points[i];
                const endPoint = points[i + 1];
                const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
                const length = direction.length();
                const centerPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);

                // 创建变换矩阵
                const matrix = new THREE.Matrix4();

                // 缩放圆柱体到正确的长度
                const scaleMatrix = new THREE.Matrix4().makeScale(1, length, 1);

                // 旋转矩阵
                const quaternion = new THREE.Quaternion();
                quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
                const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

                // 位置矩阵
                const positionMatrix = new THREE.Matrix4().makeTranslation(centerPoint.x, centerPoint.y, centerPoint.z);

                // 组合变换
                matrix.multiply(positionMatrix).multiply(rotationMatrix).multiply(scaleMatrix);

                // 应用全局变换
                const globalMatrix = new THREE.Matrix4();
                globalMatrix.makeTranslation(-500, 1300, -400);
                globalMatrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
                globalMatrix.multiply(new THREE.Matrix4().makeScale(1, 1, 2));
                matrix.premultiply(globalMatrix);

                // 设置实例的变换矩阵
                instancedMesh.setMatrixAt(index, matrix);
                index++;
            }
        }
    });

    // 更新实例的矩阵
    instancedMesh.instanceMatrix.needsUpdate = true;

    scene.add(instancedMesh);
}

// 调整颜色和大小的函数
export function getColorAndSize(energy, quakelevel) {
    let color, size;

    // 根据 quakelevel 设置颜色
    if (quakelevel > 0 && quakelevel <= 1) {
        color = 0x91CC75; // 绿色
    } else if (quakelevel > 1 && quakelevel <= 2) {
        color = 0xFAC858; // 黄色
    } else if (quakelevel > 2 && quakelevel < 3) {
        color = 0xEE6666; // 红色
    } else {
        color = 0xcc0033; // 深红色
    }

    // 根据 energy 设置大小
    if (energy > 0 && energy <= 1000) {
        size = 7;
    } else if (energy > 1000 && energy <= 10000) {
        size = 10;
    } else if (energy > 10000 && energy < 100000) {
        size = 15;
    } else {
        size = 20;
    }
    return { color, size };
}




