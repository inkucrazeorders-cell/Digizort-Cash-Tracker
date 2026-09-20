import { OrderRequest, GroupPayment, BalanceTransaction, BalanceRequest } from '../types';

/**
 * Returns whether a request is rejected.
 */
export function isRequestRejected(request: OrderRequest): boolean {
  return request.status === 'Rejected' || !!request.rejectedAt;
}

/**
 * Returns whether a request is cancelled.
 */
export function isRequestCancelled(request: OrderRequest): boolean {
  return request.status === 'Cancelled';
}

/**
 * Returns whether a request is fully paid.
 */
export function isRequestFullyPaid(request: OrderRequest): boolean {
  if (isRequestRejected(request) || isRequestCancelled(request)) return false;
  if (request.status === 'Paid') return true;
  const price = getRequestPrice(request);
  const paid = request.amountPaid || 0;
  const remaining = request.remainingAmount !== undefined ? request.remainingAmount : Math.max(0, price - paid);
  return remaining === 0 && (paid > 0 || price === 0);
}

/**
 * Gets effective price of a request.
 */
export function getRequestPrice(request: OrderRequest): number {
  return Number(request.actualPrice) || Number(request.expectedPrice) || Number(request.amount) || 0;
}

/**
 * Gets effective amount paid on a request.
 * Rejected and cancelled requests do not count toward total paid or balance calculations.
 */
export function getRequestPaid(request: OrderRequest): number {
  if (isRequestRejected(request) || isRequestCancelled(request)) {
    return 0;
  }
  if (request.status === 'Paid') {
    return Math.max(request.amountPaid || 0, getRequestPrice(request));
  }
  return Number(request.amountPaid) || 0;
}

/**
 * Gets remaining due balance on a request.
 * Rejected, Cancelled, and Paid requests always return 0.
 */
export function getRequestRemaining(request: OrderRequest): number {
  if (isRequestRejected(request) || isRequestCancelled(request) || request.status === 'Paid') {
    return 0;
  }
  const total = getRequestPrice(request);
  const paid = Number(request.amountPaid) || 0;
  if (request.remainingAmount !== undefined && request.remainingAmount !== null) {
    return Math.max(0, Number(request.remainingAmount));
  }
  return Math.max(0, total - paid);
}

/**
 * Returns whether a request is eligible to be grouped or paid.
 * Must NOT be: Rejected, Cancelled, or already fully paid.
 */
export function isRequestEligibleForPayment(request: OrderRequest): boolean {
  if (isRequestRejected(request) || isRequestCancelled(request)) return false;
  if (request.status === 'Paid') return false;
  const remaining = getRequestRemaining(request);
  return remaining > 0;
}

/**
 * Summary calculations for a user or system-wide collection of requests.
 */
export interface AccountFinancialSummary {
  totalRequests: number;
  activeRequests: number;
  rejectedRequests: number;
  completedRequests: number;
  totalRequestAmount: number;
  totalPaid: number;
  totalPending: number;
  totalExtraCash: number;
  outstandingBalance: number;
}

export function calculateAccountSummary(
  requests: OrderRequest[],
  groupPayments: GroupPayment[] = []
): AccountFinancialSummary {
  let activeRequests = 0;
  let rejectedRequests = 0;
  let completedRequests = 0;
  let totalRequestAmount = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalExtraCash = 0;

  for (const req of requests) {
    if (isRequestRejected(req)) {
      rejectedRequests++;
      continue; // Excluded from active, totalRequestAmount, totalPaid, totalPending
    }

    if (isRequestCancelled(req)) {
      continue; // Excluded from balances
    }

    const price = getRequestPrice(req);
    const paid = getRequestPaid(req);
    const remaining = getRequestRemaining(req);

    totalRequestAmount += price;
    totalPaid += paid;
    totalPending += remaining;

    if (req.extraCash && req.extraCash > 0) {
      totalExtraCash += req.extraCash;
    }

    if (req.status === 'Paid' || req.status === 'Completed' || remaining === 0) {
      completedRequests++;
    } else {
      activeRequests++;
    }
  }

  // Also accumulate extra cash from group payments (if not already counted)
  for (const gp of groupPayments) {
    if (gp.extraCash && gp.extraCash > 0) {
      totalExtraCash += gp.extraCash;
    }
  }

  return {
    totalRequests: requests.length,
    activeRequests,
    rejectedRequests,
    completedRequests,
    totalRequestAmount,
    totalPaid,
    totalPending,
    totalExtraCash,
    outstandingBalance: Math.max(0, totalPending),
  };
}

