import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { DigitalDocumentCard } from './DigitalDocumentCard';
import { RecordPaymentModal } from './RecordPaymentModal';
import { X, FileText } from 'lucide-react';

export const WhatsAppModal: React.FC = () => {
  const { isWhatsAppModalOpen, setIsWhatsAppModalOpen, whatsAppTx } = useApp();
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  if (!isWhatsAppModalOpen || !whatsAppTx) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden relative my-auto max-h-[92vh] flex flex-col"
            id="whatsapp-modal-dialog"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Digital Document & Share</h3>
                  <p className="text-[10px] text-zinc-400">
                    Official Confirmation Card & Timeline Records
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                id="close-whatsapp-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <DigitalDocumentCard
                transaction={whatsAppTx}
                showWhatsAppShare={true}
                onClose={() => setIsWhatsAppModalOpen(false)}
                onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
              />
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Record Payment Sub-Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          transaction={whatsAppTx}
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      )}
    </>
  );
};
