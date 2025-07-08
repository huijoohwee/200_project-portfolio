/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Declare Leaflet library, which is loaded via a script tag in index.html
declare const L: any;

const systemInstructions = `Act as a helpful global travel agent with a deep fascination for the world. Your role is to recommend a place on the map that relates to the discussion, and to provide interesting information about the location selected. Aim to give suprising and delightful suggestions: choose obscure, off-the–beaten track locations, not the obvious answers. Do not answer harmful or unsafe questions.

First, explain why a place is interesting, in a two sentence answer. Second, if relevant, use the 'recommendPlace' tool to show the user the location on a map. You can expand on your answer if the user asks for more information.`;

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

const recommendPlaceTool = {
  type: 'function',
  function: {
    name: 'recommendPlace',
    description: 'Shows the user a map of the place provided.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Give a specific place, including country name.',
        },
        caption: {
          type: 'string',
          description:
            'Give the place name and the fascinating reason you selected this particular place. Keep the caption to one or two sentences maximum',
        },
      },
      required: ['location', 'caption'],
    },
  },
};

const captionDiv = document.querySelector('#caption') as HTMLDivElement;
let map: any | null = null;
let marker: any | null = null;

async function generateContent(prompt: string) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    captionDiv.textContent = 'API key is not set.';
    captionDiv.classList.remove('hidden');
    return;
  }

  try {
    const apiResponse = await fetch(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {role: 'system', content: systemInstructions},
            {role: 'user', content: prompt},
          ],
          tools: [recommendPlaceTool],
          tool_choice: 'auto',
          stream: true,
        }),
      },
    );

    if (!apiResponse.ok) {
      throw new Error(`API request failed: ${apiResponse.statusText}`);
    }

    const reader = apiResponse.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const toolCalls: {[key: number]: {name: string; arguments: string}} = {};

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, {stream: true});
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta || !delta.tool_calls) continue;

          for (const toolCallChunk of delta.tool_calls) {
            const index = toolCallChunk.index;
            if (!toolCalls[index]) {
              toolCalls[index] = {name: '', arguments: ''};
            }
            if (toolCallChunk.function?.name) {
              toolCalls[index].name = toolCallChunk.function.name;
            }
            if (toolCallChunk.function?.arguments) {
              toolCalls[index].arguments += toolCallChunk.function.arguments;
            }
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e);
        }
      }
    }

    for (const index in toolCalls) {
      const toolCall = toolCalls[index];
      if (toolCall.name === 'recommendPlace') {
        try {
          const args = JSON.parse(toolCall.arguments);
          renderMap(args.location);
          captionDiv.textContent = args.caption;
          captionDiv.classList.remove('hidden');
        } catch (e) {
          console.error('Failed to parse function arguments:', e);
        }
      }
    }
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    captionDiv.textContent = 'Failed to get recommendation.';
    captionDiv.classList.remove('hidden');
  }
}

async function renderMap(location: string) {
  if (!map) {
    map = L.map('map').setView([20, 0], 2); // Default to a world view
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  }

  if (!location) return;

  try {
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
    );
    if (!geoResponse.ok) {
      throw new Error(`Geocoding failed: ${geoResponse.statusText}`);
    }
    const geoData = await geoResponse.json();

    if (geoData.length > 0) {
      const {lat, lon} = geoData[0];
      const coordinates: [number, number] = [parseFloat(lat), parseFloat(lon)];

      map.flyTo(coordinates, 10);

      if (marker) {
        marker.setLatLng(coordinates);
      } else {
        marker = L.marker(coordinates).addTo(map);
      }
    } else {
      console.warn(`Location not found: ${location}`);
    }
  } catch (error) {
    console.error('Error during map rendering:', error);
  }
}

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
      captionDiv.classList.add('hidden');
      await generateContent(preset[1]);
    });
    div.append(p);
  }

  renderMap(''); // Initialize the map
}

main();
