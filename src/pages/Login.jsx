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

    if (!isLoading && isAuthenticated) {
        const nextPath = location.state?.from?.pathname
            || (isAdmin ? '/admin' : (isApproved ? '/dashboard' : '/settings'));
        return <Navigate to={nextPath} replace />;
    }

    const targetPathForUser = (nextUser) => {
        if (nextUser?.role === 'admin') return '/admin';
        if (nextUser?.approvalStatus !== 'approved') return '/settings';
        return location.state?.from?.pathname || '/dashboard';
    };

    const onSignInSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setInfo('');
        setIsSubmitting(true);
        try {
            const loggedInUser = await login(loginEmail, loginPassword);
            navigate(targetPathForUser(loggedInUser), { replace: true });
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--c-bg)] via-[#111a23] to-[var(--c-bg)] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[var(--c-raised)] border border-[var(--c-border-light)] rounded-2xl shadow-2xl p-8">
                <h1 className="text-2xl font-bold text-[var(--c-text)] mb-2">Client Access</h1>
                <p className="text-sm text-gray-400 mb-6">Sign in or create a new client account.</p>

                <div className="grid grid-cols-2 gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('signin');
                            setError('');
                            setInfo('');
                        }}
                        className={`py-2 rounded-lg text-sm font-semibold ${mode === 'signin'
                            ? 'bg-[var(--c-accent)] text-[var(--c-bg)]'
                            : 'bg-[var(--c-bg)] border border-[var(--c-border-light)] text-[var(--c-text-dim)]'
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
                        className={`py-2 rounded-lg text-sm font-semibold ${mode === 'signup'
                            ? 'bg-[var(--c-accent)] text-[var(--c-bg)]'
                            : 'bg-[var(--c-bg)] border border-[var(--c-border-light)] text-[var(--c-text-dim)]'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {mode === 'signin' ? (
                    <form onSubmit={onSignInSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                value={loginEmail}
                                onChange={(event) => setLoginEmail(event.target.value)}
                                className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                value={loginPassword}
                                onChange={(event) => setLoginPassword(event.target.value)}
                                className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
                                required
                            />
                        </div>

                        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-lg bg-[var(--c-accent)] text-[var(--c-bg)] font-semibold disabled:opacity-70"
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                        </button>
                        <div className="text-center mt-2">
                            <Link to="/reset-password" className="text-sm text-[var(--c-accent)] hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={onSignUpSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Client Name</label>
                            <input
                                type="text"
                                value={signupClientName}
                                onChange={(event) => setSignupClientName(event.target.value)}
                                className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
                                placeholder="Acme Inc."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                value={signupEmail}
                                onChange={(event) => setSignupEmail(event.target.value)}
                                className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                value={signupPassword}
                                onChange={(event) => setSignupPassword(event.target.value)}
                                className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                value={signupConfirmPassword}
                                onChange={(event) => setSignupConfirmPassword(event.target.value)}
                                className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
                                required
                            />
                        </div>

                        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
                        {info ? <p className="text-sm text-emerald-400">{info}</p> : null}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-lg bg-[var(--c-accent)] text-[var(--c-bg)] font-semibold disabled:opacity-70"
                        >
                            {isSubmitting ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-xs text-gray-500 space-y-1">
                    <p>Admin: root@gmail.com / root</p>
                    <p>Existing Client: client1@gmail.com / client1</p>
                    <p>New signups require root admin approval before dashboard access.</p>
                </div>
            </div>
        </div>
    );
}
