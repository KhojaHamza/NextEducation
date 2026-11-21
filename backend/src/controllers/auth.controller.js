import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';

export const login = asyncHandler(async (req, res) => {
  const { schoolCode, email, password } = req.body;
  const result = await authService.login(schoolCode, email, password);
  res.json({ status: 'success', ...result });
});

export const platformLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.platformLogin(email, password);
  res.json({ status: 'success', ...result });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ status: 'success', user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ status: 'success', message: 'Password updated' });
});