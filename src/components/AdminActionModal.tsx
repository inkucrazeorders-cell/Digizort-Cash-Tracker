import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderRequest, RequestStatus } from '../types';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckCircle2,
  XCircle,
  DollarSign,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  AlertTriangle,
} from 'lucide-react';

interface AdminActionModalProps {
  request: OrderRequest | null;
  actionType: 'accept' | 'reject' | 'status' | 'payment' | null;
  onClose: () => void;
}

const ALL_STATUSES: RequestStatus[] = [
  'Pending Review',
  'Accepted',
  'Processing',
  'Ordered',
  'Waiting For Payment',
  'Partially Paid',
  'Paid',
  'Rejected',
  'Cancelled',
];

export const AdminActionModal: React.FC<AdminActionModalProps> = ({
  request,
  actionType,
  onClose,
}) => {
  const {
    adminAcceptRequest,
    adminRejectRequest,
    adminUpdateStatus,
    adminRecordPayment,
    settings,
  } = useApp();

  const [assignedPrice, setAssignedPrice] = useState<string>(
    request ? String(request.actualPrice || request.expectedPrice || '') : ''
  );
  const [adminNote, setAdminNote] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>(
    request?.status || 'Processing'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request || !actionType) return null;

  const actualPrice = request.actualPrice || request.expectedPrice || 0;
  const currentPaid = request.amountPaid || (request.status === 'Paid' ? actualPrice : 0);
  const remaining = request.remainingAmount ?? (request.status === 'Paid' ? 0 : Math.max(0, actualPrice - currentPaid));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      if (actionType === 'accept') {
        const price = Number(assignedPrice) || request.expectedPrice || 0;
        await adminAcceptRequest(request.id, price, adminNote.trim() || undefined);
      } else if (actionType === 'reject') {
        await adminRejectRequest(request.id, adminNote.trim() || 'Request rejected by admin.');
      } else if (actionType === 'status') {
        await adminUpdateStatus(request.id, selectedStatus, adminNote.trim() || undefined);
      } else if (actionType === 'payment') {
        const pAmt = Number(paymentAmount) || 0;
        if (pAmt <= 0) return;
        await adminRecordPayment(request.id, pAmt, adminNote.trim() || undefined);
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative my-auto"
          id="admin-action-modal"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-1">
              ADMIN CONTROL PANEL
            </span>
            <h3 className="text-base font-extrabold text-white">
              {actionType === 'accept' && 'Accept Order Request'}
              {actionType === 'reject' && 'Reject Order Request'}
              {actionType === 'status' && 'Update Request Status'}
              {actionType === 'payment' && 'Record Customer Payment'}
            </h3>
            <p className="text-xs text-zinc-400">
              Customer: <span className="text-white font-bold">{request.userName}</span> ({request.userMobile})
            </p>
          </div>

          {/* Request Brief */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs space-y-1">
            <div className="flex justify-between font-extrabold text-white">
              <span>{request.productName}</span>
              <span className="text-rose-400">
                {settings.currencySymbol}
                {actualPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-zinc-400 text-[11px]">{request.purpose}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ACTION 1: ACCEPT */}
            {actionType === 'accept' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Assign Final Price ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={assignedPrice}
                    onChange={(e) => setAssignedPrice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-[#E53935]"
                    id="input-assigned-price"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Expected price was {settings.currencySymbol}{request.expectedPrice.toLocaleString('en-IN')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Acceptance Notes / Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Price confirmed, order proceeding..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#E53935] resize-none"
                  />
                </div>
              </>
            )}

            {/* ACTION 2: REJECT */}
            {actionType === 'reject' && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Out of stock, item unavailable, or price too high..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                  id="textarea-rejection-reason"
                />
              </div>
            )}

            {/* ACTION 3: UPDATE STATUS */}
            {actionType === 'status' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Select New Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as RequestStatus)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#E53935]"
                    id="select-admin-status"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Timeline Note <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Status change notes..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
                  />
                </div>
              </>
            )}

            {/* ACTION 4: RECORD PAYMENT */}
            {actionType === 'payment' && (
              <>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs flex items-center justify-between">
                  <span className="text-zinc-400">Current Balance Due:</span>
                  <span className="font-extrabold text-rose-400 text-sm">
                    {settings.currencySymbol}
                    {remaining.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Amount Received ({settings.currencySymbol}) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={remaining || undefined}
                    required
                    placeholder={`e.g. ${remaining}`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-emerald-400 font-extrabold text-base focus:outline-none focus:border-emerald-500"
                    id="input-admin-payment-amount"
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(remaining))}
                    className="text-[10px] text-emerald-400 font-bold hover:underline mt-1"
                  >
                    Set Full Remaining ({settings.currencySymbol}{remaining.toLocaleString('en-IN')})
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Payment Note / Receipt No. <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Received via UPI / Cash / Bank Transfer"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 py-3 px-4 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                  actionType === 'reject'
                    ? 'bg-rose-600 hover:brightness-110 shadow-rose-600/20'
                    : 'bg-[#E53935] hover:brightness-110 shadow-[#E53935]/20'
                }`}
                id="btn-confirm-admin-action"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Action</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
