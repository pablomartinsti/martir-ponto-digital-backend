import { deleteSubAdminSchema } from '../../dtos/employee/employeeSchemas';
import { Absence } from '../../models/Absence';
import { Company } from '../../models/Company';
import { Employee } from '../../models/Employee';
import { TimeRecord } from '../../models/TimeRecord';
import { WorkSchedule } from '../../models/WorkSchedule';
import { AppError } from '../../errors/AppError';

interface DeleteSubAdminServiceParams {
  params: unknown;
}

export const deleteSubAdminService = async ({ params }: DeleteSubAdminServiceParams) => {
  const { id } = deleteSubAdminSchema.parse(params);

  const subAdmin = await Employee.findById(id);
  if (!subAdmin || subAdmin.role !== 'sub_admin') {
    throw new AppError('Sub admin nao encontrado.', 404);
  }

  const companyId = subAdmin.companyId;
  const employees = await Employee.find({ companyId, role: 'employee' });
  const employeeIds = employees.map((employee) => employee._id);

  await WorkSchedule.deleteMany({ employeeId: { $in: employeeIds } });
  await TimeRecord.deleteMany({ employeeId: { $in: employeeIds } });
  await Absence.deleteMany({ employeeId: { $in: employeeIds } });
  await Employee.deleteMany({ _id: { $in: employeeIds } });
  await Employee.findByIdAndDelete(id);

  const stillHasSubAdmins = await Employee.exists({
    companyId,
    role: 'sub_admin',
  });

  if (!stillHasSubAdmins) {
    await Company.findByIdAndDelete(companyId);
  }

  return {
    message:
      'Sub admin, funcionarios e dados associados foram excluidos com sucesso.',
  };
};
