import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { login, registerUser } from '../utils/api';
import { User, Lock, Mail, Loader2, UserPlus, LogIn, ChevronRight } from 'lucide-react';

interface LoginFormProps {
    onLogin: (user: UserSettings) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [rememberPassword, setRememberPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const savedUser = localStorage.getItem('glusure_user_full');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                if (parsed.name) {
                    setName(parsed.name);
                    setRememberMe(true);
                    if (parsed.password && parsed.rememberPassword) {
                        setPassword(parsed.password);
                        setRememberPassword(true);
                    }
                }
            } catch (e) { }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                const result = await registerUser(name, password, email);
                if (result.success) {
                    setIsRegister(false);
                    setError('註冊成功！請直接登入');
                } else {
                    setError(result.message || '註冊失敗，請重試');
                }
            } else {
                const user = await login(name, password);
                if (user) {
                    const fullSettings = {
                        ...user,
                        rememberMe,
                        rememberPassword,
                        password: rememberPassword ? password : ''
                    };

                    if (rememberMe) {
                        localStorage.setItem('glusure_user_full', JSON.stringify(fullSettings));
                    } else {
                        localStorage.removeItem('glusure_user_full');
                    }
                    onLogin(fullSettings);
                } else {
                    setError('登入失敗，請檢查姓名與密碼 (既有帳號預設密碼為 1234)');
                }
            }
        } catch (err) {
            setError('連線失敗，請檢查網路或 API 設定');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-600 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-teal-100 rounded-full mb-4">
                        {isRegister ? <UserPlus className="w-8 h-8 text-teal-600" /> : <LogIn className="w-8 h-8 text-teal-600" />}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800">{isRegister ? '建立 Glusure 帳號' : '登入 Glusure'}</h2>
                    <p className="text-gray-500 mt-2">{isRegister ? '加入我們管理您的健康' : '您的個人健康管家'}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className={`p-3 rounded-lg text-sm text-center ${error.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                required
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder="您的姓名"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                required
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                placeholder={isRegister ? "請設定登入密碼" : "登入密碼 (預設 1234)"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {isRegister && (
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                                    placeholder="電子郵件 (非必要)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {!isRegister && (
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">記住姓名 (下次自動帶入)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                    checked={rememberPassword}
                                    onChange={(e) => setRememberPassword(e.target.checked)}
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">記住密碼 (下次自動登入)</span>
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold shadow-lg hover:bg-teal-700 transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:bg-teal-400"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                <span>{isRegister ? '立即註冊' : '開始使用'}</span>
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">{isRegister ? '已有帳號？' : '還沒開通帳號？'}</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setIsRegister(!isRegister);
                        setError('');
                    }}
                    className="w-full py-2 bg-gray-50 text-gray-600 rounded-lg font-medium border border-gray-200 hover:bg-gray-100 transition-all active:scale-95"
                >
                    {isRegister ? '返回登入介面' : '建立我的個人帳號'}
                </button>
            </div>
        </div>
    );
};
