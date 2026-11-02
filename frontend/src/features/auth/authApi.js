import { api } from '../../api/client.js';

// Assumed route and field names. If your backend differs, change them here only.
export const changePassword = ({ currentPassword, newPassword }) =>
  api('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
    expireSession: false, // a wrong current password must not log the person out
  });