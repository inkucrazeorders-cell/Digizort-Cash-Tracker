import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ProactiveAIConfig, ProactiveAIAnalytics } from '../types';

export type PageContextType =
  | 'requests'
  | 'new_request'
  | 'payment_verification'
  | 'balance'
  | 'profile'
  | 'support'
  | 'announcements'
  | 'general';

export type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'help_available';

export interface ProactivePromptState {
  isOpen: boolean;
  contextType: PageContextType;
  title: string;
  message: string;
  requestId?: string;
  step?: string;
  suggestedPrompt: string;
  suggestedActions: Array<{
    label: string;
    action: () => void;
  }>;
}

interface ProactiveAIContextType {
  // Context tracking
  setPageContext: (page: PageContextType, step?: string, requestId?: string) => void;
  recordValidationError: (errorMessage?: string) => void;
  recordFailedAction: (actionName?: string) => void;
  resetStepTimer: () => void;

  // Proactive Prompt
  promptState: ProactivePromptState;
  dismissPrompt: () => void;
  acceptHelp: (mode?: 'chat' | 'live' | 'voice', customMessage?: string) => void;

  // Modal Control
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  assistantInitialTab: 'chat' | 'live';
  assistantInitialMessage: string | null;

  // Robot Avatar State
  robotState: RobotState;
  setRobotState: (state: RobotState) => void;

  // User Settings
  userProactiveEnabled: boolean;
  setUserProactiveEnabled: (enabled: boolean) => void;

  // Admin Config & Analytics
  adminConfig: ProactiveAIConfig;
  updateAdminConfig: (cfg: Partial<ProactiveAIConfig>) => void;
  analytics: ProactiveAIAnalytics;
}

const DEFAULT_ADMIN_CONFIG: ProactiveAIConfig = {
  enabled: true,
  triggerDelaySeconds: 45,
  errorThreshold: 2,
  cooldownMinutes: 10,
  maxPromptsPerSession: 3,
  voicePromptEnabled: true,
  robotAnimationEnabled: true,
};

const DEFAULT_ANALYTICS: ProactiveAIAnalytics = {
  promptsTriggered: 0,
  helpAccepted: 0,
  helpDismissed: 0,
  voiceAssistanceUsed: 0,
};

const ProactiveAIContext = createContext<ProactiveAIContextType | null>(null);

