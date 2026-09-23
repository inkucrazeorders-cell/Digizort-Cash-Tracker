export type TransactionCategory =
  | 'Recharge'
  | 'Online Shopping'
  | 'Food'
  | 'Movie'
  | 'Travel'
  | 'Tickets'
  | 'Games'
  | 'Borrowed Cash'
  | 'Gift'
  | 'Others';

export type TransactionStatus = RequestStatus;

export interface Friend {
  id: string;
  name: string;
  phone?: string;
  avatarSeed: string;
  totalBorrowed: number;
  totalPaid: number;
  totalPending: number;
  transactionCount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  isGuest: boolean;
  isLoggedIn: boolean;
}

export type RequestStatus =
  | 'Pending Review'
  | 'Accepted'
  | 'Rejected'
  | 'Processing'
  | 'Ordered'
  | 'Completed'
  | 'Waiting For Payment'
  | 'Partially Paid'
  | 'Paid'
  | 'Cancelled';

export type RequestType =
  | 'Product Purchase'
  | 'Online Service'
  | 'Recharge & Bill Pay'
  | 'Software & Games'
  | 'Travel & Tickets'
  | 'Custom Request'
  | 'Others';

export type TimelineEventType =
  | 'REQUEST_SUBMITTED'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'PROCESSING'
  | 'ORDERED'
  | 'WAITING_FOR_PAYMENT'
  | 'PARTIAL_PAYMENT'
  | 'TRANSACTION_COMPLETED'
  | 'CANCELLED'
  | 'NOTE_ADDED'
  | 'OFFER_APPLIED';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  timestamp: string; // ISO date string
  amountPaidThisStep?: number;
  totalPaidSoFar: number;
  remainingBalance: number;
  notes?: string;
  actor?: 'USER' | 'ADMIN';
}

export interface PriceAdjustment {
  id: string;
  previousAmount: number;
  newAmount: number;
  savings: number;
  reason?: string;
  message?: string;
  appliedAt: string;
  appliedBy: string;
}

export interface OrderRequest {
  id: string;
  userId: string;
  userMobile: string;
  userName: string;
  userEmail?: string;
  userAddress?: string;
  requestType: RequestType | string;
  productName: string;
  purpose: string;
  productLink?: string;
  expectedPrice: number;
  actualPrice: number; // Assigned price by admin
  amountPaid: number;
  remainingAmount: number;
  status: RequestStatus;
  description?: string;
  adminNotes?: string;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  // Special Supplier Offer & Price Adjustment Fields
  originalRequestedAmount?: number;
  currentOrderAmount?: number;
  offerApplied?: boolean;
  offerAmount?: number;
  discountAmount?: number;
  offerMessage?: string;
  offerUpdatedAt?: string;
  offerUpdatedBy?: string;
  priceAdjustments?: PriceAdjustment[];
  // Extra fields for rejection, payment, and grouping
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionNote?: string;
  extraCash?: number;
  extraCashPaid?: number;
  cashReceived?: number;
  groupPaymentId?: string;
  // Compatibility fields for transaction legacy support
  amount?: number;
  category?: string;
  date?: string;
  friendName?: string;
  phone?: string;
  notes?: string;
}

export interface GroupPayment {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  requestIds: string[];
  requestTitles?: string[];
  totalDue: number;
  amountReceived: number;
  amountSettled: number;
  extraCash: number;
  extraCashPaid?: number;
  paymentDate: string;
  createdAt: string;
  createdBy: 'ADMIN' | string;
  status: 'PAID' | 'PARTIALLY_PAID';
  notes?: string;
  adminSignature?: string;
}

export type BalanceTransactionType =
  | 'Balance Added'
  | 'Balance Used'
  | 'Balance Returned'
  | 'Balance Paid'
  | 'Money Requested'
  | 'Balance Adjustment';

export interface BalanceTransaction {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  type: BalanceTransactionType;
  amount: number;
  previousBalance: number;
  remainingBalance: number;
  date: string;
  time: string;
  timestamp: string;
  reason?: string;
  relatedRequestId?: string;
  relatedRequestTitle?: string;
  relatedGroupPaymentId?: string;
  relatedBalanceRequestId?: string;
  status?: 'Completed' | 'Pending' | 'Rejected' | 'Cancelled';
  actor: 'ADMIN' | 'USER';
  notes?: string;
}

export type BalanceRequestStatus = 'Pending' | 'Paid' | 'Rejected' | 'Cancelled';

export interface BalanceRequest {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  amount: number;
  status: BalanceRequestStatus;
  userNotes?: string;
  adminNotes?: string;
  date: string;
  time: string;
  timestamp: string;
  processedAt?: string;
  processedBy?: string;
  payoutMethod?: string;
  balanceTransactionId?: string;
}

export type Transaction = OrderRequest; // Alias for seamless compatibility

export interface AppUser {
  id: string;
  mobileNumber: string;
  fullName: string;
  email?: string;
  address?: string;
  profilePhoto?: string;
  status: 'active' | 'suspended';
  role: 'user' | 'admin';
  createdAt: string;
  lastLoginAt?: string;
  pin?: string;
  creditBalance?: number;
}

export type NotificationType =
  | 'status_change'
  | 'payment_recorded'
  | 'request_submitted'
  | 'new_request'
  | 'balance_request'
  | 'balance_added'
  | 'new_user'
  | 'request_cancelled'
  | 'special_offer'
  | 'info';

export interface AppNotification {
  id: string;
  targetUserMobile: string; // 'ADMIN' or specific user mobile
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  readAt?: string;
  requestId?: string;
  userId?: string;
  userMobile?: string;
  userName?: string;
  amount?: number;
  reason?: string;
  newBalance?: number;
  relatedRequestId?: string;
  relatedBalanceRequestId?: string;
  relatedTransactionId?: string;
  originalPrice?: number;
  offerPrice?: number;
  savings?: number;
}

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD';

export interface UserSettings {
  darkMode: boolean;
  currency: CurrencyCode;
  currencySymbol: string;
  adminCode: string;
}

export interface FilterOptions {
  searchQuery: string;
  status: 'All' | RequestStatus;
  requestType: string;
  timeframe: 'All' | 'Today' | 'This Week' | 'This Month' | 'This Year';
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'name-asc';
}
