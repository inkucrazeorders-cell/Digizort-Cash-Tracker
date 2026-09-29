import React, { useState } from 'react';
import { OrderRequest, PaymentVerification } from '../types';
import { useApp } from '../context/AppContext';
import { AdminPaymentVerificationActionModal } from './AdminPaymentVerificationActionModal';
import {
  formatPaymentVerifiedWhatsAppMessage,
  formatPaymentRejectedWhatsAppMessage,
  sendWhatsAppViaServer,
} from '../lib/whatsapp';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Check,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Smartphone,
  Building,
  CreditCard,
  FileText,
  User,
  Loader2,
  History,
  MessageCircle,
} from 'lucide-react';

interface PaymentVerificationSectionProps {
  request: OrderRequest;
  isAdminView?: boolean;
  onOpenPayModal?: () => void;
}

export const PaymentVerificationSection: React.FC<PaymentVerificationSectionProps> = ({
  request,
  isAdminView = false,
  onOpenPayModal,
}) => {
  const { adminStartPaymentVerification, settings, showToast } = useApp();

  const [isStartingVerification, setIsStartingVerification] = useState(false);
  const [adminActionModal, setAdminActionModal] = useState<{
    mode: 'approve' | 'reject';
    verification: PaymentVerification;
  } | null>(null);

  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const verification = request.activePaymentVerification;
  const history = request.paymentVerificationHistory || [];

  if (!verification && history.length === 0) return null;

  const isPending = verification?.status === 'Pending';
  const isVerifying = verification?.status === 'Verifying';
  const isApproved = verification?.status === 'Approved';
  const isRejected = verification?.status === 'Rejected';

  const handleStartVerification = async () => {
    if (!verification) return;
    try {
      setIsStartingVerification(true);
      await adminStartPaymentVerification(request.id, verification.id);
    } catch (err: any) {
      showToast(err?.message || 'Failed to start verification.');
    } finally {
      setIsStartingVerification(false);
    }
  };

  const handleSendWhatsAppUpdate = async () => {
    if (!verification) return;
    setIsSendingWhatsApp(true);
    try {
      let msg = '';
      if (isApproved) {
        msg = formatPaymentVerifiedWhatsAppMessage({
          customerName: request.userName,
          requestId: request.id,
          paymentMethod: verification.customPaymentMethod
            ? `${verification.paymentMethod} (${verification.customPaymentMethod})`
            : verification.paymentMethod,
          amount: verification.amountClaimed,
          currencySymbol: settings.currencySymbol,
        });
      } else if (isRejected) {
        msg = formatPaymentRejectedWhatsAppMessage({
          customerName: request.userName,
          requestId: request.id,
          paymentMethod: verification.customPaymentMethod
            ? `${verification.paymentMethod} (${verification.customPaymentMethod})`
            : verification.paymentMethod,
          amount: verification.amountClaimed,
          reason: verification.rejectionReason || 'Details could not be verified',
          currencySymbol: settings.currencySymbol,
        });
      }

      if (!msg) return;

      const res = await sendWhatsAppViaServer({
        to: request.userMobile,
        message: msg,
        requestId: request.id,
        customerName: request.userName,
      });

      if (res.success) {
        showToast('WhatsApp verification notice sent successfully!');
      } else {
        showToast(`WhatsApp notice: ${res.error || 'Check server status'}`);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to send WhatsApp message');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const formattedSubmitted = verification?.submittedAt
    ? new Date(verification.submittedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'Recently';

  return (
    <div className="space-y-3">
      {/* Active Payment Verification Card */}
      {verification && (
        <div
          className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
            isApproved
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : isRejected
              ? 'bg-rose-950/20 border-rose-500/30'
              : isVerifying
              ? 'bg-blue-950/20 border-blue-500/40'
              : 'bg-amber-950/20 border-amber-500/40'
          }`}
        >
        {/* Header & Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isApproved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isRejected
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isVerifying
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isRejected ? (
                <XCircle className="w-4 h-4" />
              ) : isVerifying ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Payment Verification
                </span>
                <span className="font-mono text-[10px] text-zinc-400 font-bold">
                  #{verification.id}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Submitted on {formattedSubmitted}
              </p>
            </div>
          </div>

          <div>
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>{isAdminView ? 'Verification Requested' : 'Verification Pending'}</span>
              </span>
            )}
            {isVerifying && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Verifying Payment</span>
              </span>
            )}
            {isApproved && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified &amp; Approved</span>
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Verification Rejected</span>
              </span>
            )}
          </div>
        </div>

        {/* Claimed Payment Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-850 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
              Payment Method
            </span>
            <span className="font-extrabold text-white">
              {verification.paymentMethod}
              {verification.customPaymentMethod ? ` (${verification.customPaymentMethod})` : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
              Amount Claimed
            </span>
            <span className="font-black text-emerald-400 text-sm">
              {settings.currencySymbol}
              {verification.amountClaimed.toLocaleString('en-IN')}
            </span>
          </div>

          {isAdminView && (
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                Customer
              </span>
              <span className="font-bold text-zinc-200 truncate block">
                {verification.userName || request.userName}
              </span>
            </div>
          )}

          {verification.transactionId && (
            <div className={isAdminView ? '' : 'col-span-2'}>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                UTR / Reference ID
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs select-all truncate block">
                {verification.transactionId}
              </span>
            </div>
          )}
        </div>

        {/* Customer Note if present */}
        {verification.userNote && (
          <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 text-xs text-zinc-300">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
              Customer Note:
            </span>
            <p className="italic text-zinc-200">"{verification.userNote}"</p>
          </div>
        )}

        {/* Payment Proof URL if provided */}
        {verification.proofUrl && (
          <div className="text-xs flex items-center gap-2">
            <span className="text-zinc-500 font-medium">Payment Proof:</span>
            <a
              href={verification.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>View Submitted Proof</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Rejection notice if rejected */}
        {isRejected && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Rejection Reason:</span>
            </div>
            <p className="text-zinc-200 pl-5.5">
              {verification.rejectionReason || 'Payment verification could not be validated.'}
            </p>
            {verification.adminNotes && (
              <p className="text-zinc-400 text-[11px] pl-5.5 italic">
                Note: {verification.adminNotes}
              </p>
            )}
          </div>
        )}

        {/* Section 8: Interactive Timeline / Verification Step Tracker */}
        {(isVerifying || isApproved || isRejected) && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
              Payment Verification Timeline
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">Payment claimed by customer ({formattedSubmitted})</span>
              </div>

              <div
                className={`flex items-center gap-2 ${
                  isVerifying || isApproved || isRejected ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">
                  Verification started by DIGIZORT
                  {verification.verificationStartedAt && (
                    <span className="text-[10px] text-zinc-400 font-normal ml-1.5">
                      ({new Date(verification.verificationStartedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </span>
              </div>

              <div
                className={`flex items-center gap-2 ${
                  isVerifying
                    ? 'text-blue-400 font-bold animate-pulse'
                    : isApproved || isRejected
                    ? 'text-emerald-400'
                    : 'text-zinc-500'
                }`}
              >
                {isVerifying ? (
                  <span className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
                ) : (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Payment being verified by DIGIZORT Team</span>
              </div>

              <div
                className={`flex items-center gap-2 ${
                  isApproved
                    ? 'text-emerald-400 font-bold'
                    : isRejected
                    ? 'text-rose-400 font-bold'
                    : 'text-zinc-500'
                }`}
              >
                {isApproved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : isRejected ? (
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <span className="w-3 h-3 rounded-full border border-zinc-600 shrink-0" />
                )}
                <span>
                  {isApproved
                    ? 'Verification result: Approved & Payment Confirmed'
                    : isRejected
                    ? 'Verification result: Rejected'
                    : 'Verification result (Pending)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User View Status Guidance Messages */}
        {!isAdminView && (
          <div>
            {isPending && (
              <p className="text-xs text-amber-300/90 font-medium">
                "Your payment verification request has been sent to the DIGIZORT Team. Please wait while your payment is verified."
              </p>
            )}

            {isVerifying && (
              <p className="text-xs text-blue-300 font-medium">
                "DIGIZORT is verifying your payment. Your order will be updated once verification is complete."
              </p>
            )}

            {isApproved && (
              <p className="text-xs text-emerald-300 font-semibold">
                ✓ Payment confirmed and settled by DIGIZORT Team. Thank you!
              </p>
            )}

            {isRejected && onOpenPayModal && (
              <div className="pt-1 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">
                  Please check your transaction details and re-submit your payment verification.
                </p>
                <button
                  type="button"
                  onClick={onOpenPayModal}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>I Have Paid</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 7, 8, 9: Admin Verification Action Controls */}
        {isAdminView && (
          <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 flex-wrap">
            {isPending && (
              <button
                type="button"
                onClick={handleStartVerification}
                disabled={isStartingVerification}
                className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                id={`btn-start-verification-${request.id}`}
              >
                {isStartingVerification ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Start Verification</span>
              </button>
            )}

            {(isPending || isVerifying) && (
              <>
                <button
                  type="button"
                  onClick={() => setAdminActionModal({ mode: 'approve', verification })}
                  className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                  id={`btn-approve-payment-verification-${request.id}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Payment ({settings.currencySymbol}{verification.amountClaimed.toLocaleString('en-IN')})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminActionModal({ mode: 'reject', verification })}
                  className="py-1.5 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  id={`btn-reject-payment-verification-${request.id}`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Verification</span>
                </button>
              </>
            )}

            {/* Section 22: Admin WhatsApp notification button */}
            {(isApproved || isRejected) && (
              <button
                type="button"
                onClick={handleSendWhatsAppUpdate}
                disabled={isSendingWhatsApp}
                className="py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                title="Send official payment verification status update via WhatsApp"
              >
                {isSendingWhatsApp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Send WhatsApp Notice</span>
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* SECTION 13: Payment Verification History Audit Trail */}
      {history.length > 0 && (
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Payment Verification History</span>
            </h4>
            <span className="text-[10px] text-zinc-500 font-bold">
              {history.length} {history.length === 1 ? 'Attempt' : 'Attempts'} Logged
            </span>
          </div>

          <div className="space-y-2">
            {history.map((h) => {
              const hSubmitted = h.submittedAt
                ? new Date(h.submittedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A';

              const isHistApproved = h.status === 'Approved';
              const isHistRejected = h.status === 'Rejected';

              return (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">
                        #{h.id}
                      </span>
                      <span className="text-zinc-400 font-medium">
                        {h.paymentMethod}
                        {h.customPaymentMethod ? ` (${h.customPaymentMethod})` : ''}
                      </span>
                      <span className="font-extrabold text-emerald-400">
                        {settings.currencySymbol}
                        {h.amountClaimed.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      {isHistApproved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Verified</span>
                        </span>
                      )}
                      {isHistRejected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {!isHistApproved && !isHistRejected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                          <span>{h.status}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Submitted: {hSubmitted}</span>
                    {h.verifiedBy && (
                      <span className="text-emerald-400 font-medium">
                        Verified by: {h.verifiedBy}
                      </span>
                    )}
                    {h.rejectedBy && (
                      <span className="text-rose-400 font-medium">
                        Reviewed by: {h.rejectedBy}
                      </span>
                    )}
                  </div>

                  {h.rejectionReason && (
                    <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-300">
                      <strong>Reason:</strong> {h.rejectionReason}
                    </div>
                  )}

                  {h.transactionId && (
                    <div className="text-[10px] text-zinc-500 font-mono">
                      UTR: {h.transactionId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Action Modal for Approve / Reject */}
      {adminActionModal && verification && (
        <AdminPaymentVerificationActionModal
          isOpen={!!adminActionModal}
          mode={adminActionModal.mode}
          request={request}
          verification={adminActionModal.verification}
          onClose={() => setAdminActionModal(null)}
        />
      )}
    </div>
  );
};
