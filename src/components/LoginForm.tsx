import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';

interface LoginFormProps {
    onLogin: (settings: UserSettings) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const [name, setName] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const savedName = localStorage.getItem('glusure_user');
        if (savedName) {
            onLogin({ name: savedName, rememberMe: true });
        }
    }, [onLogin]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            if (rememberMe) {
                localStorage.setItem('glusure_user', name);
            } else {
                localStorage.removeItem('glusure_user');
            }
            onLogin({ name, rememberMe });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-teal-600 mb-2">Glusure</h1>
                    <p className="text-gray-500">您的個人健康管家</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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

                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                            記住我
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
                    >
                        開始使用
                    </button>
                </form>
            </div>
        </div>
    );
};
