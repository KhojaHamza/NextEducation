import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit'; // AJOUT

import schoolYearsRoutes from './modules/schoolYears.module.js';
import classesRoutes from './modules/classes.module.js';
import subjectsRoutes from './modules/subjects.module.js';
import roomsRoutes from './modules/rooms.module.js';
import auditLogsRoutes from './routes/auditLogs.routes.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import teachersRoutes from './modules/teachers.module.js';
import parentsRoutes from './modules/parents.module.js';
import studentsRoutes from './modules/students.module.js';
import enrollmentsRoutes from './modules/enrollments.module.js';
import teachingAssignmentsRoutes from './modules/teachingAssignments.module.js';
import evaluationsRoutes from './modules/evaluations.module.js';
import absencesRoutes from './modules/absences.module.js';
import reportCardsRoutes from './modules/reportCards.module.js';
import feeItemsRoutes from './modules/feeItems.module.js';
import paymentsRoutes from './modules/payments.module.js';
import notificationsRoutes from './routes/notifications.routes.js';
import usersRoutes from './modules/users.module.js';
import messagesRoutes from './modules/messages.module.js';
import announcementsRoutes from './modules/announcements.module.js';
import pushRoutes from './routes/push.routes.js';

import timetableRoutes from './modules/timetable.module.js';

const app = express();

// AJOUT 1 : derrière Railway/Render, il y a un proxy. Sans cette ligne,
// le limiteur de tentatives verrait l'IP du proxy et bloquerait tout le monde ensemble.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
// AJOUT 2 : journaux plus complets en production
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// AJOUT 3 : max 10 tentatives de connexion / 15 min / IP
app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' },
  }),
);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/school-years', schoolYearsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

app.use('/api/teachers', teachersRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/teaching-assignments', teachingAssignmentsRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/absences', absencesRoutes);
app.use('/api/report-cards', reportCardsRoutes);

app.use('/api/fee-items', feeItemsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/push', pushRoutes);

app.use('/api/timetable', timetableRoutes);

// AJOUT 4 : Express sert le frontend compilé (frontend/dist), s'il existe.
// Ce bloc doit rester APRÈS les routes /api et AVANT notFound.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);
export default app;