import { UserAccount } from './types';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function hasActiveSubscription(account: UserAccount | null | undefined): boolean {
  return account?.subscribed === true && account.status === 'active';
}

export function isValidUserAccountSnapshot(data: unknown): UserAccount | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const plan = record.plan;
  const billingCycle = record.billingCycle;
  const status = record.status;

  if (
    !isString(record.uid) ||
    !isString(record.email) ||
    !isBoolean(record.subscribed) ||
    !isString(record.createdAt) ||
    !isString(status) ||
    !['active', 'canceled', 'paused'].includes(status) ||
    !(plan === null || ['Mobile', 'Standard', 'Premium'].includes(String(plan))) ||
    !(billingCycle === null || ['monthly', 'yearly'].includes(String(billingCycle))) ||
    !isNullableString(record.nextPaymentDate) ||
    !isNullableString(record.cardLast4) ||
    !isNullableString(record.cardBrand)
  ) {
    return null;
  }

  return {
    uid: record.uid,
    email: record.email,
    subscribed: record.subscribed,
    plan: plan as UserAccount['plan'],
    billingCycle: billingCycle as UserAccount['billingCycle'],
    nextPaymentDate: record.nextPaymentDate,
    cardLast4: record.cardLast4,
    cardBrand: record.cardBrand,
    status: status as UserAccount['status'],
    createdAt: record.createdAt,
  };
}
