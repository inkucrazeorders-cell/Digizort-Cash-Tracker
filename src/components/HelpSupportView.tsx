import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SupportTicket, SupportTicketType, SupportTicketStatus } from '../types';
import { getSafeTechnicalContext, processImageUpload, sanitizeInput } from '../lib/profileAndSupport';
import {
  HelpCircle,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Inbox,
  PhoneCall,
  Search,
  ChevronDown,
  ChevronUp,
  Paperclip,
  X,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  FileText,
  User,
  Image as ImageIcon,
  ArrowRight,
  Info,
} from 'lucide-react';

export const HelpSupportView: React.FC = () => {
  const {
    currentUser,
    userRequests,
    supportTickets,
    createSupportTicket,
    addSupportTicketMessage,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'faq' | 'feedback' | 'suggestion' | 'problem' | 'my_tickets' | 'contact'
  >('faq');

  // FAQ state
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Form states
  const [feedbackCategory, setFeedbackCategory] = useState('User Experience');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackAttachment, setFeedbackAttachment] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('New Feature');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [suggestionAttachment, setSuggestionAttachment] = useState<string>('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  const [problemTitle, setProblemTitle] = useState('');
  const [problemCategory, setProblemCategory] = useState('Website Glitch');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemRequestId, setProblemRequestId] = useState('');
  const [problemAttachment, setProblemAttachment] = useState<string>('');
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);

  // Ticket inspection & conversation state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const feedbackFileRef = useRef<HTMLInputElement>(null);
  const suggestionFileRef = useRef<HTMLInputElement>(null);
  const problemFileRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  // Filter user's tickets
  const myTickets = supportTickets.filter(
    (t) => t.userMobile === currentUser.mobileNumber || t.userId === currentUser.id
  );

  const unreadResponseCount = myTickets.filter((t) => t.status === 'Responded').length;

  // FAQ Data
  const faqs = [
    {
      q: 'How do I submit an order or service request in DIGIZORT?',
      category: 'Requests',
      a: 'Click on the "New Request" button from the top navigation or dashboard. Select your request type (Product Purchase, Online Service, Recharge, etc.), specify the item title, purpose, expected price, and any product links. Our administrators will verify and process your request promptly.',
    },
    {
      q: 'What is DIGIZORT Universal Balance and how do I use it?',
      category: 'Balance',
      a: 'Universal Balance represents your available credit on the platform. It comes from cash refunds, surplus payments, or account credits granted by DIGIZORT. You can use this balance seamlessly to pay for new order requests or settle existing order amounts without needing external payments.',
    },
    {
      q: 'What happens if my order request is rejected or cancelled?',
      category: 'Refunds',
      a: 'If an order request is rejected by our team or cancelled while pending review, any DIGIZORT Balance or funds that were allocated to it are automatically refunded in full back to your Available DIGIZORT Balance immediately.',
    },
    {
      q: 'How do I withdraw or request payout of my DIGIZORT Balance?',
      category: 'Withdrawals',
      a: 'Navigate to "Credit & Balance" tab in your portal and click "Request a Withdrawal". Enter your desired withdrawal amount up to your available balance. Admin will review the request and pay it via your preferred payment method (UPI / Bank / Cash).',
    },
    {
      q: 'How are supplier discounts and special offers applied?',
      category: 'Orders',
      a: 'If our supplier team secures a discount on your requested item, a special offer will be attached to your order request. You will see both your original requested amount and the discounted price with the total savings highlighted.',
    },
    {
      q: 'How do I get official statements and receipts?',
      category: 'Payments',
      a: 'Every request has a verified Digital Document Statement. Go to "My Requests" or "Documents & Shares", click on any order, and download high-resolution PNG or PDF receipts with timestamped verification stamps.',
    },
    {
      q: 'Will I receive updates on WhatsApp?',
      category: 'WhatsApp',
      a: 'Yes! When you submit a request or when official updates are confirmed, DIGIZORT automatically dispatches official WhatsApp notifications to your registered mobile number.',
    },
    {
      q: 'How can I change my display name or bio?',
      category: 'Account',
      a: 'Go to "My Profile" tab and click "Edit Profile". You can set your custom Nickname, a short bio, preferred language, and upload a profile photo without affecting your official legal account identity.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    if (!faqSearch) return true;
    const q = faqSearch.toLowerCase();
    return (
      faq.q.toLowerCase().includes(q) ||
      faq.a.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q)
    );
  });

  const handleFileUpload = async (
    file: File,
    setter: (url: string) => void
  ) => {
    try {
      const base64Data = await processImageUpload(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        maxSizeBytes: 2.5 * 1024 * 1024,
      });
      setter(base64Data);
      showToast('Attachment uploaded.');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload attachment.');
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      showToast('Please fill in subject and feedback message.');
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      const ticket = await createSupportTicket({
        type: 'feedback',
        category: feedbackCategory,
        subject: sanitizeInput(feedbackSubject, 100),
        description: sanitizeInput(feedbackMessage, 1000),
        attachmentUrl: feedbackAttachment,
        technicalContext: getSafeTechnicalContext('Help & Support > Send Feedback'),
      });
      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackAttachment('');
      setSelectedTicket(ticket);
      setActiveTab('my_tickets');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Submit Suggestion
  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionTitle.trim() || !suggestionDescription.trim()) {
      showToast('Please fill in suggestion title and description.');
      return;
    }

    try {
      setIsSubmittingSuggestion(true);
      const ticket = await createSupportTicket({
        type: 'suggestion',
        category: suggestionCategory,
        subject: sanitizeInput(suggestionTitle, 100),
        description: sanitizeInput(suggestionDescription, 1000),
        attachmentUrl: suggestionAttachment,
        technicalContext: getSafeTechnicalContext('Help & Support > Suggest an Idea'),
      });
      setSuggestionTitle('');
      setSuggestionDescription('');
      setSuggestionAttachment('');
      setSelectedTicket(ticket);
      setActiveTab('my_tickets');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit suggestion.');
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  // Submit Problem Report
  const handleSubmitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemTitle.trim() || !problemDescription.trim()) {
      showToast('Please fill in problem title and description.');
      return;
    }

    try {
      setIsSubmittingProblem(true);
      const ticket = await createSupportTicket({
        type: 'problem',
        category: problemCategory,
        subject: sanitizeInput(problemTitle, 100),
        description: sanitizeInput(problemDescription, 1000),
        relatedRequestId: problemRequestId || undefined,
        attachmentUrl: problemAttachment,
        technicalContext: getSafeTechnicalContext('Help & Support > Report a Problem'),
      });
      setProblemTitle('');
      setProblemDescription('');
      setProblemRequestId('');
      setProblemAttachment('');
      setSelectedTicket(ticket);
      setActiveTab('my_tickets');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit problem report.');
    } finally {
      setIsSubmittingProblem(false);
    }
  };

  // Send reply in ticket conversation
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setIsSendingReply(true);
      await addSupportTicketMessage({
        ticketId: selectedTicket.id,
        text: sanitizeInput(replyText, 1000),
        attachmentUrl: replyAttachment || undefined,
      });

      setReplyText('');
      setReplyAttachment('');
      // Find updated ticket from array
      const updated = supportTickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to send reply.');
    } finally {
      setIsSendingReply(false);
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
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-400">
            {status}
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
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/90 shadow-2xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] text-white shadow-lg shadow-rose-900/20">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#E53935] uppercase tracking-widest block">
              SUPPORT &amp; FEEDBACK DESK
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              How can we assist you today?
            </h2>
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl pt-1">
          Browse common questions, submit suggestions or feedback, report technical issues, or view your ongoing support tickets with DIGIZORT team.
        </p>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'faq'
              ? 'bg-[#E53935] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
          id="btn-sub-tab-faq"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help / FAQ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'feedback'
              ? 'bg-[#E53935] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
          id="btn-sub-tab-feedback"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Send Feedback</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suggestion')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'suggestion'
              ? 'bg-[#E53935] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
          id="btn-sub-tab-suggestion"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Suggest an Idea</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('problem')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'problem'
              ? 'bg-[#E53935] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
          id="btn-sub-tab-problem"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Report a Problem</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_tickets')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'my_tickets'
              ? 'bg-[#E53935] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
          id="btn-sub-tab-mytickets"
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>My Support Requests ({myTickets.length})</span>
          {unreadResponseCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'contact'
              ? 'bg-[#E53935] text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
          id="btn-sub-tab-contact"
        >
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
          <span>Contact DIGIZORT</span>
        </button>
      </div>

      {/* SECTION 1: FAQ / HELP */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search frequently asked questions (e.g. balance, withdrawal, refunds, order)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            />
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-zinc-900/90 border border-zinc-800/90 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-rose-400 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                        {faq.category}
                      </span>
                      <span>{faq.q}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-zinc-800/60 bg-zinc-950/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: SEND FEEDBACK */}
      {activeTab === 'feedback' && (
        <form onSubmit={handleSubmitFeedback} className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white">Share Your Feedback</h3>
              <p className="text-[11px] text-zinc-400">
                Help us improve your DIGIZORT experience with your valuable comments.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Category</label>
            <select
              value={feedbackCategory}
              onChange={(e) => setFeedbackCategory(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
            >
              <option value="Website">Website &amp; Navigation</option>
              <option value="User Experience">User Experience</option>
              <option value="Payment">Payments &amp; Statements</option>
              <option value="Balance">Universal Balance</option>
              <option value="Requests">Requests &amp; Orders</option>
              <option value="Notifications">Notifications &amp; Alerts</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. Great payment statement experience, suggestion for mobile navigation"
              value={feedbackSubject}
              onChange={(e) => setFeedbackSubject(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Feedback Message</label>
            <textarea
              rows={4}
              required
              placeholder="Tell us what you liked or how we can make DIGIZORT even better..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            />
          </div>

          {/* Optional Attachment */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Optional Screenshot</label>
            <input
              type="file"
              ref={feedbackFileRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, setFeedbackAttachment);
              }}
              className="hidden"
            />
            {feedbackAttachment ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <img src={feedbackAttachment} alt="Attachment" className="w-12 h-12 rounded-lg object-cover" />
                <span className="text-xs text-zinc-300 flex-1 truncate">Screenshot attached</span>
                <button
                  type="button"
                  onClick={() => setFeedbackAttachment('')}
                  className="text-rose-400 hover:text-white p-1 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => feedbackFileRef.current?.click()}
                className="py-2 px-3 bg-zinc-950 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach Image (PNG/JPG, Max 2.5MB)</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="submit"
              disabled={isSubmittingFeedback}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2"
              id="btn-submit-feedback"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 3: SUGGEST AN IDEA */}
      {activeTab === 'suggestion' && (
        <form onSubmit={handleSubmitSuggestion} className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white">Suggest an Idea or Feature</h3>
              <p className="text-[11px] text-zinc-400">
                Have an idea for a new service, product workflow, or website feature?
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Category</label>
            <select
              value={suggestionCategory}
              onChange={(e) => setSuggestionCategory(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
            >
              <option value="New Feature">New Feature</option>
              <option value="Product Service">Product or Online Service</option>
              <option value="Payment Method">Payment &amp; Invoicing</option>
              <option value="Website Improvement">Website Functionality</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Suggestion Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Add quick re-order for monthly utility bills"
              value={suggestionTitle}
              onChange={(e) => setSuggestionTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Detailed Description</label>
            <textarea
              rows={4}
              required
              placeholder="Explain how this idea works and how it would benefit your workflow..."
              value={suggestionDescription}
              onChange={(e) => setSuggestionDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            />
          </div>

          {/* Optional Attachment */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Optional Diagram or Mockup</label>
            <input
              type="file"
              ref={suggestionFileRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, setSuggestionAttachment);
              }}
              className="hidden"
            />
            {suggestionAttachment ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <img src={suggestionAttachment} alt="Attachment" className="w-12 h-12 rounded-lg object-cover" />
                <span className="text-xs text-zinc-300 flex-1 truncate">Image attached</span>
                <button
                  type="button"
                  onClick={() => setSuggestionAttachment('')}
                  className="text-rose-400 hover:text-white p-1 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => suggestionFileRef.current?.click()}
                className="py-2 px-3 bg-zinc-950 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach Mockup (PNG/JPG, Max 2.5MB)</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="submit"
              disabled={isSubmittingSuggestion}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2"
              id="btn-submit-suggestion"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{isSubmittingSuggestion ? 'Submitting...' : 'Submit Suggestion'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 4: REPORT A PROBLEM */}
      {activeTab === 'problem' && (
        <form onSubmit={handleSubmitProblem} className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white">Report a Problem or Issue</h3>
              <p className="text-[11px] text-zinc-400">
                Experiencing a technical difficulty? Our support team will investigate and follow up.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Issue Category</label>
              <select
                value={problemCategory}
                onChange={(e) => setProblemCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
              >
                <option value="Website Glitch">Website Glitch / Bug</option>
                <option value="Payment Error">Payment or Receipt Issue</option>
                <option value="Balance Discrepancy">Universal Balance Issue</option>
                <option value="Order Issue">Order Request Question</option>
                <option value="Notification Issue">Notification / WhatsApp Issue</option>
                <option value="Other">Other Technical Problem</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Related Request (Optional)</label>
              <select
                value={problemRequestId}
                onChange={(e) => setProblemRequestId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E53935]"
              >
                <option value="">None / General Issue</option>
                {userRequests.map((req) => (
                  <option key={req.id} value={req.id}>
                    #{req.id} — {req.productName.slice(0, 24)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Problem Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Balance did not update after cancellation, receipt button unresponsive"
              value={problemTitle}
              onChange={(e) => setProblemTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Description &amp; Steps to Reproduce</label>
            <textarea
              rows={4}
              required
              placeholder="Describe what occurred, any error messages displayed, and what you were doing..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
            />
          </div>

          {/* Optional Screenshot */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Screenshot of Error (Optional)</label>
            <input
              type="file"
              ref={problemFileRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, setProblemAttachment);
              }}
              className="hidden"
            />
            {problemAttachment ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <img src={problemAttachment} alt="Attachment" className="w-12 h-12 rounded-lg object-cover" />
                <span className="text-xs text-zinc-300 flex-1 truncate">Screenshot attached</span>
                <button
                  type="button"
                  onClick={() => setProblemAttachment('')}
                  className="text-rose-400 hover:text-white p-1 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => problemFileRef.current?.click()}
                className="py-2 px-3 bg-zinc-950 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5 text-rose-400" />
                <span>Upload Screenshot (PNG/JPG, Max 2.5MB)</span>
              </button>
            )}
          </div>

          {/* Safe Technical Context Diagnostic Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe Technical Context Automatically Included</span>
            </div>
            <p className="text-zinc-500">
              Browser, operating system, and display dimensions will be attached to help engineers diagnose the problem. No passwords or credentials are ever recorded.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="submit"
              disabled={isSubmittingProblem}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2"
              id="btn-submit-problem"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSubmittingProblem ? 'Submitting...' : 'Submit Problem Report'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 5: MY SUPPORT REQUESTS */}
      {activeTab === 'my_tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white">Your Submitted Support Tickets</h3>
              <p className="text-xs text-zinc-400">
                Track status updates and responses for your feedback, suggestions, and problem reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('problem')}
                className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 transition-colors flex items-center gap-1"
              >
                <span>Report Issue</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('feedback')}
                className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                <span>Send Feedback</span>
              </button>
            </div>
          </div>

          {myTickets.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/60 border border-zinc-800/80 rounded-3xl space-y-2">
              <Inbox className="w-12 h-12 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-300">No support requests submitted yet</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Need help or have an idea? Submit feedback, feature suggestions, or issue reports anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-3"
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
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTicket(ticket)}
                      className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-colors self-start shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                      <span>View &amp; Reply</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/80 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Submitted on {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      {ticket.relatedRequestId && (
                        <span>• Related to #{ticket.relatedRequestId}</span>
                      )}
                    </div>
                    <div>
                      <span>{ticket.messages?.length || 1} message{(ticket.messages?.length || 1) > 1 ? 's' : ''} in thread</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: CONTACT DIGIZORT */}
      {activeTab === 'contact' && (
        <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Official DIGIZORT Support</h3>
              <p className="text-xs text-zinc-400">Direct assistance from the administrative team</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp Contact */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Official WhatsApp</span>
                  <span className="text-xs font-mono font-extrabold text-white">+91 81290 43397</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Connect directly on WhatsApp for live order updates and quick confirmation assistance.
              </p>
              <a
                href="https://wa.me/918129043397?text=Hello%20DIGIZORT%20Team%2C%20I%20am%20contacting%20you%20regarding%20my%20customer%20account."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
              >
                <span>Chat on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Email Support */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Support Email</span>
                  <span className="text-xs font-mono font-extrabold text-white truncate block">inkucrazeorders@gmail.com</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Send formal billing inquiries, documentation requests, or administrative questions.
              </p>
              <a
                href="mailto:inkucrazeorders@gmail.com?subject=DIGIZORT%20Customer%20Support%20Inquiry"
                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all border border-zinc-700"
              >
                <span>Send Email</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1">
            <span className="font-bold text-zinc-300 block">Operating Hours</span>
            <p>Monday through Saturday, 9:00 AM – 9:00 PM IST.</p>
            <p className="text-[11px] text-zinc-500 pt-1">
              For urgent order verifications, submitting a ticket under "Report a Problem" immediately alerts the admin dashboard.
            </p>
          </div>
        </div>
      )}

      {/* TICKET DETAILS & CONVERSATION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col my-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-zinc-400 font-extrabold text-xs">#{selectedTicket.id}</span>
                  {getTypeBadge(selectedTicket.type)}
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h3 className="text-base font-extrabold text-white">{selectedTicket.subject}</h3>
                <p className="text-xs text-zinc-400">
                  Category: {selectedTicket.category} • Submitted on {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto space-y-4 p-1 pr-2 max-h-[45vh]">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((msg, index) => {
                  const isUser = msg.sender === 'USER';
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-1">
                        <span className="font-bold text-zinc-400">{msg.senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      <div
                        className={`p-4 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isUser
                            ? 'bg-[#E53935]/15 text-white border border-[#E53935]/30'
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

            {/* Reply Composer if not closed */}
            {selectedTicket.status !== 'Closed' ? (
              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Type your reply to DIGIZORT Support..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E53935]"
                  />
                  <input
                    type="file"
                    ref={replyFileRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, setReplyAttachment);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => replyFileRef.current?.click()}
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors"
                    title="Attach screenshot"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingReply}
                    className="py-2.5 px-4 bg-[#E53935] hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>

                {replyAttachment && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-zinc-300 flex-1 truncate">Image attached to reply</span>
                    <button
                      type="button"
                      onClick={() => setReplyAttachment('')}
                      className="text-rose-400 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="p-3 rounded-2xl bg-zinc-950 text-center text-xs text-zinc-500">
                This support ticket is marked as Closed.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
