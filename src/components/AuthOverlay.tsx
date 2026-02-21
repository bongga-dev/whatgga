import React, { useState } from 'react';
import { Lock, Mail, KeyRound, ArrowRight } from 'lucide-react';

export default function AuthOverlay({ isFirstRun }: { isFirstRun: boolean }) {
    const [mode, setMode] = useState<'login' | 'register'>(isFirstRun ? 'register' : 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const payload: any = { email, password };
            if (mode === 'register') payload.authCode = authCode;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Authentication failed');
                setLoading(false);
                return;
            }

            // Reload page on success so Astro picks up the cookie
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Network error');
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl w-full max-w-md mx-auto p-10 border border-bongga-light/50 transform transition-all animate-[fadeInUp_0.4s_ease-out]">
            <div className="mx-auto w-16 h-16 rounded-full bg-bongga-orange/10 flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-bongga-orange" />
            </div>

            <h2 className="text-3xl font-bold text-bongga-dark text-center mb-2">
                {mode === 'login' ? 'Private Access' : 'Initial Setup'}
            </h2>
            <p className="text-center text-bongga-dark/60 mb-8 font-medium">
                {mode === 'login'
                    ? 'Authenticate to manage your WhatsApp gateway sessions.'
                    : 'Register your admin gateway account.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 text-sm font-semibold text-center">
                        {error}
                    </div>
                )}

                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bongga-dark/40" />
                    <input
                        type="text"
                        required
                        className="w-full bg-transparent border-2 border-bongga-light rounded-xl pl-12 pr-5 py-4 focus:ring-0 focus:border-bongga-orange text-bongga-dark outline-none font-medium placeholder:text-bongga-dark/40"
                        placeholder="Username"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bongga-dark/40" />
                    <input
                        type="password"
                        required
                        className="w-full bg-transparent border-2 border-bongga-light rounded-xl pl-12 pr-5 py-4 focus:ring-0 focus:border-bongga-orange text-bongga-dark outline-none font-medium placeholder:text-bongga-dark/40"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                {mode === 'register' && (
                    <div className="relative animate-[fadeIn_0.3s_ease]">
                        <input
                            type="password"
                            required
                            className="w-full bg-bongga-orange/5 border-2 border-bongga-orange/30 rounded-xl px-5 py-4 focus:ring-0 focus:border-bongga-orange text-bongga-dark outline-none font-medium placeholder:text-bongga-orange/60"
                            placeholder="Developer Registration Code"
                            value={authCode}
                            onChange={e => setAuthCode(e.target.value)}
                        />
                        <p className="text-xs text-bongga-orange/80 mt-2 ml-1">Requires system administrator code to register.</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-bongga-orange hover:bg-[#c24225] disabled:bg-bongga-light disabled:text-bongga-dark/40 text-white font-bold tracking-wide py-4 sm:py-5 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? 'Authenticating...' : (mode === 'login' ? 'Grant Access' : 'Initialize Root Admin')}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button
                    type="button"
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-bongga-dark/60 hover:text-bongga-dark font-semibold text-sm transition-colors border-b border-transparent hover:border-bongga-dark"
                >
                    {mode === 'login'
                        ? 'System not initialized? Create root access.'
                        : 'Already initialized? Login here.'}
                </button>
            </div>
        </div>
    );
}
