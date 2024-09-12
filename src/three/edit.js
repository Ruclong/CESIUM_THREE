import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { BulgeGeometry, normalize } from './Utils'
import DxfParser from 'dxf-parser';

const OutLine = '/22910Plane_out.dxf'
const Tunnel = '/tunnel2.dxf'


export async function DrawTunnel() {
    try {
        const response = await fetch(Tunnel);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const dxfText = await response.text();

        // 创建一个DxfParser实例，用于解析DXF文件内容
        var parser = new DxfParser();
        var dxf = parser.parseSync(dxfText);
        let dxfData = await Viewer(dxf)

        return dxfData;
    } catch (error) {
        console.error('加载DXF错误:', error);
    }
}

function Viewer(data) {
    // console.log('cad原始数据中所有实体：\n', data.entities);

    return new Promise((resolve, reject) => {
        createLineTypeShaders(data);

        var scene = new THREE.Scene();  // 创建场景
        var res_entities = {}, layer_num = {};
        var meshes = []; // 存储所有 mesh 对象

        // 从 dxf 对象 (data) 创建场景
        var i, entity, obj;

        // 遍历所有实体，并绘制到场景中
        for (i = 0; i < data.entities.length; i++) {

            entity = data.entities[i];

            obj = drawEntity(entity, data);

            if (obj) {
                renderGeometry(obj, layer_num, res_entities, scene); // 渲染几何对象
            }

            meshes.push(obj); // 将 mesh 对象添加到数组中

        }

        resolve(meshes);
    }, undefined, function (error) {
        reject(error);
    });
}

// 绘制实体
function drawEntity(entity, data) {
    // 打印绘制的实体
    // console.log(entity);
    var mesh;

    // 绘制圆或弧
    if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
        mesh = drawArc(entity, data);
    }
    // 绘制折线或线条
    else if (entity.type === 'LWPOLYLINE' || entity.type === 'LINE' || entity.type === 'POLYLINE') {
        mesh = drawLine(entity, data);
    }
    else {
        console.log("未能绘制的实体类型：", entity.type);

    }

    // 如果成功生成了 mesh 对象
    if (mesh) {
        // 将实体的图层信息保存到 mesh 的用户数据中
        mesh.userData.layer = entity.layer;
        // 将实体的类型信息保存到 mesh 的用户数据中
        mesh.userData.type = entity.type;

        // 如果实体有颜色属性，保存颜色信息到 mesh 的用户数据中
        if (entity.color) {
            mesh.userData.color = entity.color;
        }
    }
    // console.log(mesh);

    // 返回生成的 mesh 对象
    return mesh;
}


function drawLine(entity, data) {
    // console.log('cad实体',entity);

    const geometry = new LineGeometry();
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
        }
        else {
            const vertex = entity.vertices[i];
            // let position_X = normalize(vertex.x, 39476000, 39489000); // Normalize x
            // let position_Y = normalize(vertex.y, 3849500, 3856000); // Normalize y
            let position_X = vertex.x // Normalize x
            let position_Y = vertex.y; // Normalize y
            let position_Z = vertex.z || 0; // Normalize y

            vertices.push(position_X, position_Y, position_Z);
        }
    }

    if (entity.shape) {
        vertices.push(vertices[0], vertices[1], vertices[2]);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    // if (entity.lineType) {
    //     lineType = data.tables.lineType.lineTypes[entity.lineType];
    // }

    material = new LineMaterial({
        color: color,
        linewidth: 5,
    });

    const line = new Line2(geometry, material);
    // console.log(line);
    
    return line;
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

                    // 将顶点的x, y, z坐标推入points数组中
                    res_entities[obj.userData.layer].points.push(positionArray[i], positionArray[i + 1], positionArray[i + 2]);
                    // 将材质的颜色推入colors数组中
                    res_entities[obj.userData.layer].colors.push(obj.material.color.r, obj.material.color.g, obj.material.color.b);
                }

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