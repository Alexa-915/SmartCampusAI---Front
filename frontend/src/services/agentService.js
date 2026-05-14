const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function analizarDataset(datasetId) {
  const res = await fetch(`${BASE_URL}/api/agent/analizar/${datasetId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function chatAgente(datasetId, pregunta, historial = []) {
  const res = await fetch(`${BASE_URL}/api/agent/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ dataset_id: datasetId, pregunta, historial }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}