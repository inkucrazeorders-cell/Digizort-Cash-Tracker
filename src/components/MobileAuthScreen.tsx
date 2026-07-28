import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  Smartphone,
  UserCheck,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building,
  Mail,
  MapPin,
  Camera,
} from 'lucide-react';

export const MobileAuthScreen: React.FC = () => {
  const {
    checkMobileRegistered,
    registerUser,
    loginWithMobile,
    loginAsAdmin,
    showToast,
  } = useApp();

  const [step, setStep] = useState<'mobile' | 'unregistered' | 'register' | 'admin'>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [adminCodeInput, setAdminCodeInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        // Direct login with mobile number - no OTP/PIN verification needed
        await loginWithMobile(cleanedMobile);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    try {
      setIsLoading(true);
      await registerUser({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || '',
        address: address.trim() || '',
        profilePhoto: profilePhoto.trim() || '',
      });
      showToast(`Welcome to DIGIZORT, ${fullName.trim()}!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-[#E53935] to-[#B71C1C] text-white shadow-lg shadow-[#E53935]/30 mb-2">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            DIGIZORT
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">
            CASH TRACKER & ORDER PORTAL
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

        {/* STEP 1: Enter Mobile Number */}
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
                <span>Verifying Number...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Unregistered Notice */}
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
                onClick={() => setStep('register')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                id="btn-goto-register"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register New User</span>
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

        {/* STEP 3: User Registration Form */}
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
                Address <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="City / Delivery Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#E53935]"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading || !fullName.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#E53935]/25 flex items-center justify-center gap-2 transition-all"
                id="btn-complete-registration"
              >
                {isLoading ? (
                  <span>Saving Account...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('mobile')}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Admin Panel Mode */}
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
                onClick={() => setStep('mobile')}
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
