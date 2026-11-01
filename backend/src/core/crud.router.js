import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { AppError } from '../utils/AppError.js';

export const createCrudRouter = ({
  controller,
  createSchema,
  updateSchema,
  readRoles = null,        // null = any authenticated user
  writeRoles = ['ADMIN'],
}) => {
  const router = Router();
  const read = readRoles ? [authorize(...readRoles)] : [];

  router.use(authenticate);
  router.param('id', (req, res, next, value) => {
    if (!/^\d+$/.test(value)) return next(new AppError('Invalid id', 400));
    next();
  });

  router.get('/', ...read, controller.list);
  router.get('/:id', ...read, controller.get);
  router.post('/', authorize(...writeRoles), validate(createSchema), controller.create);
  router.patch('/:id', authorize(...writeRoles), validate(updateSchema), controller.update);
  router.delete('/:id', authorize(...writeRoles), controller.remove);

  return router;
};