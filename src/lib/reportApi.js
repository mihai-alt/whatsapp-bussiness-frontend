import { api, unwrapApiData } from './api';

export function compactParams(input = {}) {
  const params = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (value === 'all' && key !== 'range') return;
    params[key] = value;
  });
  return params;
}

export async function fetchReportMeta() {
  return unwrapApiData(await api.get('/api/reports/meta')) || {};
}

export async function fetchReportOverview(params) {
  return unwrapApiData(await api.get('/api/reports/overview', { params: compactParams(params) })) || {};
}

export async function fetchMessagePerformance(params) {
  return unwrapApiData(await api.get('/api/reports/message-performance', { params: compactParams(params) })) || {
    data: [],
  };
}

export async function fetchReportList(path, params) {
  const res = await api.get(path, { params: compactParams(params) });
  return {
    rows: Array.isArray(res.data?.data) ? res.data.data : [],
    pagination: res.data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 },
    timezone: res.data?.meta?.timezone,
  };
}

export async function fetchCampaignReport(id) {
  return unwrapApiData(await api.get(`/api/reports/campaigns/${id}`)) || {};
}

export async function fetchUsageReport(params) {
  return unwrapApiData(await api.get('/api/reports/usage', { params: compactParams(params) })) || {};
}

export async function retryFailedMessages(payload) {
  if (payload?.all) {
    return unwrapApiData(await api.post('/api/reports/failed/retry-all', { filters: payload.filters || {} }));
  }
  if (payload?.ids?.length === 1) {
    return unwrapApiData(await api.post('/api/reports/failed/retry', { id: payload.ids[0] }));
  }
  return unwrapApiData(await api.post('/api/reports/failed/retry-selected', { ids: payload?.ids || [] }));
}

export async function downloadReport(path, params, fallbackName) {
  try {
    const res = await api.get(path, {
      params: compactParams(params),
      responseType: 'blob',
    });
    const blob = res.data;
    const disposition = res.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || fallbackName || 'report.csv';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    const data = err?.response?.data;
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      const text = await data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.error?.message || json.message || 'Unable to export report');
      } catch (inner) {
        if (inner instanceof SyntaxError) throw new Error('Unable to export report');
        throw inner;
      }
    }
    throw err;
  }
}
