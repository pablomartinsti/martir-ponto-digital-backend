import express from 'express';
import {
  createSubAdmin,
  getAllCompanies,
} from '../controllers/companyController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Apenas admin geral pode criar sub admins
router.post('/sub-admin', authenticate, authorize(['admin']), createSubAdmin);
router.get('/companies', authenticate, authorize(['admin']), getAllCompanies);

export default router;
