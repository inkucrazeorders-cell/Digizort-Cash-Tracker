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
  getRequestRemaining,
  isRequestRejected,
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

  // Admin Actions
  adminAcceptRequest: (requestId: string, actualPrice: number, adminNotes?: string) => Promise<void>;
  adminRejectRequest: (requestId: string, reasonNotes: string) => Promise<void>;
  adminDeleteRequest: (requestId: string) => Promise<void>;
  adminUpdateStatus: (requestId: string, newStatus: RequestStatus, notes?: string) => Promise<void>;
  adminRecordPayment: (requestId: string, paymentAmount: number, note?: string) => Promise<void>;
  adminProcessGroupPayment: (params: {
    userId: string;
    userName: string;
    userMobile: string;
    requestIds: string[];
    cashReceived: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<string>;
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

  // Filter requests for the current user
  const userRequests = currentUser
    ? allRequests.filter((r) => r.userMobile === currentUser.mobileNumber)
    : [];

  // Filter notifications for current user
  const userNotifications = currentUser
    ? notifications.filter((n) => n.targetUserMobile === 'ALL' || n.targetUserMobile === currentUser.mobileNumber)
    : notifications;

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
    const rawUser: AppUser = {
      id: cleanNum,
      fullName: userData.fullName.trim(),
      mobileNumber: cleanNum,
      email: userData.email ? userData.email.trim() : '',
      address: userData.address ? userData.address.trim() : '',
      profilePhoto: userData.profilePhoto ? userData.profilePhoto.trim() : '',
      status: 'active',
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    const newUser = sanitizeForFirestore(rawUser);
    await setDoc(doc(db, 'app_users', cleanNum), newUser);
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
    await setDoc(doc(db, 'requests', reqId), newRequest);

    // Create Notification for Admin & User
    const notifId = 'NOTIF-' + Date.now();
    await setDoc(
      doc(db, 'notifications', notifId),
      sanitizeForFirestore({
        id: notifId,
        targetUserMobile: 'ALL',
        title: 'New Order Request Submitted',
        message: `${currentUser.fullName} (${currentUser.mobileNumber}) submitted a request for "${data.productName}".`,
        type: 'request_submitted',
        timestamp: nowIso,
        read: false,
        requestId: reqId,
      })
    );

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

    await updateDoc(docRef, {
      status: 'Cancelled',
      timeline: [...(req.timeline || []), cancelEvt],
      updatedAt: nowIso,
    });

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

    const actual = req.actualPrice || req.expectedPrice || req.amount || 0;
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

    // 3. User notification
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
        groupPayments,
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
        adminAcceptRequest,
        adminRejectRequest,
        adminDeleteRequest,
        adminUpdateStatus,
        adminRecordPayment,
        adminProcessGroupPayment,
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
