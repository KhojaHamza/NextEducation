import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { optionalEnum, optionalInt } from '../utils/query.js';
import { TERMS_ALL } from '../services/reportCard.service.js';
import { buildPedagogyDashboard } from '../services/pedagogy.service.js';

const router = Router();
router.use(authenticate);

// Tableau de bord pédagogique : moyennes, réussite/échec, matières, élèves en difficulté.
// ?term=T1|T2|T3|ANNUAL (défaut ANNUAL) et ?schoolYearId= (défaut : année en cours)
router.get('/pedagogique', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const term = optionalEnum(req.query.term, TERMS_ALL, 'term') ?? 'ANNUAL';
  const schoolYearId = optionalInt(req.query.schoolYearId, 'schoolYearId');
  const data = await buildPedagogyDashboard({ term, schoolYearId });
  res.json({ status: 'success', data });
}));

export default router;
