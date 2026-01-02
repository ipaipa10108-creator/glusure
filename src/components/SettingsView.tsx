import React, { useState } from 'react';
import { UserSettings, DEFAULT_THRESHOLDS, DEFAULT_AUXILIARY_COLORS, AuxiliaryColors, DEFAULT_ALERT_POINT_COLOR } from '../types';
import { updateUserSettings } from '../utils/api';
import { Save, Lock, ChevronLeft, Mail, HelpCircle, X } from 'lucide-react';

// Helper: Convert rgba to hex (for color input)
const rgbaToHex = (rgba: string): string => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
};

// Helper: Convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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
    const [showHelp, setShowHelp] = useState(false);

    // Helper: Get current aux colors with defaults
    const getAuxColors = (): AuxiliaryColors => ({
        ...DEFAULT_AUXILIARY_COLORS,
        ...user.auxiliaryColors
    });

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
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center">
                        <Lock className="w-5 h-5 mr-2 text-teal-600" />
                        <h3 className="text-lg font-semibold text-gray-800">帳號與設定</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowHelp(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                        title="使用說明"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span>說明</span>
                    </button>
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

                            {/* Auxiliary Line Mode Selection */}
                            {user.showAuxiliaryLines !== false && (
                                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 sm:col-span-2">
                                    <span className="text-sm text-gray-700 block mb-2">輔助線呈現方式</span>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="auxMode"
                                                className="text-teal-600 focus:ring-teal-500"
                                                checked={!user.auxiliaryLineMode || user.auxiliaryLineMode === 'y-axis'}
                                                onChange={() => onUpdate({ ...user, auxiliaryLineMode: 'y-axis' })}
                                            />
                                            <span className="text-sm text-gray-600">Y軸 (垂直色塊)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="auxMode"
                                                className="text-teal-600 focus:ring-teal-500"
                                                checked={user.auxiliaryLineMode === 'x-axis'}
                                                onChange={() => onUpdate({ ...user, auxiliaryLineMode: 'x-axis' })}
                                            />
                                            <span className="text-sm text-gray-600">X軸 (線段變色)</span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">X軸模式下，若資料點之間無連線，將自動維持以Y軸方式顯示。</p>
                                </div>
                            )}

                            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 sm:col-span-2">
                                <span className="text-sm text-gray-700">啟用左右滑動切換頁面 (儀表板/紀錄/醫師模式)</span>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                    checked={user.enableSwipeNav === true} // Default to false
                                    onChange={(e) => onUpdate({ ...user, enableSwipeNav: e.target.checked })}
                                />
                            </label>

                            {/* Auxiliary Line Color Customization */}
                            {user.showAuxiliaryLines !== false && (
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 sm:col-span-2 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">輔助線顏色設定</span>
                                        <button
                                            type="button"
                                            onClick={() => onUpdate({ ...user, auxiliaryColors: undefined })}
                                            className="text-xs text-teal-600 hover:text-teal-800 underline"
                                        >
                                            恢復預設顏色
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {/* Weight Chart Colors */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.resistance || 'rgba(185, 28, 28, 0.8)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        resistance: hexToRgba(e.target.value, 0.8)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">阻力訓練</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.cycling || 'rgba(249, 115, 22, 0.8)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        cycling: hexToRgba(e.target.value, 0.8)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">腳踏車</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.walking || 'rgba(16, 185, 129, 0.8)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        walking: hexToRgba(e.target.value, 0.8)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">健走/其他</span>
                                        </div>

                                        {/* BP Chart Colors */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.weatherHot || 'rgba(239, 68, 68, 0.6)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        weatherHot: hexToRgba(e.target.value, 0.6)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">天氣(熱)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.weatherCold || 'rgba(59, 130, 246, 0.6)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        weatherCold: hexToRgba(e.target.value, 0.6)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">天氣(冷)</span>
                                        </div>

                                        {/* Glucose Chart Colors */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.bigMeal || 'rgba(239, 68, 68, 0.6)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        bigMeal: hexToRgba(e.target.value, 0.6)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">大餐</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.dieting || 'rgba(16, 185, 129, 0.6)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        dieting: hexToRgba(e.target.value, 0.6)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">節食</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                                value={rgbaToHex(user.auxiliaryColors?.fasting || 'rgba(139, 92, 246, 0.6)')}
                                                onChange={(e) => onUpdate({
                                                    ...user,
                                                    auxiliaryColors: {
                                                        ...getAuxColors(),
                                                        fasting: hexToRgba(e.target.value, 0.6)
                                                    }
                                                })}
                                            />
                                            <span className="text-xs text-gray-600">斷食</span>
                                        </div>
                                    </div>
                                </div>
                            )}
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

                            {/* 脈壓差閒值 */}
                            <div className="space-y-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">脈壓差閒值 (收縮壓-舒張壓)</p>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">高標 (> 此值警示)，預設 60</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                        value={thresholds.pulsePressureHigh}
                                        onChange={(e) => handleThresholdChange('pulsePressureHigh', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">低標 (< 此值警示)，預設 30</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md"
                                        value={thresholds.pulsePressureLow}
                                        onChange={(e) => handleThresholdChange('pulsePressureLow', e.target.value)}
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

                            {/* 超過警示點顏色設定 */}
                            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 sm:col-span-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-700">超過警示線的資料點顏色</span>
                                    <input
                                        type="color"
                                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                        value={user.alertPointColor || DEFAULT_ALERT_POINT_COLOR}
                                        onChange={(e) => onUpdate({ ...user, alertPointColor: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onUpdate({ ...user, alertPointColor: undefined })}
                                        className="text-xs text-teal-600 hover:text-teal-800 underline"
                                    >
                                        恢復預設
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">圖表上超過閒值的點會以此顏色顯示</p>
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

            {/* 使用說明 Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div >
    );
};

// 使用說明 Modal 組件 (內部使用)
const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white flex justify-between items-center sticky top-0 z-10">
                    <h4 className="font-bold text-lg">使用說明</h4>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6 text-sm text-gray-700">
                    {/* 健康儀表板 */}
                    <section>
                        <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">📊</span> 健康儀表板
                        </h5>
                        <ul className="space-y-1.5 ml-7 list-disc text-gray-600">
                            <li>體重 / 血壓 / 血糖趨勢圖表，可放大至全螢幕</li>
                            <li>開啟「警示線」顯示個人化閒值線</li>
                            <li>開啟「輔助線」查看運動 / 天氣 / 飲食對照</li>
                            <li>脈壓差異常時，血壓圖會以紅色虛線連接收縮壓與舒張壓</li>
                        </ul>
                    </section>

                    {/* 紀錄管理 */}
                    <section>
                        <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">📝</span> 紀錄管理
                        </h5>
                        <ul className="space-y-1.5 ml-7 list-disc text-gray-600">
                            <li>新增 / 編輯健康數據（體重、血壓、心率、血糖）</li>
                            <li>結構化備註：飲食 🥩 、運動 🚶 、天氣 ☀️ 、隨手記 📝</li>
                            <li>點擊圖表資料點可快速編輯該筆紀錄</li>
                        </ul>
                    </section>

                    {/* 醫師模式 */}
                    <section>
                        <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">👨‍⚕️</span> 醫師模式
                        </h5>
                        <ul className="space-y-1.5 ml-7 list-disc text-gray-600">
                            <li>日曆式每日彙整，白天 / 傍晚血壓分開顯示</li>
                            <li>脈壓差異常時，日/夜血壓區塊顯示紅色邊框</li>
                            <li>切換「簡易 / 詳細」模式查看更多細節</li>
                        </ul>
                    </section>

                    {/* 設定 */}
                    <section>
                        <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">⚙️</span> 設定
                        </h5>
                        <ul className="space-y-1.5 ml-7 list-disc text-gray-600">
                            <li>自訂警示閒值（血壓、血糖、體重、脈壓差）</li>
                            <li>自訂輔助線顏色與超過警示點顏色</li>
                            <li>左右滑動切換頁面（可選功能）</li>
                        </ul>
                    </section>

                    <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                        Glusure - 你的個人健康追蹤助手
                    </div>
                </div>
            </div>
        </div>
    );
};
