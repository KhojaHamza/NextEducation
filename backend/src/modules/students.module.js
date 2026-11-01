import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as students from '../services/students.service.js';
import { exportStudentsCsv, importStudentsCsv } from '../services/studentsCsv.service.js';

const parentLink = z.object({
  parentId: z.number().int().positive(),
  relationship: z.enum(['father', 'mother', 'guardian']),
});

const fields = {
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  birthDate: z.coerce.date().refine((d) => d < new Date(), 'Birth date must be in the past'),
  gender: z.enum(['MALE', 'FEMALE']),
  medicalNotes: z.string().trim().max(1000).optional(),
};

const createSchema = z.object({
  ...fields,
  entryYearId: z.number().int().positive().optional(),
  classId: z.number().int().positive().optional(),
  parents: z.array(parentLink).max(4).optional(),
});
const updateSchema = z.object(fields).partial();
const parentsSchema = z.object({ parents: z.array(parentLink).max(4) });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /\.csv$/i.test(file.originalname) ? cb(null, true) : cb(new AppError('Only .csv files are accepted', 400)),
});

const readRoles = ['ADMIN', 'ACCOUNTANT', 'TEACHER'];
const writeRoles = ['ADMIN', 'ACCOUNTANT'];

const router = Router();
router.use(authenticate);
router.param('id', (req, res, next, v) => (/^\d+$/.test(v) ? next() : next(new AppError('Invalid id', 400))));

// Fixed paths first, before /:id
router.get('/mine', authorize('PARENT'), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await students.listChildrenOfUser(req.user.id) });
}));

router.get('/export', authorize(...writeRoles), asyncHandler(async (req, res) => {
  const { filename, content } = await exportStudentsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}));

router.post('/import', authorize(...writeRoles), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Attach a CSV file in the "file" field', 400);
  const result = await importStudentsCsv(req.file.buffer, req.user.id);
  res.status(201).json({ status: 'success', ...result });
}));

router.get('/', authorize(...readRoles), asyncHandler(async (req, res) => {
  const { items, meta } = await students.listStudents(req.query);
  res.json({ status: 'success', data: items, meta });
}));

router.get('/:id', authorize(...readRoles), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await students.getStudent(Number(req.params.id)) });
}));

router.post('/', authorize(...writeRoles), validate(createSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', data: await students.createStudent(req.body, req.user.id) });
}));

router.patch('/:id', authorize(...writeRoles), validate(updateSchema), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await students.updateStudent(Number(req.params.id), req.body, req.user.id) });
}));

router.put('/:id/parents', authorize(...writeRoles), validate(parentsSchema), asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await students.setParents(Number(req.params.id), req.body.parents, req.user.id) });
}));

router.delete('/:id', authorize(...writeRoles), asyncHandler(async (req, res) => {
  await students.deleteStudent(Number(req.params.id), req.user.id);
  res.json({ status: 'success', message: 'Deleted' });
}));

export default router;