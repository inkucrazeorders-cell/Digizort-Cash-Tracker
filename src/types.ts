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
  | 'OFFER_APPLIED'
  | 'BALANCE_USED'
  | 'BALANCE_REFUNDED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_VERIFICATION_SUBMITTED'
  | 'PAYMENT_VERIFICATION_STARTED'
  | 'PAYMENT_VERIFICATION_REJECTED';

export type PaymentVerificationMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';
export type PaymentVerificationStatus = 'Pending' | 'Verifying' | 'Approved' | 'Rejected';

export interface PaymentVerification {
  id: string; // e.g. PV-000123
  requestId: string;
  userId: string;
  userName: string;
  userMobile: string;
  paymentMethod: PaymentVerificationMethod | string;
  customPaymentMethod?: string;
  amountClaimed: number;
  transactionId?: string; // UTR or Reference ID
  userNote?: string;
  proofUrl?: string;
  status: PaymentVerificationStatus;
  submittedAt: string; // ISO date string
  verificationStartedAt?: string;
  verificationStartedBy?: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  adminNotes?: string;
}

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
  rejectionReason?: string;
  extraCash?: number;
  extraCashPaid?: number;
  cashReceived?: number;
  groupPaymentId?: string;
  // Automatic Customer Submission WhatsApp tracking (Workflow 2)
  submissionWhatsAppStatus?: 'pending' | 'sent' | 'failed';
  submissionWhatsAppMessageId?: string;
  submissionWhatsAppSentAt?: string;
  submissionWhatsAppError?: string;
  // Universal Balance Payment fields
  balanceUsed?: number;
  externalPaymentPaid?: number;
  paymentMethodUsed?: 'DIGIZORT Balance' | 'External Payment' | 'Split Payment' | string;
  balanceRefunded?: number;
  // User Payment Verification Request System
  activePaymentVerification?: PaymentVerification;
  paymentVerificationHistory?: PaymentVerification[];
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
  | 'Balance Adjustment'
  | 'Balance Reversal'
  | 'Balance Correction'
  | 'Balance Debit';

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
  relatedTransactionId?: string;
  status?: 'Completed' | 'Pending' | 'Rejected' | 'Cancelled' | 'Reversed' | 'Corrected';
  actor: 'ADMIN' | 'USER';
  notes?: string;
  // Audit metadata for Admin-granted balance management
  isReversible?: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  reversalTransactionId?: string;
  correctedAt?: string;
  correctedBy?: string;
  correctionReason?: string;
  correctionTransactionId?: string;
  originalCreditAmount?: number;
  newIntendedAmount?: number;
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
  nickname?: string;
  bio?: string;
  email?: string;
  address?: string;
  profilePhoto?: string;
  status: 'active' | 'suspended';
  role: 'user' | 'admin';
  createdAt: string;
  lastLoginAt?: string;
  pin?: string;
  passwordHash?: string;
  passwordSalt?: string;
  hasPassword?: boolean;
  passwordUpdatedAt?: string;
  creditBalance?: number;
  preferredLanguage?: string;
  notificationPreferences?: {
    push: boolean;
    whatsapp: boolean;
    email: boolean;
  };
}

export type SupportTicketType = 'feedback' | 'suggestion' | 'problem';

export type SupportTicketStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Responded'
  | 'Resolved'
  | 'Closed';

export interface SupportMessage {
  id: string;
  sender: 'USER' | 'ADMIN';
  senderName: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
}

export interface SupportTechnicalContext {
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  currentSection?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userMobile: string;
  userName: string;
  userNickname?: string;
  type: SupportTicketType;
  category: string;
  subject: string;
  description: string;
  attachmentUrl?: string;
  relatedRequestId?: string;
  technicalContext?: SupportTechnicalContext;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  adminNotes?: string;
}

export type AnnouncementType =
  | 'General Update'
  | 'Maintenance'
  | 'New Feature'
  | 'Event'
  | 'Reward'
  | 'Important Notice'
  | 'Service Update';

export type AnnouncementAudienceType =
  | 'everyone'
  | 'selected_users'
  | 'specific_user'
  | 'service_users';

export type AnnouncementStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'expired'
  | 'archived';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  imageUrl?: string;
  audienceType: AnnouncementAudienceType;
  targetUserMobiles: string[]; // Mobile numbers of targeted users
  targetUserNames?: string[]; // Optional user names for display in Admin
  targetService?: RequestType | string; // Real service category
  recipientCount: number; // Computed number of targeted recipients
  sendPush: boolean; // Whether push notification was triggered
  status: AnnouncementStatus;
  scheduledAt?: string; // Optional schedule date/time ISO
  expiresAt?: string; // Optional expiration date/time ISO
  publishedAt?: string; // Published date/time ISO
  createdAt: string;
  updatedAt: string;
  createdBy: string; // 'DIGIZORT Admin'
  readByUserMobiles: string[]; // List of user mobile numbers who have read this announcement
}

export type NotificationType =
  | 'status_change'
  | 'payment_recorded'
  | 'request_submitted'
  | 'new_request'
  | 'balance_request'
  | 'balance_added'
  | 'new_user'
  | 'support_ticket'
  | 'support_response'
  | 'request_cancelled'
  | 'special_offer'
  | 'payment_verification_submitted'
  | 'payment_verification_started'
  | 'payment_verification_approved'
  | 'payment_verification_rejected'
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
  proactiveAIEnabled?: boolean;
}

export interface ProactiveAIConfig {
  enabled: boolean;
  triggerDelaySeconds: number;
  errorThreshold: number;
  cooldownMinutes: number;
  maxPromptsPerSession: number;
  voicePromptEnabled: boolean;
  robotAnimationEnabled: boolean;
}

export interface ProactiveAIAnalytics {
  promptsTriggered: number;
  helpAccepted: number;
  helpDismissed: number;
  voiceAssistanceUsed: number;
}

export interface FilterOptions {
  searchQuery: string;
  status: 'All' | RequestStatus;
  requestType: string;
  timeframe: 'All' | 'Today' | 'This Week' | 'This Month' | 'This Year';
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'name-asc';
}
