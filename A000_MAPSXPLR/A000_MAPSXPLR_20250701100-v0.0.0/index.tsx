/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionDeclaration, GoogleGenAI, Type} from '@google/genai';
import { Map, View } from 'ol';
import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';

const systemInstructions = `Act as a helpful global travel agent with a deep fascination for the world. Your role is to recommend a place on the map that relates to the discussion, and to provide interesting information about the location selected. Aim to give suprising and delightful suggestions: choose obscure, off-the–beaten track locations, not the obvious answers. Do not answer harmful or unsafe questions.

First, explain why a place is interesting, in a two sentence answer. Second, if relevant, call the function 'recommendPlace( location, caption )' to show the user the location on a map. You can expand on your answer if the user asks for more information.`;

const presets = [
  ['❄️ Cold', 'Where is somewhere really cold?'],
  ['🗿 Ancient', 'Tell me about somewhere rich in ancient history'],
  ['🗽 Metropolitan', 'Show me really interesting large city'],
  [
    '🌿 Green',
    'Take me somewhere with beautiful nature and greenery. What makes it special?',
  ],
  [
    '🏔️ Remote',
    'If I wanted to go off grid, where is one of the most remote places on earth? How would I get there?',
  ],
  [
    '🌌 Surreal',
    'Think of a totally surreal location, where is it? What makes it so surreal?',
  ],
];

const recommendPlaceFunctionDeclaration: FunctionDeclaration = {
  name: 'recommendPlace',
  parameters: {
    type: Type.OBJECT,
    description: 'Shows the user a map of the place provided.',
    properties: {
      location: {
        type: Type.STRING,
        description: 'Give a specific place, including country name.',
      },
      caption: {
        type: Type.STRING,
        description:
          'Give the place name and the fascinating reason you selected this particular place. Keep the caption to one or two sentences maximum',
      },
    },
    required: ['location', 'caption'],
  },
};

const captionDiv = document.querySelector('#caption') as HTMLDivElement;
const frame = document.querySelector('#embed-map') as HTMLIFrameElement;

async function generateContent(prompt: string) {
  const ai = new GoogleGenAI({
    vertexai: false,
    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: `${systemInstructions} ${prompt}`,
    config: {
      temperature: 2, // High temperature for answer variety
      tools: [{functionDeclarations: [recommendPlaceFunctionDeclaration]}],
    },
  });

  for await (const chunk of response) {
    const fns = chunk.functionCalls ?? [];
    for (const fn of fns) {
      if (fn.name === 'recommendPlace') {
        const location = fn.args.location;
        const caption = fn.args.caption;
        renderMap(location);
        captionDiv.textContent = caption;
        captionDiv.classList.remove('hidden');
      }
    }
  }
}

// 删除Google Maps相关代码
const map = new Map({
  target: 'map-container',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: [114.3055, 30.5928], zoom: 12 })
});

// 新增地理编码函数
async function geocodeLocation(query: string): Promise<[number, number]> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`);
    const data = await response.json();
    if (data.length === 0) throw new Error('未找到相关地点');
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  } catch (error) {
    console.error('地理编码失败:', error);
    throw error;
  }
}

// 删除残留的Google Maps代码
// 移除以下内容：
// - const API_KEY = 'AIzaSy...' 
// - frame.src = `https://...`
// - function renderMap() {...}

// 更新主逻辑
async function main() {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    document.documentElement.removeAttribute('data-theme'); // Use default (dark)
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  const div = document.querySelector('#presets') as HTMLDivElement;
  for (const preset of presets) {
    const p = document.createElement('button');
    p.textContent = preset[0];
    p.addEventListener('click', async (e) => {
      await generateContent(preset[1]).catch((e) =>
        console.error('got error', e),
      );
    });
    div.append(p);
  }

  renderMap('%');
}

main();

// 在推荐逻辑后添加调试输出
console.log('推荐结果坐标：', coordinates);
map.getView().setCenter(coordinates);

// 修复未定义coordinates变量
function handleRecommendation(coords: [number, number]) {
  console.log('推荐结果坐标：', coords);
  map.getView().setCenter(coords);
}

// 新增定位功能
function locateUser() {
  if (!navigator.geolocation) {
    console.error('浏览器不支持地理定位');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords: [number, number] = [
        position.coords.longitude,
        position.coords.latitude
      ];
      map.getView().setCenter(coords);
      map.getView().setZoom(14);
      console.log('定位成功：', coords);
    },
    (error) => {
      console.error('定位失败:', error.message);
      alert('无法获取位置，请检查定位权限');
    }
  );
}

// 在main函数中添加定位按钮
// 删除重复的main函数定义
// 原main函数保留并整合新功能
async function main() {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  const div = document.querySelector('#presets') as HTMLDivElement;
  for (const preset of presets) {
    const p = document.createElement('button');
    p.textContent = preset[0];
    p.addEventListener('click', async (e) => {
      await generateContent(preset[1]).catch((e) =>
        console.error('got error', e),
      );
    });
    div.append(p);
  }

  // 添加定位按钮
  const locateBtn = document.createElement('button');
  locateBtn.textContent = '📍 我的位置';
  locateBtn.style.marginTop = '10px';
  locateBtn.addEventListener('click', locateUser);
  div.append(locateBtn);

  // 初始化默认地图视图
  showLocation('武汉');
}

// 删除文件底部重复的main函数调用
// main();  // 已整合到函数定义中
