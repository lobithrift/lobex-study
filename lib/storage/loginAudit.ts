export interface LoginAuditRecord {
  id: string;
  email: string;
  displayName?: string;
  event: 'login' | 'signup' | 'demo_access';
  timestamp: string;
  formattedTime: string;
  ip: string;
  userAgent?: string;
  emailSent: boolean;
  sheetSynced?: boolean;
  statusMessage: string;
}

declare global {
  var __lobexLoginAuditStore: LoginAuditRecord[] | undefined;
}

if (!global.__lobexLoginAuditStore) {
  global.__lobexLoginAuditStore = [];
}

export const loginAuditStore: LoginAuditRecord[] = global.__lobexLoginAuditStore;

export function addLoginAuditRecord(record: Omit<LoginAuditRecord, 'id' | 'formattedTime'>): LoginAuditRecord {
  const dateObj = new Date(record.timestamp);
  const formattedTime = dateObj.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const entry: LoginAuditRecord = {
    ...record,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    formattedTime,
  };

  loginAuditStore.unshift(entry);

  if (loginAuditStore.length > 100) {
    loginAuditStore.length = 100;
  }

  return entry;
}
