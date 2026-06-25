const SENSITIVE_KEYS = new Set([
  'authorization',
  'cpf',
  'newPassword',
  'password',
  'token',
]);

const maskValue = (key: string, value: unknown): unknown => {
  if (key.toLowerCase() === 'cpf' && typeof value === 'string') {
    return value.replace(/^(\d{3})\d+(\d{2})$/, '$1******$2');
  }

  return '[redacted]';
};

export const sanitizeLogData = (data: unknown): unknown => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  return Object.entries(data as Record<string, unknown>).reduce(
    (acc, [key, value]) => {
      if (SENSITIVE_KEYS.has(key)) {
        acc[key] = maskValue(key, value);
        return acc;
      }

      acc[key] = sanitizeLogData(value);
      return acc;
    },
    {} as Record<string, unknown>
  );
};
