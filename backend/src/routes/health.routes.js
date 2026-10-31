import { Router } from 'express';
import { prisma } from '../config/prisma.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ database: 'connected' });
  } catch (err) {
    res.status(500).json({ database: 'error', message: err.message });
  }
});

export default router;