export const ProactiveAIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistence for user preference
  const [userProactiveEnabled, setUserProactiveEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('digizort_proactive_ai_user_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const setUserProactiveEnabled = (val: boolean) => {
    setUserProactiveEnabledState(val);
    try {
      localStorage.setItem('digizort_proactive_ai_user_enabled', JSON.stringify(val));
    } catch {}
  };

  // Admin Config
  const [adminConfig, setAdminConfig] = useState<ProactiveAIConfig>(() => {
    try {
      const saved = localStorage.getItem('digizort_proactive_ai_config');
      return saved ? { ...DEFAULT_ADMIN_CONFIG, ...JSON.parse(saved) } : DEFAULT_ADMIN_CONFIG;
    } catch {
      return DEFAULT_ADMIN_CONFIG;
    }
  });

  const updateAdminConfig = (cfg: Partial<ProactiveAIConfig>) => {
    setAdminConfig((prev) => {
      const updated = { ...prev, ...cfg };
      try {
        localStorage.setItem('digizort_proactive_ai_config', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Analytics
  const [analytics, setAnalytics] = useState<ProactiveAIAnalytics>(() => {
    try {
      const saved = localStorage.getItem('digizort_proactive_ai_analytics');
      return saved ? { ...DEFAULT_ANALYTICS, ...JSON.parse(saved) } : DEFAULT_ANALYTICS;
    } catch {
      return DEFAULT_ANALYTICS;
    }
  });

  const recordAnalyticsEvent = (event: keyof ProactiveAIAnalytics) => {
    setAnalytics((prev) => {
      const updated = { ...prev, [event]: prev[event] + 1 };
      try {
        localStorage.setItem('digizort_proactive_ai_analytics', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Current User Context
  const [currentPage, setCurrentPage] = useState<PageContextType>('general');
  const [currentStep, setCurrentStep] = useState<string | undefined>(undefined);
  const [currentRequestId, setCurrentRequestId] = useState<string | undefined>(undefined);

  // Difficulty Counters
  const [validationErrors, setValidationErrors] = useState(0);
  const [failedActions, setFailedActions] = useState(0);
  const [promptCountSession, setPromptCountSession] = useState(0);
  const [lastDismissedTime, setLastDismissedTime] = useState<number>(0);

  // Assistant Modal & Robot State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInitialTab, setAssistantInitialTab] = useState<'chat' | 'live'>('chat');
  const [assistantInitialMessage, setAssistantInitialMessage] = useState<string | null>(null);
  const [robotState, setRobotState] = useState<RobotState>('idle');

  // Proactive Prompt State
  const [promptState, setPromptState] = useState<ProactivePromptState>({
    isOpen: false,
    contextType: 'general',
    title: 'DIGIZORT AI',
    message: "It looks like you may be having trouble. Want me to help?",
    suggestedPrompt: 'Help me with my current task',
    suggestedActions: [],
  });

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set Page Context
  const setPageContext = (page: PageContextType, step?: string, requestId?: string) => {
    setCurrentPage(page);
    setCurrentStep(step);
    setCurrentRequestId(requestId);
    setValidationErrors(0);
    setFailedActions(0);
    resetStepTimer();
  };

  // Reset Step Timer (starts idle timer when user is on a form/interactive step)
  const resetStepTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // Only start idle countdown if proactive is enabled, user hasn't exceeded session quota or cooldown
    if (!adminConfig.enabled || !userProactiveEnabled) return;
    if (promptCountSession >= adminConfig.maxPromptsPerSession) return;

    const cooldownMs = adminConfig.cooldownMinutes * 60 * 1000;
    if (Date.now() - lastDismissedTime < cooldownMs) return;

    // Start countdown for high-attention forms (new request, payment verification, balance)
    if (
      currentPage === 'new_request' ||
      currentPage === 'payment_verification' ||
      currentPage === 'balance'
    ) {
      idleTimerRef.current = setTimeout(() => {
        triggerProactivePrompt('idle');
      }, adminConfig.triggerDelaySeconds * 1000);
    }
  };

  // Record Validation Error
  const recordValidationError = (errorMessage?: string) => {
    setValidationErrors((prev) => {
      const next = prev + 1;
      if (next >= adminConfig.errorThreshold) {
        triggerProactivePrompt('validation_error', errorMessage);
      }
      return next;
    });
  };

  // Record Failed / Repeated Clicks
  const recordFailedAction = (actionName?: string) => {
    setFailedActions((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        triggerProactivePrompt('repeated_failed', actionName);
      }
      return next;
    });
  };

  // Trigger Proactive Prompt
  const triggerProactivePrompt = (reason: 'idle' | 'validation_error' | 'repeated_failed', detail?: string) => {
    // Guards
    if (!adminConfig.enabled || !userProactiveEnabled) return;
    if (isAssistantOpen || promptState.isOpen) return;
    if (promptCountSession >= adminConfig.maxPromptsPerSession) return;

    const cooldownMs = adminConfig.cooldownMinutes * 60 * 1000;
    if (Date.now() - lastDismissedTime < cooldownMs) return;

    // Build context-specific message & prompt
    let title = 'DIGIZORT AI';
    let message = "It looks like you may need some help. I'm here if you need me.";
    let suggestedPrompt = "I need some help with my current step.";

    switch (currentPage) {
      case 'new_request':
        title = 'Need help creating your request?';
        message =
          currentStep === 'payment'
            ? "Having trouble with payment options? I can explain DIGIZORT Balance and external payments."
            : "It looks like you may be having trouble completing this request. Want me to help?";
        suggestedPrompt =
          currentStep === 'payment'
            ? 'Explain how to pay for this new order using my balance or external methods'
            : 'Guide me through creating a new request and what fields I need to fill';
        break;

      case 'payment_verification':
        title = 'Payment Verification Guide';
        message = currentRequestId
          ? `Are you unsure how to submit your payment for verification on #${currentRequestId}? I can guide you.`
          : 'Need help finding your UTR / Transaction ID or uploading payment proof?';
        suggestedPrompt = `How do I submit payment verification for ${currentRequestId ? '#' + currentRequestId : 'my request'} and where do I find the UTR?`;
        break;

      case 'balance':
        title = 'DIGIZORT Balance Assistance';
        message = 'Need help understanding your available store balance or how to request a payout?';
        suggestedPrompt = 'Explain how my DIGIZORT available balance works and how payouts are processed';
        break;

      case 'profile':
        title = 'Account Security & Profile';
        message = 'Need help updating your profile information or securing your password?';
        suggestedPrompt = 'How do I update my profile details and manage my password security?';
        break;

      case 'support':
        title = 'Help & Support';
        message = "If you're reporting a problem, I can help you find the right support option or submit a ticket.";
        suggestedPrompt = 'Help me find the right support option for my issue';
        break;

      default:
        title = 'Need any help?';
        message = "I'm right beside you if you have any questions about orders, payments, or your balance.";
        suggestedPrompt = 'Can you give me an overview of what I can do here?';
        break;
    }

    setPromptState({
      isOpen: true,
      contextType: currentPage,
      title,
      message,
      requestId: currentRequestId,
      step: currentStep,
      suggestedPrompt,
      suggestedActions: [],
    });

    setRobotState('help_available');
    setPromptCountSession((c) => c + 1);
    recordAnalyticsEvent('promptsTriggered');
  };

  // Dismiss Prompt
  const dismissPrompt = () => {
    setPromptState((prev) => ({ ...prev, isOpen: false }));
    setRobotState('idle');
    setLastDismissedTime(Date.now());
    recordAnalyticsEvent('helpDismissed');
  };

  // Accept Help
  const acceptHelp = (mode: 'chat' | 'live' | 'voice' = 'chat', customMessage?: string) => {
    setPromptState((prev) => ({ ...prev, isOpen: false }));
    recordAnalyticsEvent('helpAccepted');

    if (mode === 'live' || mode === 'voice') {
      recordAnalyticsEvent('voiceAssistanceUsed');
      setAssistantInitialTab('live');
      setAssistantInitialMessage(null);
    } else {
      setAssistantInitialTab('chat');
      setAssistantInitialMessage(customMessage || promptState.suggestedPrompt);
    }

    setIsAssistantOpen(true);
    setRobotState('idle');
  };

  return (
    <ProactiveAIContext.Provider
      value={{
        setPageContext,
        recordValidationError,
        recordFailedAction,
        resetStepTimer,
        promptState,
        dismissPrompt,
        acceptHelp,
        isAssistantOpen,
        setIsAssistantOpen,
        assistantInitialTab,
        assistantInitialMessage,
        robotState,
        setRobotState,
        userProactiveEnabled,
        setUserProactiveEnabled,
        adminConfig,
        updateAdminConfig,
        analytics,
      }}
    >
      {children}
    </ProactiveAIContext.Provider>
  );
};

export const useProactiveAI = (): ProactiveAIContextType => {
  const context = useContext(ProactiveAIContext);
  if (!context) {
    throw new Error('useProactiveAI must be used within a ProactiveAIProvider');
  }
  return context;
};
