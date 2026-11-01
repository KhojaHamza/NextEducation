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

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(morgan('dev'));

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

app.use(notFound);
app.use(errorHandler);

export default app;