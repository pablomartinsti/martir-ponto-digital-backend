import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import 'dotenv/config';
import { Employee } from '../models/Employee';

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('MONGO_URI nao definida no .env');
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  token?: string;
  body?: unknown;
  expectedStatus?: number | number[];
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: string;
    companyId?: string;
  };
}

interface SubAdminResponse {
  subAdmin: {
    id: string;
    companyId: string;
  };
}

interface CreatedEmployeeResponse {
  _id?: string;
  id?: string;
  companyId?: string;
}

interface TimeRecordResponse {
  _id: string;
  date: string;
}

const randomDigits = (length: number): string => {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += Math.floor(Math.random() * 10).toString();
  }
  return value;
};

const todayDayName = (): string => {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  return days[new Date().getDay()];
};

const assertStatus = (
  status: number,
  expectedStatus: number | number[],
  path: string,
  responseBody: unknown
): void => {
  const validStatuses = Array.isArray(expectedStatus)
    ? expectedStatus
    : [expectedStatus];

  if (!validStatuses.includes(status)) {
    throw new Error(
      `Falha em ${path}. Esperado status ${validStatuses.join(' ou ')}, recebido ${status}. Resposta: ${JSON.stringify(responseBody)}`
    );
  }
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const responseBody = text ? JSON.parse(text) : null;

  if (options.expectedStatus) {
    assertStatus(response.status, options.expectedStatus, path, responseBody);
  }

  return responseBody as T;
}

async function ensureAdmin(): Promise<void> {
  await mongoose.connect(MONGO_URI as string);

  const cpf = '10274398613';
  const existing = await Employee.findOne({ cpf });

  if (!existing) {
    const hashedPassword = await bcrypt.hash('pa26ka29', 10);

    await Employee.create({
      name: 'Admin Master',
      cpf,
      password: hashedPassword,
      role: 'admin',
      position: 'Administrador',
      isActive: true,
    });
  }

  await mongoose.disconnect();
}

async function main(): Promise<void> {
  console.log('Iniciando smoke test do backend...');
  console.log(`API: ${API_URL}`);

  await ensureAdmin();

  const adminLogin = await request<LoginResponse>('/login', {
    method: 'POST',
    body: {
      cpf: '10274398613',
      password: 'pa26ka29',
    },
    expectedStatus: 200,
  });

  console.log('OK - Login admin');

  const suffix = randomDigits(6);
  const latitude = -18.9186;
  const longitude = -48.2772;

  const subAdmin = await request<SubAdminResponse>('/sub-admin', {
    method: 'POST',
    token: adminLogin.token,
    body: {
      name: `Sub Admin Teste ${suffix}`,
      cpf: `2${randomDigits(10)}`,
      password: '12345678',
      companyName: `Empresa Teste ${suffix}`,
      cnpj: `1${randomDigits(13)}`,
      position: 'Gestor',
      latitude,
      longitude,
    },
    expectedStatus: 201,
  });

  console.log('OK - Criacao de sub_admin e empresa');

  const employeeCpf = `3${randomDigits(10)}`;
  const employee = await request<CreatedEmployeeResponse>('/employees', {
    method: 'POST',
    token: adminLogin.token,
    body: {
      name: `Funcionario Teste ${suffix}`,
      cpf: employeeCpf,
      password: '12345678',
      position: 'Funcionario',
      companyId: subAdmin.subAdmin.companyId,
    },
    expectedStatus: 201,
  });

  const employeeId = employee._id || employee.id;

  if (!employeeId) {
    throw new Error(`Funcionario criado sem id: ${JSON.stringify(employee)}`);
  }

  console.log('OK - Criacao de funcionario');

  await request('/work-schedules', {
    method: 'POST',
    token: adminLogin.token,
    body: {
      employeeId,
      customDays: [
        {
          day: todayDayName(),
          start: '00:00',
          end: '23:59',
          hasLunch: true,
          expectedLunchBreakMinutes: 0,
          isDayOff: false,
        },
      ],
    },
    expectedStatus: [200, 201],
  });

  console.log('OK - Criacao de escala');

  const employeeLogin = await request<LoginResponse>('/login', {
    method: 'POST',
    body: {
      cpf: employeeCpf,
      password: '12345678',
    },
    expectedStatus: 200,
  });

  console.log('OK - Login funcionario');

  const clockIn = await request<TimeRecordResponse>('/clock-in', {
    method: 'POST',
    token: employeeLogin.token,
    body: { latitude, longitude },
    expectedStatus: 201,
  });

  console.log('OK - Clock-in');

  await request('/clock-in', {
    method: 'POST',
    token: employeeLogin.token,
    body: { latitude, longitude },
    expectedStatus: 400,
  });

  console.log('OK - Bloqueio de clock-in duplicado');

  await request('/lunch-start', {
    method: 'POST',
    token: employeeLogin.token,
    body: { recordId: clockIn._id, latitude, longitude },
    expectedStatus: 200,
  });

  console.log('OK - Lunch-start');

  await request('/lunch-end', {
    method: 'POST',
    token: employeeLogin.token,
    body: { recordId: clockIn._id, latitude, longitude },
    expectedStatus: 200,
  });

  console.log('OK - Lunch-end');

  await request('/clock-out', {
    method: 'POST',
    token: employeeLogin.token,
    body: { recordId: clockIn._id, latitude, longitude },
    expectedStatus: 200,
  });

  console.log('OK - Clock-out');

  await request('/lunch-start', {
    method: 'POST',
    token: employeeLogin.token,
    body: { recordId: clockIn._id, latitude, longitude },
    expectedStatus: 400,
  });

  console.log('OK - Bloqueio de ponto apos jornada finalizada');

  await request('/time-records/today', {
    method: 'GET',
    token: employeeLogin.token,
    expectedStatus: 200,
  });

  console.log('OK - Consulta do registro de hoje');

  await request(
    `/time-records?startDate=${clockIn.date}&endDate=${clockIn.date}&period=day`,
    {
      method: 'GET',
      token: employeeLogin.token,
      expectedStatus: 200,
    }
  );

  console.log('OK - Relatorio diario');
  console.log('Smoke test finalizado com sucesso.');
}

main().catch((error: unknown) => {
  console.error('Smoke test falhou.');
  console.error(error);
  process.exit(1);
});
