import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppUser,
  OrderRequest,
  RequestStatus,
  AppNotification,
  UserSettings,
  TimelineEvent,
  TimelineEventType,
  GroupPayment,
  BalanceTransaction,
  BalanceTransactionType,
  BalanceRequest,
  BalanceRequestStatus,
  PriceAdjustment,
} from '../types';
import {
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
  updateDoc,
  writeBatch,
} from '../lib/firebase';
import {
  getRequestPrice,
  getOriginalPrice,
  getOfferSavings,
  getRequestRemaining,
  isRequestRejected,
  getUserAvailableBalance,
} from '../lib/calculations';
import confetti from 'canvas-confetti';

interface AppContextType {
  currentUser: AppUser | null;
  isAdmin: boolean;
  appMode: 'auth' | 'user_portal' | 'admin_panel';
  userRequests: OrderRequest[];
  allRequests: OrderRequest[];
  allUsers: AppUser[];
  notifications: AppNotification[];
  groupPayments: GroupPayment[];
  balanceTransactions: BalanceTransaction[];
  settings: UserSettings;

  // Mobile Auth
  checkMobileRegistered: (mobileNumber: string) => Promise<AppUser | null>;
  registerUser: (userData: Omit<AppUser, 'id' | 'createdAt' | 'status' | 'role'>) => Promise<AppUser>;
  loginWithMobile: (mobileNumber: string, pin?: string) => Promise<void>;
  loginAsAdmin: (adminCode: string) => Promise<boolean>;
  logoutUser: () => Promise<void>;

  // User Actions
  submitNewRequest: (requestData: {
    requestType: string;
    productName: string;
    purpose: string;
    productLink?: string;
    expectedPrice: number;
    description?: string;
  }) => Promise<void>;
  userCancelRequest: (requestId: string) => Promise<void>;
  userEditRequest: (
    requestId: string,
    updatedData: {
      productName: string;
      purpose: string;
      productLink?: string;
      expectedPrice: number;
      description?: string;
    }
  ) => Promise<void>;
  updateUserProfile: (updatedData: Partial<AppUser>) => Promise<void>;

  // Balance Management
  balanceRequests: BalanceRequest[];
  getUserBalanceInfo: (userMobile: string, userId?: string) => {
    availableBalance: number;
    pendingRequestedAmount: number;
    requestableBalance: number;
    transactions: BalanceTransaction[];
    balanceRequests: BalanceRequest[];
    hasTransactions: boolean;
    statusText: string;
  };
  userSubmitBalanceRequest: (params: { amount: number; userNotes?: string }) => Promise<BalanceRequest>;
  userCancelBalanceRequest: (requestId: string) => Promise<void>;
  adminApproveBalanceRequest: (requestId: string, adminNotes?: string, payoutMethod?: string) => Promise<void>;
  adminRejectBalanceRequest: (requestId: string, reasonNotes: string) => Promise<void>;
  adminPayBalance: (params: {
    userId?: string;
    userMobile: string;
    userName: string;
    amount: number;
    notes?: string;
    relatedRequestId?: string;
  }) => Promise<void>;
  adminUseBalance: (params: {
    userId?: string;
    userMobile: string;
    userName: string;
    amount: number;
    relatedRequestId?: string;
    notes?: string;
  }) => Promise<void>;
  adminAddBalanceAdjustment: (params: {
    userId?: string;
    userMobile: string;
    userName: string;
    amount: number;
    type?: 'Balance Added' | 'Balance Adjustment';
    reason?: string;
    notes?: string;
  }) => Promise<void>;

  // Notifications
  adminNotifications: AppNotification[];
  unreadAdminNotificationsCount: number;
  unreadUserNotificationsCount: number;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: (target: 'ADMIN' | string) => Promise<void>;

