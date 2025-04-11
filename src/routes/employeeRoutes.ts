import express from 'express';
import {
  createEmployee,
  getEmployees,
  toggleEmployeeStatus,
  login,
  deleteSubAdminAndEmployees,
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Login não precisa de autenticação
router.post('/login', login);

// Apenas admin e sub_admin podem criar funcionários
router.post(
  '/employees',
  authenticate,
  authorize(['admin', 'sub_admin']),
  createEmployee
);

// Listar funcionários (admin e sub_admin com acesso limitado)
router.get(
  '/employees',
  authenticate,
  authorize(['admin', 'sub_admin']),
  getEmployees
);

// Alterar status do funcionário (apenas admin e sub_admin)
router.patch(
  '/employees/:id/status',
  authenticate,
  authorize(['admin', 'sub_admin']),
  toggleEmployeeStatus
);

// Excluir funcionário (apenas admin)
router.delete(
  '/employees/:id',
  authenticate,
  authorize(['admin']),
  deleteSubAdminAndEmployees
);

export default router;
