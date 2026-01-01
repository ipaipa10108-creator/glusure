import React, { useState } from 'react';
import { UserSettings, DEFAULT_THRESHOLDS } from '../types';
import { updateUserSettings } from '../utils/api';
import { Save, Lock, ChevronLeft, Mail } from 'lucide-react';

interface SettingsViewProps {
    user: UserSettings;
    onUpdate: (settings: UserSettings) => void;
    onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdate, onBack }) => {
    const [password, setPassword] = useState(user.password || '');
    const [email, setEmail] = useState(user.email || '');
    const [thresholds, setThresholds] = useState(user.thresholds || DEFAULT_THRESHOLDS);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const newSettings = { ...user, password, email, thresholds };
        const success = await updateUserSettings(newSettings);

        if (success) {
            onUpdate(newSettings);
            setMessage('設定已成功儲存！');
        } else {
            setMessage('儲存失敗，請檢查網路連線。');
        }
        setLoading(false);
    };

    const handleThresholdChange = (key: keyof typeof DEFAULT_THRESHOLDS, value: string) => {
        setThresholds(prev => ({
            ...prev,
            [key]: Number(value) || 0
        }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button
                onClick={onBack}
                className="flex items-center text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回首頁
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
                    <Lock className="w-5 h-5 mr-2 text-teal-600" />
                    <h3 className="text-lg font-semibold text-gray-800">帳號與設定</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Basic Info Section */}
                    <section className="space-y-4">
                        <h4 className="font-medium text-gray-700 flex items-center">
                            <span className="w-1.5 h-6 bg-teal-500 rounded-full mr-2"></span>
                            基本資料與安全
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">新的登入密碼</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="請輸入新密碼"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1 flex items-center">
                                    <Mail className="w-3.5 h-3.5 mr-1" /> E-Mail 地址
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>
                    </section>



                    {/* Display Preferences */}
                    < section className="space-y-4" >
                        <h4 className="font-medium text-gray-700 flex items-center">
                            <span className="w-1.5 h-6 bg-teal-500 rounded-full mr-2"></span>
                            顯示偏好
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <span className="text-sm text-gray-700">預設顯示警示線</span>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                    checked={user.showAlertLines !== false} // Default to true if undefined
                                    onChange={(e) => onUpdate({ ...user, showAlertLines: e.target.checked })}
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <span className="text-sm text-gray-700">預設顯示輔助線視覺</span>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                    checked={user.showAuxiliaryLines !== false} // Default to true if undefined
                                    onChange={(e) => onUpdate({ ...user, showAuxiliaryLines: e.target.checked })}
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 sm:col-span-2">
                                <span className="text-sm text-gray-700">啟用左右滑動切換頁面 (儀表板/紀錄/醫師模式)</span>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                    checked={user.enableSwipeNav === true} // Default to false
                                    onChange={(e) => onUpdate({ ...user, enableSwipeNav: e.target.checked })}
                                />
                            </label>
                        </div>
                    </section >

                    {/* Thresholds Section */}
                    < section className="space-y-4" >
                        <h4 className="font-medium text-gray-700 flex items-center">
                            <span className="w-1.5 h-6 bg-teal-500 rounded-full mr-2"></span>
                            警示閾值自訂 (超過此數值標示為異常)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4 p-4 bg-red-50/50 rounded-xl border border-red-100">
                                <p className="text-xs font-bold text-red-700 uppercase tracking-wider">血糖閾值 (mg/dL)</p>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">空腹高標</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                        value={thresholds.fastingHigh}
                                        onChange={(e) => handleThresholdChange('fastingHigh', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">飯後高標</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                        value={thresholds.postMealHigh}
                                        onChange={(e) => handleThresholdChange('postMealHigh', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 p-4 bg-teal-50/50 rounded-xl border border-teal-100">
                                <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">血壓閾值 (mmHg)</p>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">收縮壓高標 (SYS)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                        value={thresholds.systolicHigh}
                                        onChange={(e) => handleThresholdChange('systolicHigh', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">舒張壓高標 (DIA)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                        value={thresholds.diastolicHigh}
                                        onChange={(e) => handleThresholdChange('diastolicHigh', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 sm:col-span-2">
                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">體重觀察目標 (kg)</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">設定高標 (例如 80)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                            value={thresholds.weightHigh}
                                            onChange={(e) => handleThresholdChange('weightHigh', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">設定低標 (例如 60)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                            value={thresholds.weightLow}
                                            onChange={(e) => handleThresholdChange('weightLow', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section >

                    <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setThresholds(DEFAULT_THRESHOLDS);
                                    // Reset display preferences to FALSE (Closed) as per user request
                                    onUpdate({
                                        ...user,
                                        showAlertLines: false,
                                        showAuxiliaryLines: false
                                    });
                                }}
                                className="text-sm text-gray-500 hover:text-teal-600 underline transition-colors"
                            >
                                恢復預設值
                            </button>
                            <span className={`text-sm font-medium ${message.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
                                {message}
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-300 font-medium"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? '儲存中...' : '儲存變更'}
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
};
