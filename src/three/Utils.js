import * as THREE from "three";
import * as d3 from 'd3';

THREE.MathUtils.angle2 = function (p1, p2) {
    const v1 = new THREE.Vector2(p1.x, p1.y);
    const v2 = new THREE.Vector2(p2.x, p2.y);
    v2.sub(v1);
    v2.normalize();
    if (v2.y < 0) return -Math.acos(v2.x);
    return Math.acos(v2.x);
};

THREE.MathUtils.polar = function (point, distance, angle) {
    const result = {};
    result.x = point.x + distance * Math.cos(angle);
    result.y = point.y + distance * Math.sin(angle);
    return result;
};

export class BulgeGeometry extends THREE.BufferGeometry {
    constructor(startPoint, endPoint, bulge, segments) {
        super();
        const vertices = [];
        const p0 = new THREE.Vector2(startPoint.x, startPoint.y);
        const p1 = new THREE.Vector2(endPoint.x, endPoint.y);
        const angle = 4 * Math.atan(bulge);
        const radius = p0.distanceTo(p1) / 2 / Math.sin(angle / 2);
        const center = THREE.MathUtils.polar(startPoint, radius, THREE.MathUtils.angle2(p0, p1) + (Math.PI / 2 - angle / 2));
        const segmentCount = segments || Math.max(Math.abs(Math.ceil(angle / (Math.PI / 18))), 6);
        const startAngle = THREE.MathUtils.angle2(center, p0);
        const thetaAngle = angle / segmentCount;
        vertices.push(p0.x, p0.y, 0);
        for (let i = 1; i <= segmentCount - 1; i++) {
            const vertex = THREE.MathUtils.polar(center, Math.abs(radius), startAngle + thetaAngle * i);
            vertices.push(vertex.x, vertex.y, 0);
        }
        vertices.push(p1.x, p1.y, 0);
        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    }
}

// 三角剖分计算绘制顺序 ,返回值 return indices
function performDelaunay(vertices) {
    //取x,z坐标，存到points2D中，算出绘制顺序，用以三角剖分
    let points2D = [];
    for (let i = 0; i < vertices.length; i += 3) {
        points2D.push([vertices[i], vertices[i + 2]]);
    }

    const delaunay = d3.Delaunay.from(points2D);
    const triangles = new Uint32Array(delaunay.triangles);
    const indices = [];
    for (let i = 0; i < triangles.length; i += 3) {
        indices.push(triangles[i], triangles[i + 1], triangles[i + 2]);
    }
    return indices
}

// 将质心添加上去,返回值vertices
function addCentroidsToVertices(vertices, centroids) {
    centroids.forEach(centroid => {
        vertices.push(centroid[0], centroid[1], centroid[2]);
    });
    return vertices;
}

// 计算质心,返回值return centroids
function calculateCentroids(vertices, indices) {
    let centroids = [];
    for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i] * 3;
        const v2 = indices[i + 1] * 3;
        const v3 = indices[i + 2] * 3;
        const centroid = [
            (vertices[v1] + vertices[v2] + vertices[v3]) / 3,
            (vertices[v1 + 1] + vertices[v2 + 1] + vertices[v3 + 1]) / 3,
            (vertices[v1 + 2] + vertices[v2 + 2] + vertices[v3 + 2]) / 3,
        ];
        centroids.push(centroid);
    }
    return centroids;
}

// 执行多次三角剖分
export function TIN(verticeTop) {
    for (let i = 0; i < 7; i++) {
        let index = performDelaunay(verticeTop);
        let centroids = calculateCentroids(verticeTop, index);
        verticeTop = addCentroidsToVertices(verticeTop, centroids);
    }
    let indices = performDelaunay(verticeTop);
    return indices
}

//计算外围点扫描算法
export function grahamScan(points) {
    points.sort((a, b) => a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]);
    const n = points.length;
    const lower = [];
    for (let i = 0; i < n; i++) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
            lower.pop();
        }
        lower.push(points[i]);
    }
    const upper = [];
    for (let i = n - 1; i >= 0; i--) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
            upper.pop();
        }
        upper.push(points[i]);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
//格式化最坐标[-1,1]
export function normalize(val, min, max) {
    return 2 * (val - min) / (max - min) - 1;
}

// 反归一化函数
export function denormalize(normalizedVal, min, max) {
    return ((normalizedVal + 1) * (max - min) / 2) + min;
}