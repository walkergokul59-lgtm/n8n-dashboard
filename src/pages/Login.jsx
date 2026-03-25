/* UI redesign: replaced bg-white with CSS vars for dark mode, standardized input heights 36px, fixed tab buttons, consistent typography */
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
    const { login, signup, isAdmin, isApproved, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState('signin');
    const [loginEmail, setLoginEmail] = useState('client1@gmail.com');
    const [loginPassword, setLoginPassword] = useState('client1');
    const [signupClientName, setSignupClientName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showUpsell, setShowUpsell] = useState(false);
    const [pendingNavigate, setPendingNavigate] = useState(null);
    const requestedPath = `${location.state?.from?.pathname || ''}${location.state?.from?.search || ''}${location.state?.from?.hash || ''}`;

    if (!isLoading && isAuthenticated) {
        const nextPath = requestedPath
            || (isAdmin ? '/admin' : (isApproved ? '/dashboard' : '/settings'));
        return <Navigate to={nextPath} replace />;
    }

    const targetPathForUser = (nextUser) => {
        if (requestedPath) return requestedPath;
        if (nextUser?.role === 'admin') return '/admin';
        if (nextUser?.approvalStatus !== 'approved') return '/settings';
        return '/dashboard';
    };

    const onSignInSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setInfo('');
        setIsSubmitting(true);
        try {
            const loggedInUser = await login(loginEmail, loginPassword);
            const target = targetPathForUser(loggedInUser);
            if (
                loggedInUser?.role !== 'admin' &&
                loggedInUser?.approvalStatus === 'approved' &&
                (loggedInUser?.effectiveTier ?? 'free') === 'free'
            ) {
                setPendingNavigate(target);
                setShowUpsell(true);
            } else {
                navigate(target, { replace: true });
            }
        } catch (err) {
            setError(err?.message || 'Failed to login');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onSignUpSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setInfo('');

        if (signupPassword !== signupConfirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            await signup({
                email: signupEmail,
                password: signupPassword,
                clientName: signupClientName,
            });
            setInfo('Signup successful. Complete onboarding details in Settings while your account is pending approval.');
            navigate('/settings', { replace: true, state: { fromSignup: true } });
        } catch (err) {
            setError(err?.message || 'Failed to signup');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showUpsell) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
                <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--c-border)] rounded-[8px] shadow-lg p-8 space-y-6">
                    <div>
                        <h2 className="text-[20px] font-semibold text-[var(--c-text)]">You're on the Free Plan</h2>
                        <p className="text-[14px] text-[var(--c-text-muted)] mt-1">Upgrade to unlock more features for your dashboard.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[8px] p-4 space-y-2">
                            <p className="font-semibold text-[14px] text-[var(--c-text)]">Platinum</p>
                            <ul className="text-[13px] text-[var(--c-text-dim)] space-y-1">
                                <li>✓ Up to 2 workflows</li>
                                <li>✓ Failures (24h) KPI</li>
                                <li>✓ Support Chat</li>
                                <li className="text-[var(--c-text-subtle)]">✗ CSV Export</li>
                                <li className="text-[var(--c-text-subtle)]">✗ Invoice Runs</li>
                            </ul>
                        </div>
                        <div className="bg-[var(--bg-elevated)] border border-[var(--c-warning)]/30 rounded-[8px] p-4 space-y-2">
                            <p className="font-semibold text-[14px] text-[var(--c-warning-text)]">Gold</p>
                            <ul className="text-[13px] text-[var(--c-text-dim)] space-y-1">
                                <li>✓ Unlimited workflows</li>
                                <li>✓ Failures (24h) KPI</li>
                                <li>✓ Support Chat</li>
                                <li>✓ CSV Export</li>
                                <li>✓ Invoice Runs</li>
                            </ul>
                        </div>
                    </div>

                    <p className="text-[13px] text-[var(--c-text-muted)]">Contact your admin to upgrade your subscription tier.</p>

                    <button
                        type="button"
                        onClick={() => navigate(pendingNavigate || '/dashboard', { replace: true })}
                        className="w-full h-9 rounded-[6px] bg-[var(--c-accent)] text-white font-semibold text-[14px] hover:bg-[var(--c-accent-hover)] transition-colors"
                    >
                        Continue to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--c-border)] rounded-[8px] shadow-lg p-8">
                <h1 className="text-[24px] font-semibold text-[var(--c-text)] mb-2">Client Access</h1>
                <p className="text-[14px] text-[var(--c-text-muted)] mb-6">Sign in or create a new client account.</p>

                <div className="grid grid-cols-2 gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('signin');
                            setError('');
                            setInfo('');
                        }}
                        className={`h-9 rounded-[6px] text-[14px] font-semibold transition-colors ${mode === 'signin'
                            ? 'bg-[var(--c-accent)] text-white'
                            : 'bg-[var(--bg-elevated)] border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]'
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('signup');
                            setError('');
                            setInfo('');
                        }}
                        className={`h-9 rounded-[6px] text-[14px] font-semibold transition-colors ${mode === 'signup'
                            ? 'bg-[var(--c-accent)] text-white'
                            : 'bg-[var(--bg-elevated)] border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {mode === 'signin' ? (
                    <div className="space-y-4">
                        <form onSubmit={onSignInSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[13px] text-[var(--c-text-muted)] mb-1 font-medium">Email</label>
                                <input
                                    type="email"
                                    value={loginEmail}
                                    onChange={(event) => setLoginEmail(event.target.value)}
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[6px] px-3 h-9 text-[14px] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] text-[var(--c-text-muted)] mb-1 font-medium">Password</label>
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={(event) => setLoginPassword(event.target.value)}
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[6px] px-3 h-9 text-[14px] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>

                            {error ? <p className="text-[13px] text-[var(--c-error-text)]">{error}</p> : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-9 rounded-[6px] bg-[var(--c-accent)] text-white font-semibold text-[14px] hover:bg-[var(--c-accent-hover)] disabled:opacity-70 transition-colors"
                            >
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                            </button>
                            <div className="text-center mt-2">
                                <Link to="/reset-password" className="text-[13px] text-[var(--c-accent)] hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <form onSubmit={onSignUpSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[13px] text-[var(--c-text-muted)] mb-1 font-medium">Email</label>
                                <input
                                    type="email"
                                    value={signupEmail}
                                    onChange={(event) => setSignupEmail(event.target.value)}
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[6px] px-3 h-9 text-[14px] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] text-[var(--c-text-muted)] mb-1 font-medium">Password</label>
                                <input
                                    type="password"
                                    value={signupPassword}
                                    onChange={(event) => setSignupPassword(event.target.value)}
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[6px] px-3 h-9 text-[14px] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] text-[var(--c-text-muted)] mb-1 font-medium">Confirm Password</label>
                                <input
                                    type="password"
                                    value={signupConfirmPassword}
                                    onChange={(event) => setSignupConfirmPassword(event.target.value)}
                                    className="w-full bg-[var(--bg-elevated)] border border-[var(--c-border)] rounded-[6px] px-3 h-9 text-[14px] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>

                            {error ? <p className="text-[13px] text-[var(--c-error-text)]">{error}</p> : null}
                            {info ? <p className="text-[13px] text-[var(--c-success-text)]">{info}</p> : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-9 rounded-[6px] bg-[var(--c-accent)] text-white font-semibold text-[14px] hover:bg-[var(--c-accent-hover)] disabled:opacity-70 transition-colors"
                            >
                                {isSubmitting ? 'Creating account...' : 'Sign Up'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-6 text-[12px] text-[var(--c-text-subtle)] space-y-1">
                    <p>Admin: root@gmail.com / root</p>
                    <p>Existing Client: client1@gmail.com / client1</p>
                    <p>New signups require root admin approval before dashboard access.</p>
                </div>
            </div>
        </div>
    );
}
