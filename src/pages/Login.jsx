import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
    const { login, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('client1@gmail.com');
    const [password, setPassword] = useState('client1');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isLoading && isAuthenticated) {
        const nextPath = location.state?.from?.pathname || '/dashboard';
        return <Navigate to={nextPath} replace />;
    }

    const onSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const user = await login(email, password);
            navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
        } catch (err) {
            setError(err?.message || 'Failed to login');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--c-bg)] via-[#111a23] to-[var(--c-bg)] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-[var(--c-raised)] border border-[var(--c-border-light)] rounded-2xl shadow-2xl p-8">
                <h1 className="text-2xl font-bold text-[var(--c-text)] mb-2">Dashboard Login</h1>
                <p className="text-sm text-gray-400 mb-6">Use admin or client credentials to continue.</p>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[#00d9ff]"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full bg-[var(--c-bg)] border border-[var(--c-border-light)] rounded-lg px-3 py-2 text-[var(--c-text)] focus:outline-none focus:border-[#00d9ff]"
                            required
                        />
                    </div>

                    {error ? <p className="text-sm text-rose-400">{error}</p> : null}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-lg bg-[#00d9ff] text-[var(--c-bg)] font-semibold disabled:opacity-70"
                    >
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-xs text-gray-500 space-y-1">
                    <p>Admin: root@gmail.com / root</p>
                    <p>Client: client1@gmail.com / client1</p>
                </div>
            </div>
        </div>
    );
}
