import { api } from '../../api/client.js';

const query = (params) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return qs ? `?${qs}` : '';
};

export const listSchools = (params = {}) => api(`/platform/schools${query(params)}`);
export const createSchool = (body) => api('/platform/schools', { method: 'POST', body });
export const setSchoolStatus = (id, status) =>
  api(`/platform/schools/${id}/status`, { method: 'PATCH', body: { status } });
export const resetAdminPassword = (id, email) =>
  api(`/platform/schools/${id}/admin-password-reset`, { method: 'POST', body: { email } });
export const listAuditLogs = () => api('/platform/audit-logs?limit=20');