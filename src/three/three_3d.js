import * as THREE from "three";
import { grahamScan, TIN } from './Utils'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
console.log(BufferGeometryUtils);

// 坐标信息
const drillData = [
    [3851670.65, 39481878.68, 38.2, -490.77],
    [3853451.44, 39484801.52, 38.23, -780.03],
    [3851810.89, 39481631.88, 37.82, -730.81],
    [3852522.8, 39483501.3, 38.23, -681.76],
    [3852715, 39484939.3, 36.92, -705.31],
    [3851786.38, 39479075.57, 38.8, -860.32],
    [3852217.16, 39485594.02, 36.6, -508.68],
    [3852948.51, 39484500.95, 37.97, -603.43],
    [3852280.13, 39482546.22, 37.84, -784.23],
    [3851173.66, 39482247.78, 38.64, -367.55],
    [3851620.91, 39484670.85, 37.69, -317.08],
    [3851418.06, 39482737.02, 38.2, -375.98],
    [3851919.48, 39480564.63, 38.98, -691.99],
    [3851362.04, 39479184.14, 38.68, -552.18],
    [3853900.1, 39486757.05, 37.27, -868.04],
    [3851318.47, 39482763.89, 38.56, -365.39],
    [3850798.76, 39481359.99, 38.78, -348.98],
    [3853388.1, 39485779.46, 37.71, -850.26],
    [3851225.34, 39478667.74, 38.1, -517.81],
    [3853284.63, 39488088.44, 37.2, -813.65],
    [3853347, 39488599.33, 36.95, -550.61],
    [3852434.81, 39482941.04, 38.13, -800.93],
    [3850995.32, 39479287.55, 39.22, -562.33],
    [3852578.63, 39485524.95, 37.31, -645.56],
    [3851072.61, 39480224.97, 38.74, -511.41],
    [3852508.07, 39478841.57, 40.05, -986],
    [3852405.35, 39487099.04, 36.99, -332.91],
    [3852095.66, 39484579.68, 37.89, -524.73],
    [3852082.86, 39482008.59, 37.76, -791.09],
    [3850804.04, 39480895, 38.71, -418.33],
    [3851599.62, 39483701.5, 37.07, -365.25],
    [3852193.78, 39483571.82, 38.15, -432.91],
    [3851017.38, 39480840.42, 38.68, -346.2],
    [3851656.04, 39480090.83, 38.91, -765.27],
    [3852108.72, 39486603.36, 36.92, -315.82],
    [3853764.18, 39488471.36, 37.15, -762.04],
    [3850682.06, 39479950.29, 39.25, -436.97],
    [3851915.71, 39485160.93, 36.73, -389.22],
    [3850571.09, 39479415.78, 39.21, -356.57],
    [3853646.32, 39484801.52, 37.79, -693.47],
    [3853224.42, 39483790.33, 37.07, -791.35],
    [3852370.44, 39486511.78, 37.38, -494.25],
    [3851640.54, 39479652.31, 38.92, -791.35],
    [3852586.33, 39484473.89, 37.87, -671.86],
    [3851501.7, 39480829.33, 38.01, -547.88],
    [3854091.09, 39487884.24, 37.22, -829.63],
    [3853585.4, 39487483.9, 37.33, -920.58],
    [3852135.03, 39487162.06, 37.29, -410.52],
    [3850921.64, 39480269.95, 39.33, -372.37],
    [3850769.02, 39480304.59, 39.47, -455.78],
    [3851666.26, 39484188.2, 37.65, -362.05],
    [3853381.6, 39482686.05, 38.56, -892.38],
    [3852690.36, 39486446.43, 37.68, -630.99],
    [3850932.72, 39479866.22, 39.23, -518.04],
    [3851752.66, 39484670.85, 37.56, -334.66],
    [3851639.3, 39482693.47, 38.06, -314.2],
    [3852311.26, 39483546.3, 38.25, -587.15],
    [3852917.81, 39483402.26, 37.53, -734.75],
    [3851767.21, 39481103.75, 38.66, -580.77],
    [3852091.75, 39486154.47, 37.34, -358.25],
    [3850686.92, 39478797.66, 39.17, -324.51],
    [3852748.68, 39480650.72, 38.95, -926.78],
    [3851102.2, 39478181.56, 38.28, -625.44],
    [3850497, 39478850.5, 39.42, -394.46],
    [3851868.33, 39485684.43, 36.88, -313.57],
    [3853146.38, 39487573.63, 36.78, -760.58],
    [3854357.71, 39485624.96, 37.56, -1002],
    [3851151.03, 39481757.93, 38.8, -439.23],
    [3851919.79, 39482626.91, 38.19, -645.86],
];
//创建组
export async function createZhu(holeData, color) {
    let verticeTop = [], verticeBottom = [];
    const drillDataX = drillData.map(item => item[0]);
    const drillDataY = drillData.map(item => item[1]);
    const minX = Math.min(...drillDataX);
    const maxX = Math.max(...drillDataX);
    const minY = Math.min(...drillDataY);
    const maxY = Math.max(...drillDataY);

    const data = holeData.map(row => [row['Y'], row['X'], row['top'], row['bottom'], row['id']]);
    const filteredData = data.filter(row => row[0] != null || row[1] != null);

    const points = filteredData.map(row => [row[0], row[1]]);
    const hull = grahamScan(points);
    const boundaryData = hull.map(point => {
        const original = data.find(row => row[0] === point[0] && row[1] === point[1]);
        return { 'id': original[4], 'Y': point[0], 'X': point[1], 'top': original[2], 'bottom': original[3], };
    });

    const boundaryVertices = [];
    const boundaryIndices = [];

    boundaryData.forEach((v, i) => {
        const xNorm = ((v.X - minX) / (maxX - minX) * 7800 - 3900) * 0.9;
        const yNorm = ((v.Y - minY) / (maxY - minY) * 7800 - 3900) * 0.9;
        boundaryVertices.push(yNorm, -v.top * 3, xNorm);
        boundaryVertices.push(yNorm, -v.bottom * 3, xNorm);

        const nextIndex = (i + 1) % boundaryData.length;
        boundaryIndices.push(i * 2, nextIndex * 2, nextIndex * 2 + 1);
        boundaryIndices.push(nextIndex * 2 + 1, i * 2 + 1, i * 2);
    });

    for (let i = 0; i < holeData.length; i++) {
        let normX = (holeData[i].X - minX) / (maxX - minX) * 7800 - 3900;
        let normZ = (holeData[i].Y - minY) / (maxY - minY) * 7800 - 3900;
        verticeTop.push(normZ * 0.9, -holeData[i].top * 3, normX * 0.9);
        verticeBottom.push(normZ * 0.9, -holeData[i].bottom * 3, normX * 0.9);
    }

    const indicesTop = TIN(verticeTop);
    const indicesBottom = TIN(verticeBottom);

    const geometryTop = new THREE.BufferGeometry();
    geometryTop.setAttribute('position', new THREE.Float32BufferAttribute(verticeTop, 3));
    geometryTop.setIndex(indicesTop);
    geometryTop.computeVertexNormals();

    const geometryBottom = new THREE.BufferGeometry();
    geometryBottom.setAttribute('position', new THREE.Float32BufferAttribute(verticeBottom, 3));
    geometryBottom.setIndex(indicesBottom);
    geometryBottom.computeVertexNormals();

    const geometryBoundary = new THREE.BufferGeometry();
    geometryBoundary.setAttribute('position', new THREE.Float32BufferAttribute(boundaryVertices, 3));
    geometryBoundary.setIndex(boundaryIndices);
    geometryBoundary.computeVertexNormals();

    // 合并几何体
    let material = new THREE.MeshBasicMaterial({
        color: color,
    });
    const mergedGeometry = BufferGeometryUtils.mergeGeometries([geometryTop, geometryBottom, geometryBoundary]);
    const mergedMesh = new THREE.Mesh(mergedGeometry, material);
    return mergedMesh
}