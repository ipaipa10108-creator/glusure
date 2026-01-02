import React from 'react';
import { LogOut, User, Settings, HelpCircle } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    userName: string;
    onLogout: () => void;
    onSettings?: () => void;
    onHelp?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, userName, onLogout, onSettings, onHelp }) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-2xl font-bold text-teal-600">Glusure</span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            {onHelp && (
                                <button
                                    onClick={onHelp}
                                    className="p-2 rounded-full text-gray-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                                    title="使用說明"
                                >
                                    <HelpCircle className="h-5 w-5" />
                                </button>
                            )}
                            {onSettings && (
                                <button
                                    onClick={onSettings}
                                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                                    title="個人設定"
                                >
                                    <Settings className="h-5 w-5" />
                                </button>
                            )}
                            <div className="flex items-center text-gray-700">
                                <User className="h-5 w-5 mr-1 sm:mr-2 text-teal-500" />
                                <span className="font-medium text-sm sm:text-base">{userName}</span>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                                title="登出"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
};
