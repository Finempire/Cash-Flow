'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Email and password are required');
            return;
        }

        setLoading(true);
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error('Invalid credentials');
            } else {
                toast.success('Login successful');
                router.push('/dashboard');
                router.refresh();
            }
        } catch {
            toast.error('Login failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="card">
                    <div className="card-header">
                        <h1 className="text-lg font-semibold text-gray-900">
                            Petty Cash Management
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Procurement Control System
                        </p>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label htmlFor="email" className="label">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="user@cashflow.com"
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="label">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="Enter password"
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full h-9"
                            >
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
                <p className="text-2xs text-gray-400 text-center mt-3">
                    Textile Procurement Management v1.0
                </p>
            </div>
        </div>
    );
}
