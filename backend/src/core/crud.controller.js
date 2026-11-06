import { asyncHandler } from '../utils/asyncHandler.js';

export const createCrudController = (service) => ({
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await service.list(req.query);
    res.json({ status: 'success', data: items, meta });
  }),

  get: asyncHandler(async (req, res) => {
    const item = await service.getById(Number(req.params.id));
    res.json({ status: 'success', data: item });
  }),

  create: asyncHandler(async (req, res) => {
    const item = await service.create(req.body, req.user.id);
    res.status(201).json({ status: 'success', data: item });
  }),

  update: asyncHandler(async (req, res) => {
    const item = await service.update(Number(req.params.id), req.body, req.user.id);
    res.json({ status: 'success', data: item });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.remove(Number(req.params.id), req.user.id);
    res.json({ status: 'success', message: 'Deleted' });
  }),
});