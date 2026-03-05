import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ResetPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send reset code');
      } else {
        setInfo(data.message);
        setStep('code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
      } else {
        setResetToken(data.resetToken);
        setStep('password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
      } else {
        setStep('success');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResendCode = async () => {
    setError('');
    setInfo('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo('A new code has been sent if the account exists.');
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]';
  const buttonClass = 'w-full py-2.5 rounded-lg bg-[var(--c-accent)] text-[var(--c-bg)] font-semibold disabled:opacity-70';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--c-bg)] via-[#111a23] to-[var(--c-bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--c-raised)] border border-[var(--c-border-light)] rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-[var(--c-text)] mb-2">Reset Password</h1>

        {step === 'email' && (
          <>
            <p className="text-sm text-gray-400 mb-6">Enter your email to receive a verification code.</p>
            <form onSubmit={onRequestCode} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              {info && <p className="text-sm text-emerald-400">{info}</p>}
              <button type="submit" disabled={isSubmitting} className={buttonClass}>
                {isSubmitting ? 'Sending...' : 'Send Code'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-[var(--c-accent)] hover:underline">
                Back to Sign In
              </Link>
            </div>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="text-sm text-gray-400 mb-6">Enter the 6-digit code sent to <span className="text-[var(--c-text)]">{email}</span>.</p>
            <form onSubmit={onVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} text-center text-2xl tracking-[0.3em]`}
                  placeholder="000000"
                  required
                />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              {info && <p className="text-sm text-emerald-400">{info}</p>}
              <button type="submit" disabled={isSubmitting || code.length < 6} className={buttonClass}>
                {isSubmitting ? 'Verifying...' : 'Verify'}
              </button>
            </form>
            <div className="mt-4 flex justify-between text-sm">
              <button onClick={onResendCode} disabled={isSubmitting} className="text-[var(--c-accent)] hover:underline disabled:opacity-50">
                Resend Code
              </button>
              <Link to="/login" className="text-[var(--c-accent)] hover:underline">
                Back to Sign In
              </Link>
            </div>
          </>
        )}

        {step === 'password' && (
          <>
            <p className="text-sm text-gray-400 mb-6">Code verified. Set your new password.</p>
            <form onSubmit={onResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <button type="submit" disabled={isSubmitting} className={buttonClass}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <>
            <p className="text-sm text-emerald-400 mb-6">Your password has been reset successfully.</p>
            <Link
              to="/login"
              className={`${buttonClass} block text-center`}
            >
              Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
