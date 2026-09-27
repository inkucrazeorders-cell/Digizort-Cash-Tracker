import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SupportTicket, SupportTicketType, SupportTicketStatus } from '../types';
import { sanitizeInput } from '../lib/profileAndSupport';
import {
  HelpCircle,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  X,
  User,
  Phone,
  ShieldCheck,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  Laptop,
  Smartphone,
  Eye,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const AdminSupportDeskView: React.FC = () => {
  const {
    supportTickets,
    addSupportTicketMessage,
    adminUpdateSupportTicketStatus,
    showToast,
  } = useApp();

  const [typeFilter, setTypeFilter] = useState<'All' | SupportTicketType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | SupportTicketStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket for Inspection & Conversation
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Filtered tickets
  const filteredTickets = supportTickets.filter((ticket) => {
    if (typeFilter !== 'All' && ticket.type !== typeFilter) return false;
    if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSubject = ticket.subject.toLowerCase().includes(q);
      const matchesCustomer = ticket.userName.toLowerCase().includes(q);
      const matchesMobile = ticket.userMobile.includes(q);
      const matchesId = ticket.id.toLowerCase().includes(q);
      const matchesDesc = ticket.description.toLowerCase().includes(q);
      if (!matchesSubject && !matchesCustomer && !matchesMobile && !matchesId && !matchesDesc) {
        return false;
      }
    }

    return true;
  });

  // Metrics
  const totalCount = supportTickets.length;
  const submittedCount = supportTickets.filter((t) => t.status === 'Submitted').length;
  const underReviewCount = supportTickets.filter((t) => t.status === 'Under Review').length;
  const respondedCount = supportTickets.filter((t) => t.status === 'Responded').length;
  const resolvedCount = supportTickets.filter((t) => t.status === 'Resolved').length;

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminReplyText.trim()) return;

    try {
      setIsSendingReply(true);
      await addSupportTicketMessage({
        ticketId: selectedTicket.id,
        text: sanitizeInput(adminReplyText, 1000),
      });

      setAdminReplyText('');
      // Refresh selected ticket
      const updated = supportTickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to send response.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleChangeStatus = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;

    try {
      setIsUpdatingStatus(true);
      await adminUpdateSupportTicketStatus({
        ticketId: selectedTicket.id,
        status: newStatus,
        adminNotes: adminNotesInput ? sanitizeInput(adminNotesInput, 500) : undefined,
      });

      // Refresh selected ticket
      const updated = supportTickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket({ ...updated, status: newStatus });
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'Submitted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Submitted
          </span>
        );
      case 'Under Review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Under Review
          </span>
        );
      case 'Responded':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Responded
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-500/15 text-teal-400 border border-teal-500/30">
            Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
            Closed
          </span>
        );
    }
  };

  const getTypeBadge = (type: SupportTicketType) => {
    switch (type) {
      case 'feedback':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Feedback
          </span>
        );
      case 'suggestion':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Suggestion
          </span>
        );
      case 'problem':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Problem Report
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Tickets</span>
          <span className="text-2xl font-black text-white block">{totalCount}</span>
          <span className="text-[10px] text-zinc-400">All submitted items</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block">Action Required</span>
          <span className="text-2xl font-black text-amber-400 block">{submittedCount + underReviewCount}</span>
          <span className="text-[10px] text-zinc-400">Submitted or in review</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block">Responded</span>
          <span className="text-2xl font-black text-blue-400 block">{respondedCount}</span>
          <span className="text-[10px] text-zinc-400">Awaiting customer reply</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase block">Resolved</span>
          <span className="text-2xl font-black text-emerald-400 block">{resolvedCount}</span>
          <span className="text-[10px] text-zinc-400">Successfully handled</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tickets by customer name, mobile, ticket ID, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="All">All Types</option>
              <option value="problem">Problem Reports</option>
              <option value="suggestion">Suggestions</option>
              <option value="feedback">Feedback</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-2.5 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Responded">Responded</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl space-y-2">
          <HelpCircle className="w-12 h-12 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-300">No support tickets found</h4>
          <p className="text-xs text-zinc-500">
            {searchQuery || typeFilter !== 'All' || statusFilter !== 'All'
              ? 'Try adjusting your search query or status filter.'
              : 'Customer support tickets, feedback, and problem reports will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-zinc-400 font-extrabold text-xs">#{ticket.id}</span>
                    {getTypeBadge(ticket.type)}
                    {getStatusBadge(ticket.status)}
                    <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                      {ticket.category}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-white pt-1">{ticket.subject}</h4>
                  <p className="text-xs text-zinc-300 line-clamp-2">{ticket.description}</p>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-bold text-zinc-200">{ticket.userName}</span>
                      {ticket.userNickname && (
                        <span className="text-zinc-500">({ticket.userNickname})</span>
                      )}
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{ticket.userMobile}</span>
                    </div>
                    <span>•</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {ticket.relatedRequestId && (
                      <>
                        <span>•</span>
                        <span className="text-rose-400 font-bold">Related Order: #{ticket.relatedRequestId}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setAdminNotesInput(ticket.adminNotes || '');
                    }}
                    className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-rose-400" />
                    <span>Open &amp; Respond</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TICKET DETAIL & MANAGEMENT MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col my-auto text-white">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-zinc-400 font-extrabold text-xs">#{selectedTicket.id}</span>
                  {getTypeBadge(selectedTicket.type)}
                  {getStatusBadge(selectedTicket.status)}
                  <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                    {selectedTicket.category}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                  <span>Customer: <strong className="text-white">{selectedTicket.userName}</strong> ({selectedTicket.userMobile})</span>
                  <span>•</span>
                  <span>ID: #{selectedTicket.userId}</span>
                  {selectedTicket.relatedRequestId && (
                    <>
                      <span>•</span>
                      <span className="text-rose-400 font-bold">Related Order: #{selectedTicket.relatedRequestId}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs font-bold text-zinc-400">Change Ticket Status:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['Under Review', 'Responded', 'Resolved', 'Closed'] as SupportTicketStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={isUpdatingStatus || selectedTicket.status === st}
                    onClick={() => handleChangeStatus(st)}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                      selectedTicket.status === st
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Technical Context if available */}
            {selectedTicket.technicalContext && (selectedTicket.technicalContext.browser || selectedTicket.technicalContext.os) && (
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Technical Diagnostics:</span>
                </div>
                {selectedTicket.technicalContext.browser && (
                  <span>Browser: <strong className="text-zinc-200">{selectedTicket.technicalContext.browser}</strong></span>
                )}
                {selectedTicket.technicalContext.os && (
                  <span>OS: <strong className="text-zinc-200">{selectedTicket.technicalContext.os}</strong></span>
                )}
                {selectedTicket.technicalContext.device && (
                  <span>Device: <strong className="text-zinc-200">{selectedTicket.technicalContext.device}</strong></span>
                )}
                {selectedTicket.technicalContext.screen && (
                  <span>Screen: <strong className="text-zinc-200">{selectedTicket.technicalContext.screen}</strong></span>
                )}
              </div>
            )}

            {/* Initial Attachment if present */}
            {selectedTicket.attachmentUrl && (
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-400 block">Initial User Attachment:</span>
                <img
                  src={selectedTicket.attachmentUrl}
                  alt="Customer Attachment"
                  className="max-h-48 rounded-xl object-contain border border-zinc-700 bg-black/40 cursor-pointer"
                  onClick={() => window.open(selectedTicket.attachmentUrl, '_blank')}
                />
              </div>
            )}

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto space-y-4 p-1 pr-2 max-h-[35vh]">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((msg, index) => {
                  const isAdminMsg = msg.sender === 'ADMIN';
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-1">
                        <span className={`font-bold ${isAdminMsg ? 'text-rose-400' : 'text-zinc-300'}`}>
                          {msg.senderName} {isAdminMsg ? '(Administrator)' : ''}
                        </span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div
                        className={`p-4 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isAdminMsg
                            ? 'bg-rose-950/40 text-white border border-rose-500/30'
                            : 'bg-zinc-950 text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.attachmentUrl && (
                          <div className="mt-2.5">
                            <img
                              src={msg.attachmentUrl}
                              alt="Attachment"
                              className="max-h-48 rounded-xl object-contain border border-zinc-700 bg-black/40 cursor-pointer"
                              onClick={() => window.open(msg.attachmentUrl, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-2xl bg-zinc-950 text-xs text-zinc-300">
                  {selectedTicket.description}
                </div>
              )}
            </div>

            {/* Admin Reply Input */}
            <form onSubmit={handleSendAdminReply} className="space-y-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder={`Respond to ${selectedTicket.userName}... (User will receive an instant notification)`}
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="py-2.5 px-5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingReply ? 'Sending...' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
