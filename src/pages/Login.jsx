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
            <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center p-6">
                <div className="w-full max-w-lg bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl shadow-lg p-8 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--c-text)]">You're on the Free Plan</h2>
                        <p className="text-sm text-[var(--c-text-muted)] mt-1">Upgrade to unlock more features for your dashboard.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--c-raised)] border border-[var(--c-border-light)] rounded-lg p-4 space-y-2">
                            <p className="font-semibold text-[var(--c-text)]">Platinum</p>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>✓ Up to 2 workflows</li>
                                <li>✓ Failures (24h) KPI</li>
                                <li>✓ Support Chat</li>
                                <li className="text-gray-600">✗ CSV Export</li>
                                <li className="text-gray-600">✗ Invoice Runs</li>
                            </ul>
                        </div>
                        <div className="bg-[var(--c-raised)] border border-amber-400/30 rounded-lg p-4 space-y-2">
                            <p className="font-semibold text-amber-400">Gold</p>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>✓ Unlimited workflows</li>
                                <li>✓ Failures (24h) KPI</li>
                                <li>✓ Support Chat</li>
                                <li>✓ CSV Export</li>
                                <li>✓ Invoice Runs</li>
                            </ul>
                        </div>
                    </div>

                    <p className="text-sm text-gray-400">Contact your admin to upgrade your subscription tier.</p>

                    <button
                        type="button"
                        onClick={() => navigate(pendingNavigate || '/dashboard', { replace: true })}
                        className="w-full py-2.5 rounded-lg bg-[var(--c-accent)] text-white font-bold hover:bg-opacity-90 transition-all"
                    >
                        Continue to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl shadow-lg p-8">
                <h1 className="text-2xl font-bold text-[var(--c-text)] mb-2">Client Access</h1>
                <p className="text-sm text-[var(--c-text-muted)] mb-6">Sign in or create a new client account.</p>

                <div className="grid grid-cols-2 gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('signin');
                            setError('');
                            setInfo('');
                        }}
                        className={`py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'signin'
                            ? 'bg-[var(--c-accent)] text-white'
                            : 'bg-white border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]'
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
                        className={`py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'signup'
                            ? 'bg-[var(--c-accent)] text-white'
                            : 'bg-white border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {mode === 'signin' ? (
                    <div className="space-y-4">
                        <form onSubmit={onSignInSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--c-text-muted)] mb-1 font-semibold">Email</label>
                                <input
                                    type="email"
                                    value={loginEmail}
                                    onChange={(event) => setLoginEmail(event.target.value)}
                                    className="w-full bg-white border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] focus:ring-opacity-20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--c-text-muted)] mb-1 font-semibold">Password</label>
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={(event) => setLoginPassword(event.target.value)}
                                    className="w-full bg-white border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] focus:ring-opacity-20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>

                            {error ? <p className="text-sm text-[var(--c-error)]">{error}</p> : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 rounded-lg bg-[var(--c-accent)] text-white font-bold hover:bg-opacity-90 disabled:opacity-70 transition-all"
                            >
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                            </button>
                            <div className="text-center mt-2">
                                <Link to="/reset-password" className="text-sm text-[var(--c-accent)] hover:underline">
                                    Forgot Password?
                                </Link>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <form onSubmit={onSignUpSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--c-text-muted)] mb-1 font-semibold">Email</label>
                                <input
                                    type="email"
                                    value={signupEmail}
                                    onChange={(event) => setSignupEmail(event.target.value)}
                                    className="w-full bg-white border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] focus:ring-opacity-20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--c-text-muted)] mb-1 font-semibold">Password</label>
                                <input
                                    type="password"
                                    value={signupPassword}
                                    onChange={(event) => setSignupPassword(event.target.value)}
                                    className="w-full bg-white border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] focus:ring-opacity-20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--c-text-muted)] mb-1 font-semibold">Confirm Password</label>
                                <input
                                    type="password"
                                    value={signupConfirmPassword}
                                    onChange={(event) => setSignupConfirmPassword(event.target.value)}
                                    className="w-full bg-white border border-[var(--c-border)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] focus:ring-opacity-20 focus:border-[var(--c-accent)]"
                                    required
                                />
                            </div>

                            {error ? <p className="text-sm text-[var(--c-error)]">{error}</p> : null}
                            {info ? <p className="text-sm text-[var(--c-success)]">{info}</p> : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 rounded-lg bg-[var(--c-accent)] text-white font-bold hover:bg-opacity-90 disabled:opacity-70 transition-all"
                            >
                                {isSubmitting ? 'Creating account...' : 'Sign Up'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-6 text-xs text-[var(--c-text-subtle)] space-y-1">
                    <p>Admin: root@gmail.com / root</p>
                    <p>Existing Client: client1@gmail.com / client1</p>
                    <p>New signups require root admin approval before dashboard access.</p>
                </div>
            </div>
        </div>
    );
}
