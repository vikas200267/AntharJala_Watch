/**
 * Anthar-Jala Watch — Express Backend Server
 * In-memory data store + Gemini AI + SSE Realtime
 * Falls back gracefully if Firebase/Gemini unavailable
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// ── Gemini AI Init ──
let geminiModel;
try {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('✅ Gemini AI initialized');
} catch (e) { console.warn('⚠️  Gemini unavailable:', e.message); }

let bedrockClient;
try {
  // If AWS credentials are in .env, this will pick them up
  bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
  console.log('✅ AWS Bedrock Client initialized');
} catch (e) {
  console.warn('⚠️ AWS Bedrock unavailable:', e.message);
}

// ── Persistent Data Store (AWS DynamoDB simulated) ──
const DB_FILE = path.join(__dirname, 'db.json');
let store = {
  readings: [
    { id: 'r1', depth: 87, yield: 2400, location: 'Kolar Village', status: 'good', synced: true, time: '2m', timestamp: Date.now() - 120000 },
    { id: 'r2', depth: 132, yield: 820, location: 'Doddabale Gram', status: 'warn', synced: true, time: '18m', timestamp: Date.now() - 1080000 },
    { id: 'r3', depth: 65, yield: 3200, location: 'Tumkur Road', status: 'good', synced: false, time: '1h', timestamp: Date.now() - 3600000 },
  ],
  alerts: [
    { id: 'a1', level: 'critical', title: 'Critical Water Stress', location: 'Anantapur District', message: 'Water table has dropped below 150m. Pumping rates must be reduced immediately.', time: '12m', ai: 'Gemini', timestamp: Date.now() - 720000 },
    { id: 'a2', level: 'high', title: 'Borewell Yield Decline', location: 'Chikkaballapur Taluk', message: '40% yield reduction detected over 30 days. Consider deepening or locating new source.', time: '2h', ai: 'Claude', timestamp: Date.now() - 7200000 },
    { id: 'a3', level: 'medium', title: 'Seasonal Depletion', location: 'Kolar District', message: 'Pre-monsoon levels 18% below the 5-year average. Monitor closely through May.', time: '6h', ai: 'GPT-4', timestamp: Date.now() - 21600000 },
    { id: 'a4', level: 'low', title: 'Offline Sync Pending', location: 'Tumkur Area', message: '3 borewell records waiting to upload. Connect to internet to sync.', time: '1d', ai: null, timestamp: Date.now() - 86400000 },
  ],
  posts: [
    { id: 'p1', user: 'Suresh Rao', role: 'Expert', location: 'Kolar', avatar: 'SR', time: '2h', text: "Noticed significant recharge at 85m depth after last week's rains. Recovery time dropped from 4h to 45min — best in 3 years!", likes: 24, comments: 8, timestamp: Date.now() - 7200000 },
    { id: 'p2', user: 'Meera Patil', role: 'Farmer', location: 'Tumkur', avatar: 'MP', time: '5h', text: "My borewell dried at 120m last summer. Following expert advice here, deepened to 165m — now getting 1,800 L/h consistently.", likes: 41, comments: 15, timestamp: Date.now() - 18000000 },
    { id: 'p3', user: 'Dr. Kumar', role: 'Geologist', location: 'CGWB', avatar: 'DK', time: '1d', text: "⚠️ Pre-monsoon survey update: Anantapur and Kurnool districts showing critical stress indices.", likes: 89, comments: 32, timestamp: Date.now() - 86400000 },
  ],
  dashboard: { rechargePercent: 72, depth: '87m', yield: '2.4K', level: '12.4m', trendText: '+2.1m from last month' },
  waterTrend: [
    { m: 'Jan', lvl: 24, rain: 12, avg: 22 }, { m: 'Feb', lvl: 22, rain: 8, avg: 21 },
    { m: 'Mar', lvl: 19, rain: 5, avg: 19 },  { m: 'Apr', lvl: 16, rain: 3, avg: 17 },
    { m: 'May', lvl: 14, rain: 2, avg: 15 },  { m: 'Jun', lvl: 19, rain: 30, avg: 18 },
    { m: 'Jul', lvl: 27, rain: 84, avg: 24 }, { m: 'Aug', lvl: 32, rain: 98, avg: 28 },
    { m: 'Sep', lvl: 29, rain: 56, avg: 26 }, { m: 'Oct', lvl: 25, rain: 23, avg: 23 },
    { m: 'Nov', lvl: 22, rain: 11, avg: 21 }, { m: 'Dec', lvl: 20, rain: 7, avg: 20 },
  ],
  forecast: [
    { d: 'W1', sm: 20, g: 19, cl: 21, gpt: 20 }, { d: 'W2', sm: 18, g: 17, cl: 18, gpt: 19 },
    { d: 'W3', sm: 15, g: 14, cl: 16, gpt: 15 }, { d: 'W4', sm: 13, g: 12, cl: 14, gpt: 13 },
    { d: 'W5', sm: 12, g: 11, cl: 13, gpt: 12 }, { d: 'W6', sm: 14, g: 13, cl: 14, gpt: 14 },
    { d: 'W7', sm: 17, g: 16, cl: 17, gpt: 16 }, { d: 'W8', sm: 20, g: 19, cl: 21, gpt: 20 },
    { d: 'W9', sm: 24, g: 23, cl: 25, gpt: 23 }, { d: 'W10', sm: 27, g: 26, cl: 28, gpt: 26 },
    { d: 'W11', sm: 29, g: 28, cl: 30, gpt: 28 }, { d: 'W12', sm: 31, g: 30, cl: 32, gpt: 30 },
    { d: 'W13', sm: 33, g: 32, cl: 34, gpt: 32 },
  ],
  heatmap: {
    grid: [[0.2,0.4,0.7,0.9,0.6,0.3,0.5,0.4],[0.3,0.8,1.0,0.8,0.5,0.4,0.7,0.6],[0.5,0.9,0.7,0.5,0.4,0.8,0.8,0.5],[0.7,0.6,0.4,0.3,0.8,0.9,0.5,0.4],[0.9,0.4,0.3,0.6,0.7,0.5,0.3,0.3],[0.6,0.3,0.5,0.8,0.5,0.3,0.2,0.4],[0.3,0.4,0.6,0.5,0.3,0.4,0.5,0.6]],
    pins: [
      { top: '28%', left: '36%', name: 'Kolar', stress: 'critical', wells: 124, avg: 147 },
      { top: '50%', left: '56%', name: 'Tumkur', stress: 'low', wells: 89, avg: 72 },
      { top: '68%', left: '26%', name: 'Anantapur', stress: 'high', wells: 67, avg: 138 },
    ],
    totalReadings: 847,
  },
};

// Load persistent data if exists
if (fs.existsSync(DB_FILE)) {
  try {
    store = { ...store, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) };
    console.log('✅ Persistent data loaded from db.json');
  } catch (err) {
    console.error('Error reading db.json:', err.message);
  }
}

function saveToDb() {
  fs.writeFile(DB_FILE, JSON.stringify(store, null, 2), (err) => {
    if (err) console.error('Failed to save persistent data:', err);
  });
}

// ── SSE Clients ──
const sseClients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) { try { res.write(msg); } catch (_) { sseClients.delete(res); } }
}

// ── SSE Stream ──
app.get('/api/stream', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ── Dashboard ──
app.get('/api/dashboard', (req, res) => {
  res.json({ dashboard: store.dashboard, readings: store.readings.slice(0, 5), timestamp: Date.now() });
});

// ── Readings ──
app.get('/api/readings', (req, res) => {
  res.json({ readings: store.readings, timestamp: Date.now() });
});

app.post('/api/readings', (req, res) => {
  const { depth, yield: yieldVal, location, notes } = req.body;
  if (!depth || !yieldVal) return res.status(400).json({ error: 'depth and yield required' });
  const id = `r_${Date.now()}`;
  const reading = { id, depth: Number(depth), yield: Number(yieldVal), location: location || 'Unknown', notes: notes || '', status: Number(yieldVal) < 1000 ? 'warn' : 'good', synced: true, time: 'just now', timestamp: Date.now() };
  store.readings.unshift(reading);
  saveToDb();
  broadcast('newReading', reading);
  res.status(201).json({ reading, message: 'Reading stored successfully' });
});

// ── Alerts ──
app.get('/api/alerts', (req, res) => {
  res.json({ alerts: store.alerts, timestamp: Date.now() });
});

// ── Analytics ──
app.get('/api/analytics', (req, res) => {
  res.json({ waterTrend: store.waterTrend, forecast: store.forecast, kpi: store.dashboard, timestamp: Date.now() });
});

// ── Heatmap ──
app.get('/api/heatmap', (req, res) => {
  res.json(store.heatmap);
});

// ── Community ──
app.get('/api/community/posts', (req, res) => {
  res.json({ posts: store.posts, timestamp: Date.now() });
});

app.post('/api/community/posts', (req, res) => {
  const { user, text, role, location } = req.body;
  const id = `p_${Date.now()}`;
  const post = { id, user, text, role: role || 'Farmer', location: location || '', avatar: user?.slice(0, 2)?.toUpperCase() || 'U', likes: 0, comments: 0, time: 'now', timestamp: Date.now() };
  store.posts.unshift(post);
  saveToDb();
  broadcast('newPost', post);
  res.status(201).json({ post });
});

// ── AI Chat (AWS Bedrock / Gemini) ──
app.post('/api/ai/chat', async (req, res) => {
  const { message, model } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  
  const useBedrock = model === 'Amazon Bedrock' || model === 'Claude';
  
  if (useBedrock) {
    if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
      return res.json({ response: `Analyzing: "${message.slice(0, 60)}"\n\nBased on data across 847 Karnataka boreholes — water table trends show seasonal patterns. Recommend monitoring during pre-monsoon period.\n\n(Simulated — AWS credentials for Bedrock not configured)`, model: 'Claude 3 Sonnet', timestamp: Date.now() });
    }
    try {
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 500,
        messages: [{ role: "user", content: `You are an expert hydro-geologist advising Indian farmers on groundwater. Answer concisely in 2-3 paragraphs.\n\nQuestion: ${message}` }]
      };
      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      });
      const result = await bedrockClient.send(command);
      const resBody = JSON.parse(new TextDecoder().decode(result.body));
      res.json({ response: resBody.content[0].text, model: 'Claude 3 Sonnet', timestamp: Date.now() });
    } catch (e) {
      console.error('Bedrock AI error:', e.message);
      res.json({ response: 'I encountered an issue connecting to AWS Bedrock. Based on general data, monitor water levels regularly and implement rainwater harvesting.', model: 'Claude 3 Sonnet', timestamp: Date.now(), error: true });
    }
  } else {
    // Gemini Fallback
    if (!geminiModel) {
      return res.json({ response: `Analyzing: "${message.slice(0, 60)}"\n\nBased on data across 847 Karnataka boreholes — water table trends show seasonal patterns. Recommend monitoring during pre-monsoon period.\n\n(Simulated — Gemini API key not configured)`, model: 'Gemini', timestamp: Date.now() });
    }
    try {
      const prompt = `You are an expert hydro-geologist advising Indian farmers on groundwater. Answer concisely in 2-3 paragraphs.\n\nQuestion: ${message}`;
      const result = await geminiModel.generateContent(prompt);
      res.json({ response: result.response.text(), model: 'Gemini', timestamp: Date.now() });
    } catch (e) {
      console.error('AI error:', e.message);
      res.json({ response: 'I encountered an issue. Based on general data, monitor water levels regularly and implement rainwater harvesting.', model: 'Gemini', timestamp: Date.now(), error: true });
    }
  }
});

// ── Health ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', gemini: !!geminiModel, clients: sseClients.size, readings: store.readings.length, timestamp: Date.now() });
});

// ── Heartbeat ──
setInterval(() => broadcast('heartbeat', { timestamp: Date.now(), clients: sseClients.size }), 15000);

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n🚀 Anthar-Jala Backend on http://localhost:${PORT}`);
  console.log(`   📡 SSE: http://localhost:${PORT}/api/stream`);
  console.log(`   🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`   📊 ${store.readings.length} readings, ${store.alerts.length} alerts loaded\n`);
});
