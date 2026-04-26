/**
 * InsightForge AI — API Client (v2 with auth)
 */

import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  withCredentials: true, // Send cookies with every request
  headers: { 'Accept': 'application/json' },
});

// ── Auth ──────────────────────────────────────────────────────
export async function register(email, username, password, fullName = '') {
  const res = await api.post('/auth/register', { email, username, password, full_name: fullName });
  return res.data;
}

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function logout() {
  const res = await api.post('/auth/logout');
  return res.data;
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}

// ── Upload ────────────────────────────────────────────────────
export async function uploadDataset(file, config = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('impute_strategy', config.impute_strategy || 'mean');
  formData.append('normalize', config.normalize !== false);
  formData.append('encode_categoricals', config.encode_categoricals !== false);
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: config.onProgress,
  });
  return res.data;
}

export async function getUploadStatus() {
  const res = await api.get('/upload/status');
  return res.data;
}

export async function downloadSampleDataset() {
  const res = await api.get('/sample-dataset', { responseType: 'blob' });
  return res.data;
}

export async function getJob(jobId) {
  return (await api.get(`/jobs/${jobId}`)).data;
}

// ── RAG Query ─────────────────────────────────────────────────
export async function queryDataset(question, options = {}) {
  const res = await api.post('/query', {
    question, role: options.role || 'analyst', top_k: options.top_k || 5,
    use_hybrid: options.use_hybrid !== false, stream: false,
  });
  return res.data;
}

export function queryStream(question, options = {}, onToken, onDone, onError) {
  fetch(`${API_BASE}/query/stream`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question, role: options.role || 'analyst', top_k: options.top_k || 5,
      use_hybrid: options.use_hybrid !== false, stream: true,
    }),
  })
    .then(async (response) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) onToken(data.token);
              if (data.message === 'Stream complete') onDone?.();
            } catch { /* skip malformed */ }
          }
        }
      }
      onDone?.();
    })
    .catch((err) => onError?.(err));
}

// ── Data ──────────────────────────────────────────────────────
export async function getSummary() { return (await api.get('/summary')).data; }
export async function getInsights(role = 'analyst') { return (await api.get('/insights', { params: { role } })).data; }
export async function getPreview(rows = 10) { return (await api.get('/preview', { params: { rows } })).data; }
export async function getColumns() { return (await api.get('/columns')).data; }

// ── Datasets (saved projects) ──────────────────────────────────
export async function listDatasets() { return (await api.get('/datasets')).data; }
export async function activateDataset(datasetId) { return (await api.post(`/datasets/${datasetId}/activate`)).data; }
export async function deleteDataset(datasetId) { return (await api.delete(`/datasets/${datasetId}`)).data; }

// ── Pins (share links) ─────────────────────────────────────────
export async function createPin(title, contentType, contentData) {
  return (await api.post('/pins', { title, content_type: contentType, content_data: contentData })).data;
}
export async function listPins() { return (await api.get('/pins')).data; }
export async function getPin(pinId) {
  // public endpoint (no auth required), but keep it through axios instance for baseURL
  return (await api.get(`/pins/${pinId}`, { withCredentials: false })).data;
}

// ── Cleaning & EDA ────────────────────────────────────────────
export async function cleanData(options) { return (await api.post('/data/clean', options)).data; }
export async function getEDA() { return (await api.get('/data/eda')).data; }
export async function engineerFeatures() { return (await api.post('/data/engineer-features')).data; }
export async function exportData(format = 'csv') {
  const response = await api.get('/data/export', { params: { format }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `insightforge_export.${format === 'excel' ? 'xlsx' : format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// ── ML ────────────────────────────────────────────────────────
export async function runPrediction(targetColumn, featureColumns = null, testSize = 0.2) {
  return (await api.post('/ml/predict', { target_column: targetColumn, feature_columns: featureColumns, test_size: testSize })).data;
}
export async function runClustering(nClusters = null, featureColumns = null) {
  return (await api.post('/ml/cluster', { n_clusters: nClusters, feature_columns: featureColumns })).data;
}
export async function runAnomalyDetection(contamination = 0.05, featureColumns = null) {
  return (await api.post('/ml/anomaly', { contamination, feature_columns: featureColumns })).data;
}
export async function runForecasting(dateColumn, targetColumn, periods = 30) {
  return (await api.post('/ml/forecast', { date_column: dateColumn, target_column: targetColumn, periods })).data;
}

// ── History & Report ──────────────────────────────────────────
export async function getChatHistory() { return (await api.get('/history')).data; }
export async function clearChatHistory() { return (await api.delete('/history')).data; }
export async function generateReport(role = 'analyst') { return (await api.post('/report', null, { params: { role } })).data; }

export default api;