  // Admin Actions
  adminAcceptRequest: (requestId: string, actualPrice: number, adminNotes?: string) => Promise<void>;
  adminRejectRequest: (requestId: string, reasonNotes: string) => Promise<void>;
  adminDeleteRequest: (requestId: string) => Promise<void>;
  adminUpdateStatus: (requestId: string, newStatus: RequestStatus, notes?: string) => Promise<void>;
  adminRecordPayment: (requestId: string, paymentAmount: number, note?: string) => Promise<void>;
  recordPayment?: (requestId: string, paymentAmount: number, note?: string) => Promise<void>;
  adminApplyOffer: (params: {
    requestId: string;
    newPrice: number;
    message?: string;
  }) => Promise<void>;
  adminProcessGroupPayment: (params: {
    userId: string;
    userName: string;
    userMobile: string;
    requestIds: string[];
    cashReceived: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<string>;
  adminRecordGroupPaymentReceived: (params: {
    groupPaymentId: string;
    amountReceived: number;
    notes?: string;
  }) => Promise<void>;
  adminSuspendUser: (userId: string) => Promise<void>;
  adminUnsuspendUser: (userId: string) => Promise<void>;
  adminDeleteUser: (userId: string) => Promise<void>;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  darkMode: true,
  currency: 'INR',
  currencySymbol: '₹',
  adminCode: 'Dheeraj@1755A',
};

/**
 * Sanitizes data for Firestore by converting any `undefined` value into an empty string `""`
 * or recursively processing object keys, preventing "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return '' as unknown as T;
  }
  if (data === null) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) {
        cleaned[key] = '';
      } else if (val !== null && typeof val === 'object') {
        cleaned[key] = sanitizeForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned as T;
  }
  return data;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_SESSION_KEY = 'digizort_session_v3';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [appMode, setAppMode] = useState<'auth' | 'user_portal' | 'admin_panel'>('auth');

  const [allRequests, setAllRequests] = useState<OrderRequest[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [groupPayments, setGroupPayments] = useState<GroupPayment[]>([]);
  const [balanceTransactions, setBalanceTransactions] = useState<BalanceTransaction[]>([]);
  const [balanceRequests, setBalanceRequests] = useState<BalanceRequest[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Restore session from localStorage on app load (Admin Panel ONLY)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        if (session.isAdmin) {
          setIsAdmin(true);
          setAppMode('admin_panel');
        } else {
          // Disable automatic login / session persistence for User Portal
          localStorage.removeItem(STORAGE_SESSION_KEY);
        }
      }
    } catch (e) {
      console.error('Session restore error:', e);
    }
  }, []);

  // Real-time listener for ALL REQUESTS from Firestore
  useEffect(() => {
    const requestsRef = collection(db, 'requests');
    const unsubscribe = onSnapshot(
      requestsRef,
      (snapshot) => {
        const fetched: OrderRequest[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as OrderRequest);
        });
        // Sort newest first
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllRequests(fetched);
      },
      (error) => {
        console.error('Firestore requests listener error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for ALL USERS from Firestore
  useEffect(() => {
    const usersRef = collection(db, 'app_users');
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const fetched: AppUser[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as AppUser);
        });
        setAllUsers(fetched);
      },
      (error) => {
        console.error('Firestore users listener error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for NOTIFICATIONS from Firestore
  useEffect(() => {
    const notifRef = collection(db, 'notifications');
    const unsubscribe = onSnapshot(
      notifRef,
      (snapshot) => {
        const fetched: AppNotification[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as AppNotification);
        });
        fetched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(fetched);
      },
      (error) => {
        console.error('Firestore notifications listener error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for GROUP PAYMENTS from Firestore
  useEffect(() => {
    const gpRef = collection(db, 'groupPayments');
    const unsubscribe = onSnapshot(
      gpRef,
      (snapshot) => {
        const fetched: GroupPayment[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as GroupPayment);
        });
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setGroupPayments(fetched);
      },
      (error) => {
        console.error('Firestore groupPayments listener error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for BALANCE TRANSACTIONS from Firestore
  useEffect(() => {
    const btxRef = collection(db, 'balance_transactions');
    const unsubscribe = onSnapshot(
      btxRef,
      (snapshot) => {
        const fetched: BalanceTransaction[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as BalanceTransaction);
        });
        fetched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setBalanceTransactions(fetched);
      },
      (error) => {
        console.error('Firestore balance_transactions listener error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for BALANCE REQUESTS from Firestore
  useEffect(() => {
    const bReqRef = collection(db, 'balance_requests');
    const unsubscribe = onSnapshot(
      bReqRef,
      (snapshot) => {
        const fetched: BalanceRequest[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as BalanceRequest);
        });
        fetched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setBalanceRequests(fetched);
      },
      (error) => {
        console.error('Firestore balance_requests listener error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter requests for the current user
  const userRequests = currentUser
    ? allRequests.filter((r) => r.userMobile === currentUser.mobileNumber)
    : [];

  // Filter notifications for current user - strict privacy, never leak between users
  const userNotifications = currentUser
    ? notifications.filter((n) => n.targetUserMobile === currentUser.mobileNumber)
    : [];

  // Filter notifications for Admin
  const adminNotifications = notifications.filter((n) => n.targetUserMobile === 'ADMIN');

  const unreadAdminNotificationsCount = adminNotifications.filter((n) => !n.read).length;
  const unreadUserNotificationsCount = userNotifications.filter((n) => !n.read).length;

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const markAllNotificationsAsRead = async (target: 'ADMIN' | string) => {
    try {
      const targets = notifications.filter(
        (n) => !n.read && (target === 'ADMIN' ? n.targetUserMobile === 'ADMIN' : n.targetUserMobile === target)
      );
      if (targets.length === 0) return;
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();
      for (const t of targets) {
        batch.update(doc(db, 'notifications', t.id), {
          read: true,
          readAt: nowIso,
        });
      }
      await batch.commit();
      showToast('All notifications marked as read.');
    } catch (e) {
      console.error('Failed to mark all notifications as read:', e);
    }
  };

  // Real-time Balance Calculation Helper
  const getUserBalanceInfo = (userMobile: string, userId?: string) => {
    const userReqs = allRequests.filter(
      (r) => (userMobile && r.userMobile === userMobile) || (userId && r.userId === userId)
    );
    const userGps = groupPayments.filter(
      (gp) => (userMobile && gp.userMobile === userMobile) || (userId && gp.userId === userId)
    );
    return getUserAvailableBalance(userMobile, userId, balanceTransactions, userReqs, userGps, balanceRequests);
  };

  // MOBILE AUTH FUNCTIONS
  const checkMobileRegistered = async (mobileNumber: string): Promise<AppUser | null> => {
    const cleanNum = mobileNumber.trim();
    const docRef = doc(db, 'app_users', cleanNum);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as AppUser;
    }
    return null;
  };

  const registerUser = async (
    userData: Omit<AppUser, 'id' | 'createdAt' | 'status' | 'role'>
  ): Promise<AppUser> => {
    const cleanNum = userData.mobileNumber.trim();
    const nowIso = new Date().toISOString();
    const rawUser: AppUser = {
      id: cleanNum,
      fullName: userData.fullName.trim(),
      mobileNumber: cleanNum,
      email: userData.email ? userData.email.trim() : '',
      address: userData.address ? userData.address.trim() : '',
      profilePhoto: userData.profilePhoto ? userData.profilePhoto.trim() : '',
      status: 'active',
      role: 'user',
      createdAt: nowIso,
      creditBalance: 0,
    };

    const newUser = sanitizeForFirestore(rawUser);
    const batch = writeBatch(db);
    batch.set(doc(db, 'app_users', cleanNum), newUser);

    // Notify Admin of new registration
    const adminNotifId = 'NOTIF-ADM-' + Date.now();
    batch.set(
      doc(db, 'notifications', adminNotifId),
      sanitizeForFirestore({
        id: adminNotifId,
        targetUserMobile: 'ADMIN',
        title: 'New User Registered',
        message: `${newUser.fullName} (${cleanNum}) registered a new account.`,
        type: 'new_user',
        timestamp: nowIso,
        read: false,
        userId: cleanNum,
        userMobile: cleanNum,
        userName: newUser.fullName,
      })
    );

    await batch.commit();

    setCurrentUser(newUser);
    setIsAdmin(false);
    setAppMode('user_portal');
    return newUser;
  };

  const loginWithMobile = async (mobileNumber: string, pin?: string) => {
    const cleanNum = mobileNumber.trim();
    const user = await checkMobileRegistered(cleanNum);
    if (!user) {
      throw new Error('This mobile number is not registered.');
    }
    if (user.status === 'suspended') {
      throw new Error('This account has been suspended by Admin.');
    }

    // Update last login
    const updated = { ...user, lastLoginAt: new Date().toISOString() };
    await updateDoc(doc(db, 'app_users', cleanNum), { lastLoginAt: updated.lastLoginAt });

    setCurrentUser(updated);
    setIsAdmin(false);
    setAppMode('user_portal');
    showToast(`Welcome back, ${user.fullName}!`);
  };

  const loginAsAdmin = async (adminCode: string): Promise<boolean> => {
    const cleanInput = adminCode.trim();
    if (
      cleanInput === settings.adminCode ||
      cleanInput === 'Dheeraj@1755A' ||
      cleanInput === '88888888' ||
      cleanInput === 'admin123'
    ) {
      setIsAdmin(true);
      setCurrentUser(null);
      setAppMode('admin_panel');
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ isAdmin: true }));
      showToast('Unlocked Admin Panel');
      return true;
    }
    return false;
  };

  const logoutUser = async () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setAppMode('auth');
    localStorage.removeItem(STORAGE_SESSION_KEY);
    showToast('Logged out successfully.');
  };

  const updateUserProfile = async (updatedData: Partial<AppUser>) => {
    if (!currentUser) return;
    const cleanNum = currentUser.mobileNumber;
    const sanitized = sanitizeForFirestore(updatedData);
    await updateDoc(doc(db, 'app_users', cleanNum), sanitized);
    setCurrentUser((prev) => (prev ? { ...prev, ...sanitized } : null));
  };

  // USER ACTIONS: Create Request
  const submitNewRequest = async (data: {
    requestType: string;
    productName: string;
    purpose: string;
    productLink?: string;
    expectedPrice: number;
    description?: string;
  }) => {
    if (!currentUser) throw new Error('Must be logged in to submit a request.');

    const reqId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const initialTimeline: TimelineEvent = {
      id: 'EVT-1',
      type: 'REQUEST_SUBMITTED',
      title: 'Request Submitted for Review',
      timestamp: nowIso,
      totalPaidSoFar: 0,
      remainingBalance: data.expectedPrice || 0,
      notes: data.description ? data.description.trim() : 'Request submitted by customer.',
      actor: 'USER',
    };

    const rawRequest: OrderRequest = {
      id: reqId,
      userId: currentUser.id,
      userMobile: currentUser.mobileNumber,
      userName: currentUser.fullName,
      userEmail: currentUser.email || '',
      userAddress: currentUser.address || '',
      requestType: data.requestType || 'Custom Request',
      productName: data.productName.trim(),
      purpose: data.purpose.trim(),
      productLink: data.productLink ? data.productLink.trim() : '',
      expectedPrice: data.expectedPrice || 0,
      actualPrice: data.expectedPrice || 0,
      amountPaid: 0,
      remainingAmount: data.expectedPrice || 0,
      status: 'Pending Review',
      description: data.description ? data.description.trim() : '',
      timeline: [initialTimeline],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newRequest = sanitizeForFirestore(rawRequest);
    const batch = writeBatch(db);
    batch.set(doc(db, 'requests', reqId), newRequest);

    // 1. Notification for Admin Bell
    const adminNotifId = 'NOTIF-REQ-' + Date.now();
    batch.set(
      doc(db, 'notifications', adminNotifId),
      sanitizeForFirestore({
        id: adminNotifId,
        targetUserMobile: 'ADMIN',
        title: 'New Request',
        message: `${currentUser.fullName} submitted request #${reqId} for "${data.productName}".`,
        type: 'new_request',
        timestamp: nowIso,
        read: false,
        requestId: reqId,
        relatedRequestId: reqId,
        userId: currentUser.id,
        userMobile: currentUser.mobileNumber,
        userName: currentUser.fullName,
      })
    );

    // 2. Notification for User History
    const userNotifId = 'NOTIF-USR-' + Date.now();
    batch.set(
      doc(db, 'notifications', userNotifId),
      sanitizeForFirestore({
        id: userNotifId,
        targetUserMobile: currentUser.mobileNumber,
        title: 'Request Submitted',
        message: `Your request for "${data.productName}" (#${reqId}) was successfully submitted and is under review.`,
        type: 'request_submitted',
        timestamp: nowIso,
        read: false,
        requestId: reqId,
        relatedRequestId: reqId,
      })
    );

    await batch.commit();

    showToast('New Request Submitted Successfully!');
  };

  const userCancelRequest = async (requestId: string) => {
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as OrderRequest;
    if (req.status !== 'Pending Review') {
      showToast('Only requests in "Pending Review" status can be cancelled.');
      return;
    }

    const nowIso = new Date().toISOString();
    const cancelEvt: TimelineEvent = {
      id: 'EVT-' + Date.now(),
      type: 'REQUEST_REJECTED',
      title: 'Request Cancelled by Customer',
      timestamp: nowIso,
      totalPaidSoFar: req.amountPaid || 0,
      remainingBalance: req.remainingAmount || 0,
      notes: 'Cancelled by customer before admin review.',
      actor: 'USER',
    };

    const batch = writeBatch(db);
    batch.update(docRef, {
      status: 'Cancelled',
      timeline: [...(req.timeline || []), cancelEvt],
      updatedAt: nowIso,
    });

    const adminNotifId = 'NOTIF-CAN-' + Date.now();
    batch.set(
      doc(db, 'notifications', adminNotifId),
      sanitizeForFirestore({
        id: adminNotifId,
        targetUserMobile: 'ADMIN',
        title: 'Request Cancelled',
        message: `${req.userName || 'Customer'} cancelled request #${req.id} for "${req.productName}".`,
        type: 'request_cancelled',
        timestamp: nowIso,
        read: false,
        requestId: req.id,
        relatedRequestId: req.id,
        userMobile: req.userMobile,
        userName: req.userName,
      })
    );

    await batch.commit();

    showToast('Request cancelled.');
  };

  const userEditRequest = async (
    requestId: string,
    data: {
      productName: string;
      purpose: string;
      productLink?: string;
      expectedPrice: number;
      description?: string;
    }
  ) => {
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as OrderRequest;
    if (req.status !== 'Pending Review') {
      showToast('Only requests in "Pending Review" status can be edited.');
      return;
    }

    const nowIso = new Date().toISOString();
    await updateDoc(docRef, {
      productName: data.productName,
      purpose: data.purpose,
      productLink: data.productLink || '',
      expectedPrice: data.expectedPrice,
      actualPrice: data.expectedPrice,
      remainingAmount: data.expectedPrice,
      description: data.description || '',
      updatedAt: nowIso,
    });

    showToast('Request updated successfully.');
  };

  // ADMIN ACTIONS
  const adminAcceptRequest = async (requestId: string, actualPrice: number, adminNotes?: string) => {
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as OrderRequest;
    const nowIso = new Date().toISOString();

    const newTimelineEvt: TimelineEvent = {
      id: 'EVT-' + Date.now(),
      type: 'REQUEST_ACCEPTED',
      title: 'Request Accepted by Admin',
      timestamp: nowIso,
      totalPaidSoFar: req.amountPaid || 0,
      remainingBalance: Math.max(0, actualPrice - (req.amountPaid || 0)),
      notes: adminNotes || `Price confirmed at ₹${actualPrice.toLocaleString('en-IN')}`,
      actor: 'ADMIN',
    };

    const updatedTimeline = [...(req.timeline || []), newTimelineEvt];
    const newRemaining = Math.max(0, actualPrice - (req.amountPaid || 0));

    await updateDoc(docRef, sanitizeForFirestore({
      actualPrice: actualPrice,
      remainingAmount: newRemaining,
      status: 'Accepted',
      adminNotes: adminNotes || req.adminNotes || '',
      timeline: updatedTimeline,
      updatedAt: nowIso,
    }));

    // Notify user
    const notifId = 'NOTIF-' + Date.now();
    await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: req.userMobile,
      title: 'Request Accepted!',
      message: `Your request "${req.productName}" was accepted by Admin for ₹${actualPrice.toLocaleString('en-IN')}.`,
      type: 'status_change',
      timestamp: nowIso,
      read: false,
      requestId: requestId,
    }));

    showToast('Request Accepted!');
  };

  const adminRejectRequest = async (requestId: string, reasonNotes: string) => {
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as OrderRequest;
    const nowIso = new Date().toISOString();

    const newTimelineEvt: TimelineEvent = {
      id: 'EVT-' + Date.now(),
      type: 'REQUEST_REJECTED',
      title: 'Request Rejected by Admin',
      timestamp: nowIso,
      totalPaidSoFar: 0,
      remainingBalance: 0,
      notes: reasonNotes,
      actor: 'ADMIN',
    };

    await updateDoc(docRef, sanitizeForFirestore({
      status: 'Rejected',
      rejectedAt: nowIso,
      rejectedBy: 'ADMIN',
      rejectionNote: reasonNotes,
      remainingAmount: 0,
      adminNotes: reasonNotes,
      timeline: [...(req.timeline || []), newTimelineEvt],
      updatedAt: nowIso,
    }));

    // Notify user
    const notifId = 'NOTIF-' + Date.now();
    await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: req.userMobile,
      title: 'Request Declined',
      message: `Your request "${req.productName}" was declined: ${reasonNotes}`,
      type: 'status_change',
      timestamp: nowIso,
      read: false,
      requestId: requestId,
    }));

    showToast('Request marked as Rejected.');
  };

  const adminDeleteRequest = async (requestId: string) => {
    const docRef = doc(db, 'requests', requestId);
    await deleteDoc(docRef);
    showToast('Request permanently deleted.');
  };

  const adminUpdateStatus = async (requestId: string, newStatus: RequestStatus, notes?: string) => {
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as OrderRequest;
    const nowIso = new Date().toISOString();

    const newTimelineEvt: TimelineEvent = {
      id: 'EVT-' + Date.now(),
      type: newStatus === 'Ordered' ? 'ORDERED' : newStatus === 'Completed' || newStatus === 'Paid' ? 'TRANSACTION_COMPLETED' : 'NOTE_ADDED',
      title: `Status Updated to ${newStatus}`,
      timestamp: nowIso,
      totalPaidSoFar: req.amountPaid || 0,
      remainingBalance: req.remainingAmount || 0,
      notes: notes || `Status changed to ${newStatus}`,
      actor: 'ADMIN',
    };

    await updateDoc(docRef, sanitizeForFirestore({
      status: newStatus,
      timeline: [...(req.timeline || []), newTimelineEvt],
      updatedAt: nowIso,
    }));

    // Notify user
    const notifId = 'NOTIF-' + Date.now();
    await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: req.userMobile,
      title: `Status Update: ${newStatus}`,
      message: `Your request "${req.productName}" status changed to ${newStatus}.`,
      type: 'status_change',
      timestamp: nowIso,
      read: false,
      requestId: requestId,
    }));

    showToast(`Status updated to ${newStatus}`);
  };

  const adminRecordPayment = async (requestId: string, paymentAmount: number, note?: string) => {
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const req = snap.data() as OrderRequest;
    const nowIso = new Date().toISOString();

    const actual = getRequestPrice(req);
    const prevPaid = req.amountPaid || 0;
    const due = Math.max(0, actual - prevPaid);

    let newPaidTotal: number;
    let newRemaining: number;
    let extraCash: number = 0;
    let newStatus: RequestStatus;

    if (paymentAmount >= due) {
      newPaidTotal = actual;
      newRemaining = 0;
      extraCash = paymentAmount - due;
      newStatus = 'Paid';
    } else {
      newPaidTotal = prevPaid + paymentAmount;
      newRemaining = Math.max(0, actual - newPaidTotal);
      extraCash = 0;
      newStatus = 'Partially Paid';
    }

    const noteText = note
      ? (extraCash > 0 ? `${note} (Settled: ₹${due.toLocaleString('en-IN')}, Extra Cash: ₹${extraCash.toLocaleString('en-IN')})` : note)
      : (extraCash > 0 ? `Payment received: ₹${paymentAmount.toLocaleString('en-IN')}. Settled: ₹${due.toLocaleString('en-IN')}, Extra Cash: ₹${extraCash.toLocaleString('en-IN')}` : `Payment of ₹${paymentAmount.toLocaleString('en-IN')} received.`);

    const newTimelineEvt: TimelineEvent = {
      id: 'EVT-' + Date.now(),
      type: newRemaining === 0 ? 'TRANSACTION_COMPLETED' : 'PARTIAL_PAYMENT',
      title: newRemaining === 0 ? 'Full Payment Received' : `Partial Payment Recorded (+₹${paymentAmount})`,
      timestamp: nowIso,
      amountPaidThisStep: Math.min(paymentAmount, due),
      totalPaidSoFar: newPaidTotal,
      remainingBalance: newRemaining,
      notes: noteText,
      actor: 'ADMIN',
    };

    await updateDoc(docRef, sanitizeForFirestore({
      amountPaid: newPaidTotal,
      remainingAmount: newRemaining,
      extraCash: (req.extraCash || 0) + extraCash,
      cashReceived: paymentAmount,
      status: newStatus,
      timeline: [...(req.timeline || []), newTimelineEvt],
      updatedAt: nowIso,
    }));

    // Record Balance Added in ledger if overpaid
    if (extraCash > 0) {
      const balInfo = getUserBalanceInfo(req.userMobile, req.userId);
      const prevBal = balInfo.availableBalance;
      const newBal = prevBal + extraCash;
      const now = new Date();
      const bTxId = 'BTX-' + Date.now();
      const bTx: BalanceTransaction = {
        id: bTxId,
        userId: req.userId || '',
        userName: req.userName,
        userMobile: req.userMobile,
        type: 'Balance Added',
        amount: extraCash,
        previousBalance: prevBal,
        remainingBalance: newBal,
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: nowIso,
        relatedRequestId: req.id,
        relatedRequestTitle: req.productName,
        actor: 'ADMIN',
        notes: `Overpayment extra cash from request #${req.id}`,
      };
      await setDoc(doc(db, 'balance_transactions', bTxId), sanitizeForFirestore(bTx));
      if (req.userId) {
        await updateDoc(doc(db, 'app_users', req.userId), { creditBalance: newBal, updatedAt: nowIso });
      }
    }

    if (newRemaining === 0) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    // Notify user
    const notifId = 'NOTIF-' + Date.now();
    const notifMsg = extraCash > 0
      ? `Received ₹${paymentAmount.toLocaleString('en-IN')} for "${req.productName}". Extra cash: ₹${extraCash.toLocaleString('en-IN')}. Request is fully paid!`
      : `Received payment of ₹${paymentAmount.toLocaleString('en-IN')} for "${req.productName}". Remaining balance: ₹${newRemaining.toLocaleString('en-IN')}`;

    await setDoc(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: req.userMobile,
      title: newRemaining === 0 ? 'Payment Settled!' : 'Partial Payment Recorded',
      message: notifMsg,
      type: 'payment_recorded',
      timestamp: nowIso,
      read: false,
      requestId: requestId,
    }));

    showToast(extraCash > 0
      ? `Payment recorded! Settled: ₹${due.toLocaleString('en-IN')} | Extra Cash: ₹${extraCash.toLocaleString('en-IN')}`
      : `Recorded payment of ₹${paymentAmount.toLocaleString('en-IN')}`
    );
  };

  const adminApplyOffer = async (params: {
    requestId: string;
    newPrice: number;
    message?: string;
  }) => {
    const { requestId, newPrice, message } = params;
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Order request not found.');

    const req = snap.data() as OrderRequest;
    const currentPrice = getRequestPrice(req);
    const originalPrice = getOriginalPrice(req);

    if (isNaN(newPrice) || newPrice <= 0) {
      throw new Error('Please enter a valid offer price greater than ₹0.');
    }

    if (newPrice >= currentPrice) {
      throw new Error('Offer price must be lower than the current order amount.');
    }

    const savings = currentPrice - newPrice;
    const totalSavings = originalPrice - newPrice;
    const nowIso = new Date().toISOString();
    const paid = Number(req.amountPaid) || 0;

    let newRemaining: number;
    let newStatus: RequestStatus;
    let excessPaid = 0;

    if (paid >= newPrice) {
      newRemaining = 0;
      newStatus = 'Paid';
      excessPaid = paid - newPrice;
    } else {
      newRemaining = newPrice - paid;
      newStatus = paid > 0 ? 'Partially Paid' : (req.status === 'Pending Review' ? 'Accepted' : req.status);
    }

    const newAdjustment: PriceAdjustment = {
      id: 'PADJ-' + Date.now(),
      previousAmount: currentPrice,
      newAmount: newPrice,
      savings,
      reason: message?.trim() || 'Supplier Special Offer',
      message: message?.trim() || '',
      appliedAt: nowIso,
      appliedBy: 'ADMIN',
    };

    const offerTimelineEvt: TimelineEvent = {
      id: 'EVT-' + Date.now(),
      type: 'OFFER_APPLIED',
      title: `Special Offer Applied (Price: ₹${newPrice.toLocaleString('en-IN')}, Saved ₹${savings.toLocaleString('en-IN')})`,
      timestamp: nowIso,
      totalPaidSoFar: Math.min(paid, newPrice),
      remainingBalance: newRemaining,
      notes: message?.trim() || `Special supplier offer applied: Reduced from ₹${currentPrice.toLocaleString('en-IN')} to ₹${newPrice.toLocaleString('en-IN')} (Saved ₹${savings.toLocaleString('en-IN')}).`,
      actor: 'ADMIN',
    };

    const updatedRequestData: Partial<OrderRequest> = {
      originalRequestedAmount: originalPrice,
      currentOrderAmount: newPrice,
      actualPrice: newPrice,
      remainingAmount: newRemaining,
      offerApplied: true,
      offerAmount: totalSavings,
      discountAmount: totalSavings,
      offerMessage: message?.trim() || undefined,
      offerUpdatedAt: nowIso,
      offerUpdatedBy: 'ADMIN',
      priceAdjustments: [...(req.priceAdjustments || []), newAdjustment],
      timeline: [...(req.timeline || []), offerTimelineEvt],
      status: newStatus,
      updatedAt: nowIso,
    };

    if (excessPaid > 0) {
      updatedRequestData.extraCash = (req.extraCash || 0) + excessPaid;
    }

    const batch = writeBatch(db);
    batch.update(docRef, sanitizeForFirestore(updatedRequestData));

    // Handle excess payment if customer already paid more than new offer price
    if (excessPaid > 0) {
      const balInfo = getUserBalanceInfo(req.userMobile, req.userId);
      const prevBal = balInfo.availableBalance;
      const newBal = prevBal + excessPaid;
      const bTxId = 'BTX-' + Date.now();
      const now = new Date();
      const bTx: BalanceTransaction = {
        id: bTxId,
        userId: req.userId || '',
        userName: req.userName,
        userMobile: req.userMobile,
        type: 'Balance Added',
        amount: excessPaid,
        previousBalance: prevBal,
        remainingBalance: newBal,
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: nowIso,
        reason: 'Refund / Credit from Offer Price Reduction',
        relatedRequestId: req.id,
        relatedRequestTitle: req.productName,
        actor: 'ADMIN',
        notes: `Price reduction credit: Order price reduced to ₹${newPrice.toLocaleString('en-IN')}. Excess paid of ₹${excessPaid.toLocaleString('en-IN')} credited to customer balance.`,
      };
      batch.set(doc(db, 'balance_transactions', bTxId), sanitizeForFirestore(bTx));

      if (req.userMobile) {
        batch.set(
          doc(db, 'app_users', req.userMobile),
          { creditBalance: newBal, updatedAt: nowIso },
          { merge: true }
        );
      }
    }

    // 1. Notification for Customer (Real-Time Pop-in Popup and Notification Center)
    const custNotifId = 'NOTIF-OFFER-' + Date.now();
    const custNotif: AppNotification = {
      id: custNotifId,
      targetUserMobile: req.userMobile,
      title: '🎉 Special Offer from DIGIZORT',
      message: message?.trim()
        ? `${message.trim()} (Price reduced from ₹${currentPrice.toLocaleString('en-IN')} to ₹${newPrice.toLocaleString('en-IN')}. You save ₹${savings.toLocaleString('en-IN')}!)`
        : `Good news! Your order price has been reduced from ₹${currentPrice.toLocaleString('en-IN')} to ₹${newPrice.toLocaleString('en-IN')}. You save ₹${savings.toLocaleString('en-IN')}.`,
      type: 'special_offer',
      timestamp: nowIso,
      read: false,
      requestId: req.id,
      relatedRequestId: req.id,
      userId: req.userId,
      userMobile: req.userMobile,
      userName: req.userName,
      amount: newPrice,
      originalPrice: currentPrice,
      offerPrice: newPrice,
      savings,
    };
    batch.set(doc(db, 'notifications', custNotifId), sanitizeForFirestore(custNotif));

    // 2. Notification for Admin Bell
    const adminNotifId = 'NOTIF-ADM-OFFER-' + Date.now();
    batch.set(
      doc(db, 'notifications', adminNotifId),
      sanitizeForFirestore({
        id: adminNotifId,
        targetUserMobile: 'ADMIN',
        title: 'Special Offer Applied',
        message: `Applied offer on #${req.id} (${req.productName}): ₹${currentPrice.toLocaleString('en-IN')} ➔ ₹${newPrice.toLocaleString('en-IN')} (Saved ₹${savings.toLocaleString('en-IN')}).`,
        type: 'info',
        timestamp: nowIso,
        read: false,
        requestId: req.id,
        relatedRequestId: req.id,
      })
    );

    await batch.commit();
    showToast(`Special offer of ₹${newPrice.toLocaleString('en-IN')} applied successfully!`);
  };

  const adminProcessGroupPayment = async (params: {
    userId: string;
    userName: string;
    userMobile: string;
    requestIds: string[];
    cashReceived: number;
    paymentDate?: string;
    notes?: string;
  }): Promise<string> => {
    const { userId, userName, userMobile, requestIds, cashReceived, paymentDate, notes } = params;
    const nowIso = new Date().toISOString();
    const groupPaymentId = 'GP-' + Date.now().toString().slice(-6);

    // Fetch target requests from allRequests
    const selectedRequests = allRequests.filter((r) => requestIds.includes(r.id));
    if (selectedRequests.length === 0) {
      throw new Error('No valid requests found for this group payment.');
    }

    const totalDue = selectedRequests.reduce((sum, r) => sum + getRequestRemaining(r), 0);
    const amountSettled = Math.min(cashReceived, totalDue);
    const extraCash = Math.max(0, cashReceived - totalDue);
    const finalStatus: 'PAID' | 'PARTIALLY_PAID' = cashReceived >= totalDue ? 'PAID' : 'PARTIALLY_PAID';

    const batch = writeBatch(db);

    // 1. Write Group Payment record
    const groupPaymentDoc: GroupPayment = {
      id: groupPaymentId,
      userId,
      userName,
      userMobile,
      requestIds,
      requestTitles: selectedRequests.map((r) => r.productName),
      totalDue,
      amountReceived: cashReceived,
      amountSettled,
      extraCash,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      createdAt: nowIso,
      createdBy: 'ADMIN',
      status: finalStatus,
      notes: notes || '',
    };

    batch.set(doc(db, 'groupPayments', groupPaymentId), sanitizeForFirestore(groupPaymentDoc));

    // 2. Allocate payment sequentially across selected requests
    let unallocated = cashReceived;
    for (const req of selectedRequests) {
      const reqDue = getRequestRemaining(req);
      const prevPaid = Number(req.amountPaid) || 0;
      const price = getRequestPrice(req);

      const allocation = Math.min(unallocated, reqDue);
      unallocated -= allocation;

      const newTotalPaid = prevPaid + allocation;
      const newRemaining = Math.max(0, price - newTotalPaid);
      const newReqStatus: RequestStatus = newRemaining === 0 ? 'Paid' : 'Partially Paid';

      const timelineEvt: TimelineEvent = {
        id: 'EVT-' + Date.now() + '-' + req.id.slice(-4),
        type: newRemaining === 0 ? 'TRANSACTION_COMPLETED' : 'PARTIAL_PAYMENT',
        title: `Group Payment #${groupPaymentId}`,
        timestamp: nowIso,
        amountPaidThisStep: allocation,
        totalPaidSoFar: newTotalPaid,
        remainingBalance: newRemaining,
        notes: `Group Payment #${groupPaymentId}. Total cash received: ₹${cashReceived.toLocaleString('en-IN')}, allocated to this request: ₹${allocation.toLocaleString('en-IN')}${notes ? ` (${notes})` : ''}`,
        actor: 'ADMIN',
      };

      const reqRef = doc(db, 'requests', req.id);
      batch.update(reqRef, sanitizeForFirestore({
        amountPaid: newTotalPaid,
        remainingAmount: newRemaining,
        status: newReqStatus,
        groupPaymentId: groupPaymentId,
        timeline: [...(req.timeline || []), timelineEvt],
        updatedAt: nowIso,
      }));
    }

    // 3. Record Balance Added in ledger if extra cash exists
    if (extraCash > 0) {
      const balInfo = getUserBalanceInfo(userMobile, userId);
      const prevBal = balInfo.availableBalance;
      const newBal = prevBal + extraCash;
      const now = new Date();
      const bTxId = 'BTX-' + Date.now();
      const bTx: BalanceTransaction = {
        id: bTxId,
        userId: userId || '',
        userName: userName,
        userMobile: userMobile,
        type: 'Balance Added',
        amount: extraCash,
        previousBalance: prevBal,
        remainingBalance: newBal,
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: nowIso,
        relatedGroupPaymentId: groupPaymentId,
        actor: 'ADMIN',
        notes: `Extra cash from combined payment #${groupPaymentId}`,
      };
      batch.set(doc(db, 'balance_transactions', bTxId), sanitizeForFirestore(bTx));
      if (userId) {
        batch.update(doc(db, 'app_users', userId), { creditBalance: newBal, updatedAt: nowIso });
      }
    }

    // 4. User notification
    const notifId = 'NOTIF-' + Date.now();
    const notifMsg = `Combined payment #${groupPaymentId} processed for ${selectedRequests.length} request(s). Received: ₹${cashReceived.toLocaleString('en-IN')}, Settled: ₹${amountSettled.toLocaleString('en-IN')}${extraCash > 0 ? `, Extra cash: ₹${extraCash.toLocaleString('en-IN')}` : ''}.`;

    batch.set(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: userMobile,
      title: `Group Payment Received (${selectedRequests.length} Requests)`,
      message: notifMsg,
      type: 'payment_recorded',
      timestamp: nowIso,
      read: false,
    }));

    await batch.commit();

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    showToast(`Group Payment #${groupPaymentId} processed successfully!`);
    return groupPaymentId;
  };

  const adminRecordGroupPaymentReceived = async (params: {
    groupPaymentId: string;
    amountReceived: number;
    notes?: string;
  }): Promise<void> => {
    const { groupPaymentId, amountReceived, notes } = params;
    const numReceived = Number(amountReceived);
    if (isNaN(numReceived) || numReceived <= 0) {
      throw new Error('Please enter a valid amount received greater than ₹0.');
    }

    const gpDocRef = doc(db, 'groupPayments', groupPaymentId);
    const gpSnap = await getDoc(gpDocRef);
    if (!gpSnap.exists()) {
      throw new Error('Group payment record not found.');
    }
    const gp = gpSnap.data() as GroupPayment;
    const totalDue = gp.totalDue;
    const prevSettled = gp.amountSettled || 0;
    const remainingGroupDue = Math.max(0, totalDue - prevSettled);

    // Find child requests
    const childRequests = allRequests.filter((r) => gp.requestIds?.includes(r.id));
    const unpaidRequests = childRequests.filter((r) => getRequestRemaining(r) > 0);

    const newlySettled = Math.min(numReceived, remainingGroupDue);
    const newlyExtra = Math.max(0, numReceived - remainingGroupDue);
    const updatedSettled = prevSettled + newlySettled;
    const updatedStatus: 'PAID' | 'PARTIALLY_PAID' = updatedSettled >= totalDue ? 'PAID' : 'PARTIALLY_PAID';
    const now = new Date();
    const nowIso = now.toISOString();

    const batch = writeBatch(db);

    // Update group payment doc
    batch.update(gpDocRef, sanitizeForFirestore({
      amountReceived: (gp.amountReceived || 0) + numReceived,
      amountSettled: updatedSettled,
      extraCash: (gp.extraCash || 0) + newlyExtra,
      status: updatedStatus,
      notes: notes ? (gp.notes ? `${gp.notes} | ${notes}` : notes) : gp.notes || '',
    }));

    // Sequentially allocate across unpaid child requests
    let unallocated = numReceived;
    for (const req of unpaidRequests) {
      if (unallocated <= 0) break;
      const reqDue = getRequestRemaining(req);
      const prevPaid = Number(req.amountPaid) || 0;
      const price = getRequestPrice(req);

      const allocation = Math.min(unallocated, reqDue);
      unallocated -= allocation;

      const newTotalPaid = prevPaid + allocation;
      const newRemaining = Math.max(0, price - newTotalPaid);
      const newReqStatus: RequestStatus = newRemaining === 0 ? 'Paid' : 'Partially Paid';

      const timelineEvt: TimelineEvent = {
        id: 'EVT-' + Date.now() + '-' + req.id.slice(-4),
        type: newRemaining === 0 ? 'TRANSACTION_COMPLETED' : 'PARTIAL_PAYMENT',
        title: `Follow-up Payment for Group #${groupPaymentId}`,
        timestamp: nowIso,
        amountPaidThisStep: allocation,
        totalPaidSoFar: newTotalPaid,
        remainingBalance: newRemaining,
        notes: `Received ₹${numReceived.toLocaleString('en-IN')}, allocated: ₹${allocation.toLocaleString('en-IN')}${notes ? ` (${notes})` : ''}`,
        actor: 'ADMIN',
      };

      const reqRef = doc(db, 'requests', req.id);
      batch.update(reqRef, sanitizeForFirestore({
        amountPaid: newTotalPaid,
        remainingAmount: newRemaining,
        status: newReqStatus,
        timeline: [...(req.timeline || []), timelineEvt],
        updatedAt: nowIso,
      }));
    }

    // Record Balance Added if extra cash exists
    if (newlyExtra > 0) {
      const balInfo = getUserBalanceInfo(gp.userMobile, gp.userId);
      const prevBal = balInfo.availableBalance;
      const newBal = prevBal + newlyExtra;
      const bTxId = 'BTX-' + Date.now();
      const bTx: BalanceTransaction = {
        id: bTxId,
        userId: gp.userId || '',
        userName: gp.userName,
        userMobile: gp.userMobile,
        type: 'Balance Added',
        amount: newlyExtra,
        previousBalance: prevBal,
        remainingBalance: newBal,
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: nowIso,
        relatedGroupPaymentId: groupPaymentId,
        actor: 'ADMIN',
        notes: `Extra payment: +₹${newlyExtra.toLocaleString('en-IN')} from follow-up payment on Group #${groupPaymentId}`,
      };
      batch.set(doc(db, 'balance_transactions', bTxId), sanitizeForFirestore(bTx));
      if (gp.userId) {
        batch.update(doc(db, 'app_users', gp.userId), { creditBalance: newBal, updatedAt: nowIso });
      }
    }

    // User notification
    const notifId = 'NOTIF-' + Date.now();
    batch.set(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: gp.userMobile,
      title: updatedStatus === 'PAID' ? 'Group Payment Fully Settled!' : 'Partial Group Payment Received',
      message: `Payment of ₹${numReceived.toLocaleString('en-IN')} received for Group Settlement #${groupPaymentId}.${newlyExtra > 0 ? ` Extra cash: ₹${newlyExtra.toLocaleString('en-IN')} credited to your balance.` : ''}`,
      type: 'payment_recorded',
      timestamp: nowIso,
      read: false,
    }));

    await batch.commit();
    showToast(`Payment of ₹${numReceived.toLocaleString('en-IN')} recorded for Group #${groupPaymentId}`);
  };

  // USER BALANCE PAYOUT REQUESTS
  const userSubmitBalanceRequest = async (params: {
    amount: number;
    userNotes?: string;
  }): Promise<BalanceRequest> => {
    if (!currentUser) {
      throw new Error('You must be logged in to request money.');
    }
    const numAmount = Number(params.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Please enter a valid amount greater than ₹0.');
    }

    const balInfo = getUserBalanceInfo(currentUser.mobileNumber, currentUser.id);
    if (numAmount > balInfo.requestableBalance) {
      throw new Error('Requested amount cannot exceed your available balance.');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const reqId = 'BREQ-' + Date.now();

    const bReqDoc: BalanceRequest = {
      id: reqId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userMobile: currentUser.mobileNumber,
      amount: numAmount,
      status: 'Pending',
      userNotes: params.userNotes ? params.userNotes.trim() : '',
      date: dateStr,
      time: timeStr,
      timestamp: nowIso,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'balance_requests', reqId), sanitizeForFirestore(bReqDoc));

    // Also log a 'Money Requested' transaction for the user's history
    // As per requirement:
    // 21 Sep | Money Requested | ₹50 | ₹100 | Pending
    const txId = 'BTX-REQ-' + Date.now();
    const txDoc: BalanceTransaction = {
      id: txId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userMobile: currentUser.mobileNumber,
      type: 'Money Requested',
      amount: numAmount,
      previousBalance: balInfo.availableBalance,
      remainingBalance: balInfo.availableBalance, // does NOT deduct yet!
      status: 'Pending',
      relatedBalanceRequestId: reqId,
      date: dateStr,
      time: timeStr,
      timestamp: nowIso,
      actor: 'USER',
      notes: params.userNotes ? `Requested: ${params.userNotes.trim()}` : 'Payout requested by user',
    };
    batch.set(doc(db, 'balance_transactions', txId), sanitizeForFirestore(txDoc));

    // 1. Notification for Admin Bell
    const adminNotifId = 'NOTIF-BREQ-' + Date.now();
    batch.set(
      doc(db, 'notifications', adminNotifId),
      sanitizeForFirestore({
        id: adminNotifId,
        targetUserMobile: 'ADMIN',
        title: 'Balance Payout Requested',
        message: `${currentUser.fullName} (${currentUser.mobileNumber}) requested a payout of ₹${numAmount.toLocaleString('en-IN')}.${params.userNotes ? ` Note: ${params.userNotes}` : ''}`,
        type: 'balance_request',
        timestamp: nowIso,
        read: false,
        relatedBalanceRequestId: reqId,
        amount: numAmount,
        userMobile: currentUser.mobileNumber,
        userName: currentUser.fullName,
      })
    );

    // 2. Notification for user
    const notifId = 'NOTIF-' + Date.now();
    batch.set(
      doc(db, 'notifications', notifId),
      sanitizeForFirestore({
        id: notifId,
        targetUserMobile: currentUser.mobileNumber,
        title: 'Balance Payout Requested',
        message: `You requested ₹${numAmount.toLocaleString('en-IN')} from your balance. The admin will review and process your request.`,
        type: 'info',
        timestamp: nowIso,
        read: false,
      })
    );

    await batch.commit();
    showToast(`Payout request for ₹${numAmount.toLocaleString('en-IN')} submitted successfully.`);
    return bReqDoc;
  };

  const userCancelBalanceRequest = async (requestId: string): Promise<void> => {
    if (!currentUser) throw new Error('Must be logged in to cancel.');
    const req = balanceRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Balance request not found.');
    if (req.userMobile !== currentUser.mobileNumber && req.userId !== currentUser.id) {
      throw new Error('Not authorized to cancel this request.');
    }
    if (req.status !== 'Pending') {
      throw new Error('Only pending requests can be cancelled.');
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const batch = writeBatch(db);
    batch.update(doc(db, 'balance_requests', requestId), {
      status: 'Cancelled',
      processedAt: nowIso,
    });

    const relatedTx = balanceTransactions.find((t) => t.relatedBalanceRequestId === requestId);
    if (relatedTx) {
      batch.update(doc(db, 'balance_transactions', relatedTx.id), {
        status: 'Cancelled',
      });
    }

    await batch.commit();
    showToast('Balance payout request cancelled.');
  };

  const adminApproveBalanceRequest = async (
    requestId: string,
    adminNotes?: string,
    payoutMethod?: string
  ): Promise<void> => {
    const req = balanceRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Balance request not found.');
    if (req.status !== 'Pending') {
      throw new Error('Only pending balance requests can be marked as Paid.');
    }

    const balInfo = getUserBalanceInfo(req.userMobile, req.userId);
    if (req.amount > balInfo.availableBalance) {
      throw new Error(
        `Requested amount ₹${req.amount.toLocaleString('en-IN')} exceeds customer available balance of ₹${balInfo.availableBalance.toLocaleString('en-IN')}.`
      );
    }

    const prevBalance = balInfo.availableBalance;
    const remainingBalance = Math.max(0, prevBalance - req.amount);
    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const txId = 'BTX-PAID-' + Date.now();

    const batch = writeBatch(db);

    // 1. Mark request as Paid
    batch.update(doc(db, 'balance_requests', requestId), {
      status: 'Paid',
      processedAt: nowIso,
      processedBy: 'ADMIN',
      adminNotes: adminNotes ? adminNotes.trim() : '',
      payoutMethod: payoutMethod ? payoutMethod.trim() : 'Cash / UPI',
      balanceTransactionId: txId,
    });

    // 2. Add 'Balance Paid' transaction to authoritative ledger
    const txDoc: BalanceTransaction = {
      id: txId,
      userId: req.userId,
      userName: req.userName,
      userMobile: req.userMobile,
      type: 'Balance Paid',
      amount: req.amount,
      previousBalance: prevBalance,
      remainingBalance: remainingBalance,
      status: 'Completed',
      date: dateStr,
      time: timeStr,
      timestamp: nowIso,
      relatedBalanceRequestId: req.id,
      actor: 'ADMIN',
      notes:
        adminNotes ||
        `Balance payout of ₹${req.amount.toLocaleString('en-IN')} marked as Paid by admin (${payoutMethod || 'Cash/UPI'})`,
    };
    batch.set(doc(db, 'balance_transactions', txId), sanitizeForFirestore(txDoc));

    // Also update original 'Money Requested' transaction status if present
    const relatedReqTx = balanceTransactions.find(
      (t) => t.relatedBalanceRequestId === requestId && t.type === 'Money Requested'
    );
    if (relatedReqTx) {
      batch.update(doc(db, 'balance_transactions', relatedReqTx.id), {
        status: 'Completed',
      });
    }

    // 3. Update user credit balance in app_users
    if (req.userId) {
      batch.update(doc(db, 'app_users', req.userId), {
        creditBalance: remainingBalance,
        updatedAt: nowIso,
      });
    }

    // 4. Deduct paid amount from customer's request(s) with pending extra cash
    let remainingDeductForReq = req.amount;
    const userReqsWithExtra = allRequests
      .filter(
        (r) =>
          ((req.userMobile && r.userMobile === req.userMobile) ||
            (req.userId && r.userId === req.userId)) &&
          (r.extraCash || 0) > 0
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const r of userReqsWithExtra) {
      if (remainingDeductForReq <= 0) break;
      const currentExtra = r.extraCash || 0;
      const deduct = Math.min(currentExtra, remainingDeductForReq);
      const newExtra = Math.max(0, currentExtra - deduct);
      const newExtraPaid = (r.extraCashPaid || 0) + deduct;
      remainingDeductForReq -= deduct;

      const timelineEvt: TimelineEvent = {
        id: 'EVT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'PARTIAL_PAYMENT',
        title: newExtra === 0 ? 'Extra Cash Fully Returned/Paid' : 'Extra Cash Paid to Customer',
        timestamp: nowIso,
        amountPaidThisStep: deduct,
        totalPaidSoFar: r.amountPaid,
        remainingBalance: r.remainingAmount,
        notes: `Balance payout of ₹${deduct.toLocaleString('en-IN')} approved and marked as Paid.${
          newExtra === 0
            ? ' Extra cash is now cleared.'
            : ` Remaining extra cash: ₹${newExtra.toLocaleString('en-IN')}.`
        }`,
        actor: 'ADMIN',
      };

      batch.update(doc(db, 'requests', r.id), {
        extraCash: newExtra,
        extraCashPaid: newExtraPaid,
        timeline: [...(r.timeline || []), timelineEvt],
        updatedAt: nowIso,
      });
    }

    // 5. Notification to user
    const notifId = 'NOTIF-' + Date.now();
    const notifMsg = `Your balance payout request of ₹${req.amount.toLocaleString('en-IN')} has been marked as Paid by admin.${
      remainingBalance === 0
        ? ' Balance is now fully cleared.'
        : ` Remaining balance: ₹${remainingBalance.toLocaleString('en-IN')}.`
    }${adminNotes ? ` Note: ${adminNotes}` : ''}`;

    batch.set(
      doc(db, 'notifications', notifId),
      sanitizeForFirestore({
        id: notifId,
        targetUserMobile: req.userMobile,
        title: 'Balance Payout Paid',
        message: notifMsg,
        type: 'payment_recorded',
        timestamp: nowIso,
        read: false,
      })
    );

    await batch.commit();

    if (remainingBalance === 0) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    showToast(
      `Payout request #${req.id} marked as Paid. ₹${req.amount.toLocaleString('en-IN')} deducted from ${req.userName}'s balance.`
    );
  };

  const adminRejectBalanceRequest = async (
    requestId: string,
    reasonNotes: string
  ): Promise<void> => {
    const req = balanceRequests.find((r) => r.id === requestId);
    if (!req) throw new Error('Balance request not found.');
    if (req.status !== 'Pending') {
      throw new Error('Only pending balance requests can be rejected.');
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const batch = writeBatch(db);

    // Update request status to Rejected (DO NOT deduct balance)
    batch.update(doc(db, 'balance_requests', requestId), {
      status: 'Rejected',
      processedAt: nowIso,
      processedBy: 'ADMIN',
      adminNotes: reasonNotes.trim() || 'Request rejected by admin',
    });

    // Update related transaction status to Rejected
    const relatedReqTx = balanceTransactions.find(
      (t) => t.relatedBalanceRequestId === requestId && t.type === 'Money Requested'
    );
    if (relatedReqTx) {
      batch.update(doc(db, 'balance_transactions', relatedReqTx.id), {
        status: 'Rejected',
        notes: `Rejected by admin: ${reasonNotes.trim() || 'No reason provided'}`,
      });
    }

    // User notification
    const notifId = 'NOTIF-' + Date.now();
    batch.set(
      doc(db, 'notifications', notifId),
      sanitizeForFirestore({
        id: notifId,
        targetUserMobile: req.userMobile,
        title: 'Balance Request Rejected',
        message: `Your balance request for ₹${req.amount.toLocaleString(
          'en-IN'
        )} was rejected by admin. Reason: ${reasonNotes.trim() || 'No reason provided'}. Your balance remains unchanged.`,
        type: 'info',
        timestamp: nowIso,
        read: false,
      })
    );

    await batch.commit();
    showToast(`Balance request #${req.id} has been rejected.`);
  };

  const adminPayBalance = async (params: {
    userId?: string;
    userMobile: string;
    userName: string;
    amount: number;
    notes?: string;
    relatedRequestId?: string;
  }): Promise<void> => {
    const { userId, userMobile, userName, amount, notes, relatedRequestId } = params;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Amount must be greater than ₹0.');
    }
    const balInfo = getUserBalanceInfo(userMobile, userId);
    const available = balInfo.availableBalance;
    if (numAmount > available) {
      throw new Error(`Amount cannot be greater than the available balance of ₹${available.toLocaleString('en-IN')}.`);
    }

    const prevBalance = available;
    const remainingBalance = Math.max(0, prevBalance - numAmount);
    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const txId = 'BTX-' + Date.now();

    const batch = writeBatch(db);

    const txDoc: BalanceTransaction = {
      id: txId,
      userId: userId || '',
      userName,
      userMobile,
      type: 'Balance Returned',
      amount: numAmount,
      previousBalance: prevBalance,
      remainingBalance,
      date: dateStr,
      time: timeStr,
      timestamp: nowIso,
      relatedRequestId: relatedRequestId || undefined,
      actor: 'ADMIN',
      notes: notes || 'Balance returned to customer by admin',
    };

    batch.set(doc(db, 'balance_transactions', txId), sanitizeForFirestore(txDoc));

    if (userId) {
      batch.update(doc(db, 'app_users', userId), {
        creditBalance: remainingBalance,
        updatedAt: nowIso,
      });
    }

    // Deduct paid amount from customer's request(s) with pending extra cash
    let remainingDeductForReq = numAmount;
    const userReqsWithExtra = allRequests
      .filter(
        (r) =>
          ((userMobile && r.userMobile === userMobile) ||
            (userId && r.userId === userId)) &&
          (r.extraCash || 0) > 0
      )
      .sort((a, b) => {
        if (relatedRequestId) {
          if (a.id === relatedRequestId) return -1;
          if (b.id === relatedRequestId) return 1;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    for (const r of userReqsWithExtra) {
      if (remainingDeductForReq <= 0) break;
      const currentExtra = r.extraCash || 0;
      const deduct = Math.min(currentExtra, remainingDeductForReq);
      const newExtra = Math.max(0, currentExtra - deduct);
      const newExtraPaid = (r.extraCashPaid || 0) + deduct;
      remainingDeductForReq -= deduct;

      const timelineEvt: TimelineEvent = {
        id: 'EVT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        type: 'PARTIAL_PAYMENT',
        title: newExtra === 0 ? 'Extra Cash Fully Returned/Paid' : 'Extra Cash Paid to Customer',
        timestamp: nowIso,
        amountPaidThisStep: deduct,
        totalPaidSoFar: r.amountPaid,
        remainingBalance: r.remainingAmount,
        notes: `Paid ₹${deduct.toLocaleString('en-IN')} cash balance to customer.${
          newExtra === 0
            ? ' Extra cash is now cleared.'
            : ` Remaining extra cash: ₹${newExtra.toLocaleString('en-IN')}.`
        }`,
        actor: 'ADMIN',
      };

      batch.update(doc(db, 'requests', r.id), {
        extraCash: newExtra,
        extraCashPaid: newExtraPaid,
        timeline: [...(r.timeline || []), timelineEvt],
        updatedAt: nowIso,
      });
    }

    // User notification
    const notifId = 'NOTIF-' + Date.now();
    const notifMsg = `₹${numAmount.toLocaleString('en-IN')} balance was paid/returned to you by admin.${
      remainingBalance === 0
        ? ' Balance is now fully cleared.'
        : ` Remaining balance: ₹${remainingBalance.toLocaleString('en-IN')}.`
    }${notes ? ` Note: ${notes}` : ''}`;

    batch.set(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: userMobile,
      title: remainingBalance === 0 ? 'Balance Paid & Cleared' : 'Balance Paid to You',
      message: notifMsg,
      type: 'payment_recorded',
      timestamp: nowIso,
      read: false,
    }));

    await batch.commit();

    if (remainingBalance === 0) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    showToast(
      `Balance of ₹${numAmount.toLocaleString('en-IN')} returned to ${userName}.${
        remainingBalance === 0 ? ' (Balance Cleared)' : ` Remaining: ₹${remainingBalance.toLocaleString('en-IN')}`
      }`
    );
  };

  const adminUseBalance = async (params: {
    userId?: string;
    userMobile: string;
    userName: string;
    amount: number;
    relatedRequestId?: string;
    notes?: string;
  }): Promise<void> => {
    const { userId, userMobile, userName, amount, relatedRequestId, notes } = params;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Amount must be greater than ₹0.');
    }
    const balInfo = getUserBalanceInfo(userMobile, userId);
    const available = balInfo.availableBalance;
    if (numAmount > available) {
      throw new Error(`Amount ₹${numAmount.toLocaleString('en-IN')} cannot exceed available balance of ₹${available.toLocaleString('en-IN')}.`);
    }

    const prevBalance = available;
    const remainingBalance = Math.max(0, prevBalance - numAmount);
    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const txId = 'BTX-' + Date.now();

    const batch = writeBatch(db);

    let targetReq: OrderRequest | undefined;
    if (relatedRequestId) {
      targetReq = allRequests.find((r) => r.id === relatedRequestId);
    }

    const txDoc: BalanceTransaction = {
      id: txId,
      userId: userId || '',
      userName,
      userMobile,
      type: 'Balance Used',
      amount: numAmount,
      previousBalance: prevBalance,
      remainingBalance,
      date: dateStr,
      time: timeStr,
      timestamp: nowIso,
      relatedRequestId: targetReq ? targetReq.id : '',
      relatedRequestTitle: targetReq ? targetReq.productName : '',
      actor: 'ADMIN',
      notes: notes || (targetReq ? `Used for order "${targetReq.productName}"` : 'Used from balance credit'),
    };

    batch.set(doc(db, 'balance_transactions', txId), sanitizeForFirestore(txDoc));

    if (userId) {
      batch.update(doc(db, 'app_users', userId), {
        creditBalance: remainingBalance,
        updatedAt: nowIso,
      });
    }

    // If applied towards a specific request
    if (targetReq) {
      const price = getRequestPrice(targetReq);
      const prevPaid = Number(targetReq.amountPaid) || 0;
      const reqDue = getRequestRemaining(targetReq);
      const allocation = Math.min(numAmount, reqDue);
      const newPaid = prevPaid + allocation;
      const newReqRem = Math.max(0, price - newPaid);
      const newReqStatus: RequestStatus = newReqRem === 0 ? 'Paid' : 'Partially Paid';

      const timelineEvt: TimelineEvent = {
        id: 'EVT-' + Date.now(),
        type: newReqRem === 0 ? 'TRANSACTION_COMPLETED' : 'PARTIAL_PAYMENT',
        title: `Balance Credit Applied (₹${allocation.toLocaleString('en-IN')})`,
        timestamp: nowIso,
        amountPaidThisStep: allocation,
        totalPaidSoFar: newPaid,
        remainingBalance: newReqRem,
        notes: `Used ₹${allocation.toLocaleString('en-IN')} from customer store balance credit.${notes ? ` (${notes})` : ''}`,
        actor: 'ADMIN',
      };

      batch.update(doc(db, 'requests', targetReq.id), sanitizeForFirestore({
        amountPaid: newPaid,
        remainingAmount: newReqRem,
        status: newReqStatus,
        timeline: [...(targetReq.timeline || []), timelineEvt],
        updatedAt: nowIso,
      }));
    }

    // Notification
    const notifId = 'NOTIF-' + Date.now();
    const notifMsg = `₹${numAmount.toLocaleString('en-IN')} was deducted/used from your balance${
      targetReq ? ` for "${targetReq.productName}"` : ''
    }.${
      remainingBalance === 0
        ? ' Balance is now completely cleared.'
        : ` Remaining balance: ₹${remainingBalance.toLocaleString('en-IN')}.`
    }${notes ? ` Note: ${notes}` : ''}`;

    batch.set(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: userMobile,
      title: 'Balance Used',
      message: notifMsg,
      type: 'payment_recorded',
      timestamp: nowIso,
      read: false,
    }));

    await batch.commit();

    if (remainingBalance === 0) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    showToast(
      `Used ₹${numAmount.toLocaleString('en-IN')} from balance for ${userName}.${
        remainingBalance === 0 ? ' (Balance Cleared)' : ` Remaining: ₹${remainingBalance.toLocaleString('en-IN')}`
      }`
    );
  };

  const adminAddBalanceAdjustment = async (params: {
    userId?: string;
    userMobile: string;
    userName: string;
    amount: number;
    type?: 'Balance Added' | 'Balance Adjustment';
    reason?: string;
    notes?: string;
  }): Promise<void> => {
    const { userId, userMobile, userName, amount, type = 'Balance Added', reason = 'Manual Adjustment', notes } = params;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Amount must be greater than ₹0.');
    }
    const balInfo = getUserBalanceInfo(userMobile, userId);
    const prevBalance = balInfo.availableBalance;
    const remainingBalance = prevBalance + numAmount;
    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const txId = 'BTX-' + Date.now();

    const batch = writeBatch(db);

    const txDoc: BalanceTransaction = {
      id: txId,
      userId: userId || '',
      userName,
      userMobile,
      type: type || 'Balance Added',
      amount: numAmount,
      previousBalance: prevBalance,
      remainingBalance,
      reason: reason,
      date: dateStr,
      time: timeStr,
      timestamp: nowIso,
      actor: 'ADMIN',
      notes: notes || `Balance added: ${reason}`,
    };

    batch.set(doc(db, 'balance_transactions', txId), sanitizeForFirestore(txDoc));

    if (userId) {
      batch.update(doc(db, 'app_users', userId), {
        creditBalance: remainingBalance,
        updatedAt: nowIso,
      });
    }

    const notifId = 'NOTIF-BAL-' + Date.now();
    const notifMsg = `₹${numAmount.toLocaleString('en-IN')} has been added to your balance. Reason: ${reason}. New Available Balance: ₹${remainingBalance.toLocaleString('en-IN')}.${notes ? ` Note: ${notes}` : ''}`;

    batch.set(doc(db, 'notifications', notifId), sanitizeForFirestore({
      id: notifId,
      targetUserMobile: userMobile,
      title: 'Balance Added',
      message: notifMsg,
      type: 'balance_added',
      reason: reason,
      amount: numAmount,
      newBalance: remainingBalance,
      timestamp: nowIso,
      read: false,
    }));

    await batch.commit();

    showToast(`Added ₹${numAmount.toLocaleString('en-IN')} to ${userName}'s balance (${reason}).`);
  };

  const adminSuspendUser = async (userId: string) => {
    await updateDoc(doc(db, 'app_users', userId), { status: 'suspended' });
    showToast('User suspended.');
  };

  const adminUnsuspendUser = async (userId: string) => {
    await updateDoc(doc(db, 'app_users', userId), { status: 'active' });
    showToast('User unsuspended.');
  };

  const adminDeleteUser = async (userId: string) => {
    await deleteDoc(doc(db, 'app_users', userId));
    showToast('User deleted.');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAdmin,
        appMode,
        userRequests,
        allRequests,
        allUsers,
        notifications: userNotifications,
        adminNotifications,
        unreadAdminNotificationsCount,
        unreadUserNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        groupPayments,
        balanceTransactions,
        balanceRequests,
        settings,
        checkMobileRegistered,
        registerUser,
        loginWithMobile,
        loginAsAdmin,
        logoutUser,
        submitNewRequest,
        userCancelRequest,
        userEditRequest,
        updateUserProfile,
        getUserBalanceInfo,
        userSubmitBalanceRequest,
        userCancelBalanceRequest,
        adminApproveBalanceRequest,
        adminRejectBalanceRequest,
        adminPayBalance,
        adminUseBalance,
        adminAddBalanceAdjustment,
        adminAcceptRequest,
        adminRejectRequest,
        adminDeleteRequest,
        adminUpdateStatus,
        adminRecordPayment,
        recordPayment: adminRecordPayment,
        adminApplyOffer,
        adminProcessGroupPayment,
        adminRecordGroupPaymentReceived,
        adminSuspendUser,
        adminUnsuspendUser,
        adminDeleteUser,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {/* Toast Overlay */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#E53935] text-white px-4 py-3 rounded-2xl shadow-2xl font-extrabold text-xs flex items-center gap-2 border border-rose-400/40 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
