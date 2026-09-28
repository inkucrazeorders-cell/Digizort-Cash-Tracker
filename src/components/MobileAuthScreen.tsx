import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_DIGIZORT_LOGO } from '../lib/branding';
import { AppUser } from '../types';
import {
  Smartphone,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertCircle,
  Mail,
  MapPin,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

export const MobileAuthScreen: React.FC = () => {
  const {
    checkMobileRegistered,
    registerUser,
    loginWithPassword,
    setupInitialPasswordForExistingUser,
    resetPassword,
    loginAsAdmin,
    showToast,
  } = useApp();

  const [step, setStep] = useState<
    | 'mobile'
    | 'unregistered'
    | 'register'
    | 'password'
    | 'setup_password'
    | 'forgot_password'
    | 'admin'
  >('mobile');

  // Input states
  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Password states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password / reset verification state
  const [resetEmailVerify, setResetEmailVerify] = useState('');

  // Admin access state
  const [adminCodeInput, setAdminCodeInput] = useState('');

  // Detected existing user state
  const [detectedUser, setDetectedUser] = useState<AppUser | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to validate password rules
  const getPasswordValidation = (pwd: string, confirmPwd?: string) => {
    const hasMinLength = pwd.length >= 8;
    const matches = confirmPwd !== undefined ? pwd === confirmPwd : true;
    return { hasMinLength, matches };
  };

  /**
   * STEP 1: Handle Mobile Number Submission
   */
  const handleMobileContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanedMobile = mobileNumber.trim();

    if (!cleanedMobile || cleanedMobile.length < 8) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }

    try {
      setIsLoading(true);
      const existingUser = await checkMobileRegistered(cleanedMobile);

      if (!existingUser) {
        setStep('unregistered');
      } else {
        if (existingUser.status === 'suspended') {
          setErrorMsg('This account has been suspended by Admin. Please contact support.');
          return;
        }

        setDetectedUser(existingUser);
        setPassword('');
        setConfirmPassword('');

        // Section 3: Check if existing user does NOT yet have a password set (legacy phone-only user)
        if (!existingUser.passwordHash || !existingUser.hasPassword) {
          setStep('setup_password');
        } else {
          // Normal password login flow
          setStep('password');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to verify mobile number. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 2: Handle Normal Password Login for Existing Users
   */
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await loginWithPassword(mobileNumber.trim(), password);

      if (result.requiresPasswordSetup && result.user) {
        setDetectedUser(result.user);
        setStep('setup_password');
        return;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 3: Handle One-Time Password Setup for Existing Old Users
   */
  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await setupInitialPasswordForExistingUser(mobileNumber.trim(), password);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to set password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 4: Handle New User Registration Submit
   */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await registerUser({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || '',
        address: address.trim() || '',
        password,
      });
      showToast(`Welcome to DIGIZORT, ${fullName.trim()}!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 5: Handle Forgot Password Reset
   */
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('New password and Confirm Password do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword({
        mobileNumber: mobileNumber.trim(),
        newPassword: password,
      });
      // Move to password login
      setPassword('');
      setConfirmPassword('');
      setStep('password');
      showToast('Password updated. Please log in with your new password.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Password reset could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 6: Handle Admin Passkey Submission
   */
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setIsLoading(true);
      const success = await loginAsAdmin(adminCodeInput);
      if (!success) {
        setErrorMsg('Invalid Admin Credentials.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Admin login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const validation = getPasswordValidation(password, confirmPassword);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#E53935]/20 via-rose-600/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative z-10 space-y-6"
      >
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-2">
            <img
              src={OFFICIAL_DIGIZORT_LOGO}
              alt="DIGIZORT Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_20px_rgba(229,57,53,0.4)]"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            DIGIZORT
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">
            CASH TRACKER &amp; ORDER PORTAL
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: Enter Mobile Number                                  */}
        {/* ============================================================ */}
        {step === 'mobile' && (
          <form onSubmit={handleMobileContinue} className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">Enter Your Mobile Number</h2>
              <p className="text-xs text-zinc-400">
                Your mobile number is your permanent identity on DIGIZORT.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-[#E53935] transition-colors"
                  id="input-mobile-number"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !mobileNumber.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all"
              id="btn-mobile-continue"
            >
              {isLoading ? (
                <span>Checking Number...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 2: Unregistered Number Notice                           */}
        {/* ============================================================ */}
        {step === 'unregistered' && (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold">This mobile number is not registered.</h3>
              <p className="text-xs text-amber-200/80">
                Mobile <span className="font-bold text-white">{mobileNumber}</span> was not found in our records. Please create a new account to continue.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setPassword('');
                  setConfirmPassword('');
                  setStep('register');
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                id="btn-goto-register"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </button>

              <button
                onClick={() => {
                  setErrorMsg(null);
                  setStep('mobile');
                }}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                id="btn-back-to-mobile"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: Existing User Password Login                         */}
        {/* ============================================================ */}
        {step === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">Enter Your Password</h2>
              <p className="text-xs text-zinc-400">
                Logging in to account for <span className="text-white font-bold">{mobileNumber}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm font-semibold focus:outline-none focus:border-[#E53935] transition-colors"
                    id="input-login-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setPassword('');
                    setConfirmPassword('');
                    setStep('forgot_password');
                  }}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                  id="btn-forgot-password"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all"
                id="btn-password-login"
              >
                {isLoading ? (
                  <span>Verifying Password...</span>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setPassword('');
                  setStep('mobile');
                }}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Mobile Number</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 4: One-Time Password Setup for Existing Users           */}
        {/* Section 3: "Secure Your DIGIZORT Account"                    */}
        {/* ============================================================ */}
        {step === 'setup_password' && (
          <form onSubmit={handleSetupPasswordSubmit} className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Secure Your DIGIZORT Account</h2>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Your DIGIZORT account has been upgraded with secure password protection. Please create a password to continue using your account.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Account Name:</span>
                <span className="font-bold text-white">{detectedUser?.fullName || 'Valued Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span>Mobile Number:</span>
                <span className="font-bold text-white">{mobileNumber}</span>
              </div>
              <p className="text-[10px] text-emerald-400 pt-1 border-t border-zinc-850">
                ✓ All your existing requests, balance, and data will remain completely intact.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  New Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create your new password (min. 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-[#E53935]"
                    id="input-setup-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password to confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-[#E53935]"
                    id="input-setup-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Validation Requirements */}
              <div className="space-y-1 pt-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Minimum 8 characters</span>
                </div>
                {confirmPassword && (
                  <div className={`flex items-center gap-1.5 ${password === confirmPassword ? 'text-emerald-400 font-bold' : 'text-rose-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="submit"
                disabled={isLoading || password.length < 8 || password !== confirmPassword}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
                id="btn-set-password-continue"
              >
                {isLoading ? (
                  <span>Securing Account...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Set Password &amp; Continue</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setPassword('');
                  setConfirmPassword('');
                  setStep('mobile');
                }}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 5: New User Registration Form                           */}
        {/* ============================================================ */}
        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">Create Your Account</h2>
              <p className="text-xs text-zinc-400">
                Registering for <span className="font-bold text-white">{mobileNumber}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-[#E53935]"
                id="input-full-name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Mobile Number (Permanent Identity)
              </label>
              <input
                type="text"
                disabled
                value={mobileNumber}
                className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-zinc-400 text-xs font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Email Address <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="yourname@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create a strong password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
                  id="input-register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
                  id="input-register-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Password Validation Requirements */}
            <div className="space-y-1 pt-1 text-[11px]">
              <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Minimum 8 characters</span>
              </div>
              {confirmPassword && (
                <div className={`flex items-center gap-1.5 ${password === confirmPassword ? 'text-emerald-400 font-bold' : 'text-rose-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading || !fullName.trim() || password.length < 8 || password !== confirmPassword}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all"
                id="btn-complete-registration"
              >
                {isLoading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep('mobile');
                }}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 6: Forgot Password Flow                                 */}
        {/* ============================================================ */}
        {step === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-1">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">Reset Your Password</h2>
              <p className="text-xs text-zinc-400">
                Set a new password for <span className="font-bold text-white">{mobileNumber}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                New Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter new password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
                  id="input-reset-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Confirm New Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
                  id="input-reset-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-1 text-[11px]">
              <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Minimum 8 characters</span>
              </div>
              {confirmPassword && (
                <div className={`flex items-center gap-1.5 ${password === confirmPassword ? 'text-emerald-400 font-bold' : 'text-rose-400'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading || password.length < 8 || password !== confirmPassword}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all"
                id="btn-submit-reset-password"
              >
                {isLoading ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Update Password &amp; Login</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setPassword('');
                  setConfirmPassword('');
                  setStep('password');
                }}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* STEP 7: Admin Panel Mode                                     */}
        {/* ============================================================ */}
        {step === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Administrator Access</h2>
              <p className="text-xs text-zinc-400">
                Enter Admin Security Passkey to unlock full system controls.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Admin Security Code / Passkey
              </label>
              <input
                type="password"
                required
                placeholder="Enter admin security passkey"
                value={adminCodeInput}
                onChange={(e) => setAdminCodeInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#E53935]"
                id="input-admin-code"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isLoading || !adminCodeInput}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-[#B71C1C] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all"
                id="btn-submit-admin-login"
              >
                {isLoading ? (
                  <span>Unlocking Admin Panel...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Unlock Admin Panel</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep('mobile');
                }}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-colors"
              >
                Back to User Login
              </button>
            </div>
          </form>
        )}

        {/* Footer Admin Toggle */}
        {step !== 'admin' && (
          <div className="pt-4 border-t border-zinc-800/80 text-center">
            <button
              onClick={() => {
                setErrorMsg(null);
                setStep('admin');
              }}
              className="text-xs font-semibold text-zinc-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-1.5 mx-auto"
              id="toggle-admin-access-btn"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Admin Portal Access</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
