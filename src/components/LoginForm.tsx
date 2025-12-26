import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { login } from '../utils/api';

interface LoginFormProps {
    onLogin: (settings: UserSettings) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [rememberPassword, setRememberPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const savedUser = localStorage.getItem('glusure_user_full');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                if (parsed.name && parsed.rememberMe) {
                    // If rememberPassword is true, we have the password too
                    handleAutoLogin(parsed.name, parsed.password, parsed.rememberMe, parsed.rememberPassword);
                }
            } catch (e) { }
        }
    }, []);

    const handleAutoLogin = async (n: string, p: string | undefined, rMe: boolean, rPw: boolean) => {
        setLoading(true);
        const settings = await login(n, p);
        if (settings) {
            onLogin({ ...settings, rememberMe: rMe, rememberPassword: rPw });
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const settings = await login(name, password);
        if (settings) {
            const fullSettings = { ...settings, rememberMe, rememberPassword, password: rememberPassword ? password : '' };
            if (rememberMe) {
                localStorage.setItem('glusure_user_full', JSON.stringify(fullSettings));
            } else {
                localStorage.removeItem('glusure_user_full');
            }
            onLogin(fullSettings);
        } else {
            setError('登入失敗，請檢查姓名與密碼');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-teal-600 mb-2">Glusure</h1>
                    <p className="text-gray-500">您的個人健康管家</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            姓名
                        </label>
                        <input
                            type="text"
                            id="name"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                            placeholder="請輸入您的姓名"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            密碼 (預設 1234)
                        </label>
                        <input
                            type="password"
                            id="password"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                            placeholder="請輸入您的密碼"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                記住姓名 (下次自動帶入)
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="remember-password"
                                type="checkbox"
                                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                checked={rememberPassword}
                                onChange={(e) => setRememberPassword(e.target.checked)}
                            />
                            <label htmlFor="remember-password" className="ml-2 block text-sm text-gray-900">
                                記住密碼 (下次自動登入)
                            </label>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-teal-300"
                    >
                        {loading ? '登入中...' : '開始使用'}
                    </button>
                </form>
            </div>
        </div>
    );
};
