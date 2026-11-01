import { z } from 'zod';
import { createCrudService } from '../core/crud.service.js';
import { createCrudController } from '../core/crud.controller.js';
import { createCrudRouter } from '../core/crud.router.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(50),
  capacity: z.number().int().positive().max(200),
  isAvailable: z.boolean().optional(),
});
const updateSchema = createSchema.partial();

const service = createCrudService({
  model: 'room',
  entity: 'Room',
  orderBy: { name: 'asc' },
  searchFields: ['name'],
  // When the timetable exists (step 9), beforeDelete will check scheduled courses
});

export default createCrudRouter({
  controller: createCrudController(service),
  createSchema,
  updateSchema,
  readRoles: ['ADMIN', 'TEACHER'],
});