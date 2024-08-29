import Papa from 'papaparse';


// 获取“9煤层及预测9煤”数据
export async function fetchHoleData() {
    try {
        const response = await fetch('csv/9煤层及预测9煤.csv');
        const data = await response.text();

        const parsedData = Papa.parse(data, {
            header: true,
            dynamicTyping: true
        }).data;
        return parsedData;
    } catch (error) {
        console.error("Error fetching hole data:", error);
    }
}

// 获取“太原组”数据
export async function fetchTaiyuanData() {
    try {
        const response = await fetch('csv/太原组.csv');
        const data = await response.text();

        const parsedData = Papa.parse(data, {
            header: true,
            dynamicTyping: true
        }).data;
        return parsedData;
    } catch (error) {
        console.error("Error fetching hole data:", error);
    }
}


// 获取“山西组”数据
export async function fetchShanxiData() {
    try {
        const response = await fetch('csv/山西组.csv');
        const data = await response.text();

        const parsedData = Papa.parse(data, {
            header: true,
            dynamicTyping: true
        }).data;
        return parsedData;
    } catch (error) {
        console.error("Error fetching hole data:", error);
    }
}

// 获取“下石盒子”数据
export async function fetchXiashihrData() {
    try {
        const response = await fetch('csv/下石盒子.csv');
        const data = await response.text();

        const parsedData = Papa.parse(data, {
            header: true,
            dynamicTyping: true
        }).data;
        return parsedData;
    } catch (error) {
        console.error("Error fetching hole data:", error);
    }
}