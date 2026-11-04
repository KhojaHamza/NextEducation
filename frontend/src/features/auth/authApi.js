import { api } from '../../api/client.js';

export const changePassword = ({ currentPassword, newPassword }) =>
  api('/auth/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
    expireSession: false, // a wrong current password must not log the person out
  });