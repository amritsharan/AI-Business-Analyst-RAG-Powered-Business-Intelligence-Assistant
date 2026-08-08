const API_BASE = '/api';

export async function fetchDashboard() {
  const response = await fetch(`${API_BASE}/dashboard`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics');
  }
  return response.json();
}

export async function fetchAnalytics() {
  const response = await fetch(`${API_BASE}/analytics`);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics metrics');
  }
  return response.json();
}

export async function fetchDocuments() {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch document library');
  }
  return response.json();
}

export async function sendChatMessage(question, sessionId = 'default_session') {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, session_id: sessionId }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to send chat message');
  }
  return response.json();
}

export async function fetchChatHistory(sessionId = 'default_session') {
  const response = await fetch(`${API_BASE}/chat/history?session_id=${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch chat history');
  }
  return response.json();
}

export async function clearChatHistory(sessionId = 'default_session') {
  const response = await fetch(`${API_BASE}/chat/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!response.ok) {
    throw new Error('Failed to clear chat history');
  }
  return response.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload document');
  }
  return response.json();
}

export async function rebuildIndex() {
  const response = await fetch(`${API_BASE}/index/rebuild`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to trigger index rebuild');
  }
  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error('Backend is offline');
  }
  return response.json();
}