/**
 * Splits cash received across multiple requests (supports extra cash and partial allocation).
 */
export interface PaymentAllocationResult {
  amountSettled: number;
  extraCash: number;
  newRemainingTotal: number;
  requestAllocations: {
    requestId: string;
    previousPaid: number;
    allocatedPayment: number;
    newTotalPaid: number;
    newRemaining: number;
    newStatus: 'Paid' | 'Partially Paid';
  }[];
}

export function allocatePaymentAcrossRequests(
  requests: OrderRequest[],
  cashReceived: number
): PaymentAllocationResult {
  const totalDue = requests.reduce((sum, r) => sum + getRequestRemaining(r), 0);
  let unallocated = Math.max(0, cashReceived);
  const requestAllocations: PaymentAllocationResult['requestAllocations'] = [];

  for (const req of requests) {
    const due = getRequestRemaining(req);
    const prevPaid = Number(req.amountPaid) || 0;
    const price = getRequestPrice(req);

    const allocation = Math.min(unallocated, due);
    unallocated -= allocation;

    const newTotalPaid = prevPaid + allocation;
    const newRemaining = Math.max(0, price - newTotalPaid);
    const newStatus = newRemaining === 0 ? 'Paid' : 'Partially Paid';

    requestAllocations.push({
      requestId: req.id,
      previousPaid: prevPaid,
      allocatedPayment: allocation,
      newTotalPaid,
      newRemaining,
      newStatus,
    });
  }

  const amountSettled = Math.min(cashReceived, totalDue);
  const extraCash = Math.max(0, cashReceived - totalDue);
  const newRemainingTotal = Math.max(0, totalDue - cashReceived);

  return {
    amountSettled,
    extraCash,
    newRemainingTotal,
    requestAllocations,
  };
}

/**
 * Calculates current available balance and retrieves transaction history for a customer.
 */
export function getUserAvailableBalance(
  userMobile: string,
  userId?: string,
  balanceTransactions: BalanceTransaction[] = [],
  userRequests: OrderRequest[] = [],
  groupPayments: GroupPayment[] = [],
  balanceRequests: BalanceRequest[] = []
): {
  availableBalance: number;
  pendingRequestedAmount: number;
  requestableBalance: number;
  transactions: BalanceTransaction[];
  balanceRequests: BalanceRequest[];
  hasTransactions: boolean;
  statusText: string;
} {
  const userTx = balanceTransactions.filter(
    (tx) => (userMobile && tx.userMobile === userMobile) || (userId && tx.userId === userId)
  );

  // Sort chronological ascending
  userTx.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Filter user balance requests
  const userBReqs = balanceRequests.filter(
    (br) => (userMobile && br.userMobile === userMobile) || (userId && br.userId === userId)
  );
  userBReqs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first

  const pendingRequests = userBReqs.filter((br) => br.status === 'Pending');
  const pendingRequestedAmount = pendingRequests.reduce((sum, br) => sum + (Number(br.amount) || 0), 0);

  // Find the latest balance-altering transaction (exclude 'Money Requested' which doesn't alter authoritative balance)
  const balanceAlteringTx = userTx.filter((tx) => tx.type !== 'Money Requested');

  let availableBalance = 0;
  let hasTransactions = userTx.length > 0;

  if (balanceAlteringTx.length > 0) {
    const latest = balanceAlteringTx[balanceAlteringTx.length - 1];
    availableBalance = Math.max(0, latest.remainingBalance);
  } else {
    // Fallback to legacy/initial extra cash if no balance transactions have been logged yet
    let initialExtra = 0;
    for (const r of userRequests) {
      if (!isRequestRejected(r) && !isRequestCancelled(r) && r.extraCash && r.extraCash > 0) {
        initialExtra += r.extraCash;
      }
    }
    for (const gp of groupPayments) {
      if (gp.extraCash && gp.extraCash > 0) {
        initialExtra += gp.extraCash;
      }
    }
    availableBalance = initialExtra;
  }

  const requestableBalance = Math.max(0, availableBalance - pendingRequestedAmount);

  let statusText = 'No Outstanding Balance';
  if (availableBalance > 0) {
    if (pendingRequestedAmount > 0) {
      statusText = `Pending Request: ₹${pendingRequestedAmount}`;
    } else {
      statusText = 'Active Balance';
    }
  } else if (hasTransactions) {
    statusText = 'Balance Cleared';
  }

  return {
    availableBalance,
    pendingRequestedAmount,
    requestableBalance,
    transactions: [...userTx].reverse(), // newest first
    balanceRequests: userBReqs,
    hasTransactions,
    statusText,
  };
}

