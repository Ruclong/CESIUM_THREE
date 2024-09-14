import * as THREE from "three";
import { BulgeGeometry, normalize } from './Utils'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';  // 导入字体加载器
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import DxfParser from 'dxf-parser';

const dxfFilePath = '/Drawing4.dxf'
const dxf_22910 = '/22910.dxf'
const InnerLine = '/22910Plane_in.dxf'
const OutLine = '/22910Plane_out.dxf'
const Tunnel = '/tunnel.dxf'




// 获取数据
export async function DXFtoThreeAll() {
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

        // console.log(dxfData);

        return dxfData;
    } catch (error) {
        console.error('加载DXF错误:', error);
    }
}
export async function DXFtoPlane() {
    try {
        const response = await fetch(dxf_22910);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const dxfText = await response.text();

        // 创建一个DxfParser实例，用于解析DXF文件内容
        var parser = new DxfParser();
        var dxf = parser.parseSync(dxfText);
        let dxfData = await Viewer(dxf)

        // console.log(dxfData);

        return dxfData;
    } catch (error) {
        console.error('加载DXF错误:', error);
    }
}

export async function FetchInnerLine() {
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

        // console.log(dxfData);

        return dxfData;
    } catch (error) {
        console.error('加载DXF错误:', error);
    }
}

export async function FetchOutLine() {
    try {
        const response = await fetch(OutLine);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const dxfText = await response.text();

        // 创建一个DxfParser实例，用于解析DXF文件内容
        var parser = new DxfParser();
        var dxf = parser.parseSync(dxfText);
        let dxfData = await Viewer(dxf)

        // console.log(dxfData);

        return dxfData;
    } catch (error) {
        console.error('加载DXF错误:', error);
    }
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

            var line_material = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 200 });
            // 虚线材质(LineDashedMaterial)
            var dash_material = new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 3, gapSize: 1, linewidth: 200 });

            // 遍历所有实体并根据类型创建网格对象
            for (var key in res_entities) {
                // console.log('实体类型', key);

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

// 绘制实体
function drawEntity(entity, data, font, scene) {
    // console.log(entity);
    // 绘制实体的顶点为红色点
    let points = drawVerticesAsPoints(entity, scene);

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

        // 如果实体有颜色属性，保存颜色信息到 mesh 的用户数据中
        if (entity.color) {
            mesh.userData.color = entity.color;
        }
    }

    // 返回生成的 mesh 对象
    return mesh;
}

// 绘制坐标点
function drawVerticesAsPoints(entity, scene) {
    // 检查实体是否具有 vertices 属性
    if (entity.vertices && entity.vertices.length > 0) {
        // 创建一个包含顶点位置的数组
        const points = [];
        for (let i = 0; i < entity.vertices.length; i++) {
            const vertex = entity.vertices[i];
            points.push(new THREE.Vector3(vertex.x, vertex.y, 0));
        }

        // 创建几何体，将顶点添加到几何体中
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // 创建材质，并设置颜色为红色
        const material = new THREE.PointsMaterial({ color: 0xff0000, size: 3 });

        // 创建点并添加到场景中
        const pointCloud = new THREE.Points(geometry, material);
        return pointCloud
    }
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
        material = new THREE.LineDashedMaterial({ color: color, linewidth: 2000, gapSize: 1, dashSize: 2 });
    } else {
        material = new THREE.LineBasicMaterial({ color: color, linewidth: 2000, });
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

// 绘制单行文字
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
    text.position.set(entity.startPoint.x, entity.startPoint.x, entity.startPoint.z);

    return text;
}

// 绘制多行文字
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