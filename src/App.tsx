import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { PhysicianView } from './components/PhysicianView';
import { SettingsView } from './components/SettingsView';
import { RecordList } from './components/RecordList';
import { RecordForm } from './components/RecordForm';
import { HealthRecord, UserSettings } from './types';
import { getRecords, saveRecord, updateRecord, deleteRecord } from './utils/api';
import { Activity, Edit3, Stethoscope } from 'lucide-react';

type ViewMode = 'dashboard' | 'list' | 'physician' | 'settings';

function App() {
    const [user, setUser] = useState<UserSettings | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
    const [isAppLoading, setIsAppLoading] = useState(true);

    // Initial Login Check
    useEffect(() => {
        const savedUser = localStorage.getItem('glusure_user_full');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                if (parsed.rememberMe && parsed.rememberPassword && parsed.name && parsed.password) {
                    setUser(parsed);
                }
            } catch (e) {
                console.error("Failed to parse saved user", e);
            }
        }
        setIsAppLoading(false);
    }, []);

    // Load Records
    useEffect(() => {
        if (user) {
            loadData(user.name);
        }
    }, [user]);

    const loadData = async (currentUserName?: string) => {
        const targetUser = currentUserName || user?.name;
        if (!targetUser) return;

        // Try load from cache first for immediate display
        const cacheKey = `glusure_cache_${targetUser}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                setRecords(JSON.parse(cached));
            } catch (e) {
                console.error('Failed to parse cache', e);
            }
        }

        let data = await getRecords();

        // Filter by user
        let userRecords = data.filter(r => r.name === targetUser);

        // Inject Dummy Data for TestUser123 if empty
        if (targetUser === 'TestUser123' && userRecords.length === 0) {
            console.log('Generating dummy data for TestUser123...');
            const dummyData = await import('./utils/dummyGenerator').then(m => m.generateDummyData(targetUser));
            userRecords = dummyData;
        }

        setRecords(userRecords);
        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(userRecords));
    };

    const handleLogin = (settings: UserSettings) => {
        setUser(settings);
    };

    const handleLogout = () => {
        const savedUser = localStorage.getItem('glusure_user_full');
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                // Logout clears password and auto-login flag
                const loggedOutUser = { ...parsed, rememberPassword: false, password: '' };
                localStorage.setItem('glusure_user_full', JSON.stringify(loggedOutUser));
            } catch (e) { }
        }

        // Clear user-specific cache on logout
        if (user?.name) {
            localStorage.removeItem(`glusure_cache_${user.name}`);
        }

        setUser(null);
        setRecords([]);
    };

    const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);

    // Swipe Navigation Logic
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        if (!user?.enableSwipeNav) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            // Swipe Left: Next View (Dashboard -> List -> Physician)
            if (viewMode === 'dashboard') setViewMode('list');
            else if (viewMode === 'list') setViewMode('physician');
        } else if (isRightSwipe) {
            // Swipe Right: Prev View (Physician -> List -> Dashboard)
            if (viewMode === 'physician') setViewMode('list');
            else if (viewMode === 'list') setViewMode('dashboard');
        }
    };

    const handleSubmitRecord = async (record: HealthRecord) => {
        if (record.id) {
            await updateRecord(record);
        } else {
            await saveRecord(record);
        }
        await loadData();
        setEditingRecord(null);
        setShowSuccessFeedback(true);
        setTimeout(() => setShowSuccessFeedback(false), 3000);
    };

    // ... existing handlers ...

    const handleEditRecord = (record: HealthRecord) => {
        setEditingRecord(record);
        setIsFormOpen(true);
    };

    const handleDeleteRecord = async (id: string) => {
        if (confirm('確定要刪除這筆紀錄嗎？')) {
            await deleteRecord(id);
            await loadData();
        }
    };

    const handleUpdateSettings = async (settings: Partial<UserSettings>) => {
        if (!user) return;
        const updatedUser = { ...user, ...settings };
        setUser(updatedUser);
        localStorage.setItem('glusure_user_full', JSON.stringify(updatedUser));
    };

    if (isAppLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-teal-500 text-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="font-medium">載入中...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <LoginForm onLogin={handleLogin} />;
    }

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="min-h-screen"
        >
            <Layout userName={user.name} onLogout={handleLogout} onSettings={() => setViewMode('settings')}>
                {/* View Switcher */}
                <div className="flex justify-center mb-6 space-x-2 sm:space-x-4">
                    <button
                        onClick={() => setViewMode('dashboard')}
                        className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'dashboard' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Activity className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">健康</span>儀表板
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Edit3 className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">編輯</span>紀錄
                    </button>
                    <button
                        onClick={() => setViewMode('physician')}
                        className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'physician' ? 'bg-teal-100 text-teal-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Stethoscope className="w-4 h-4 mr-1 sm:mr-2" />
                        醫師模式
                    </button>
                </div>


                {/* Main Content */}
                <div className="animate-fade-in">
                    {viewMode === 'dashboard' && (
                        <Dashboard
                            records={records}
                            userSettings={user}
                            onAddRecord={() => {
                                setEditingRecord(null);
                                setIsFormOpen(true);
                            }}
                            onEditRecord={handleEditRecord}
                            onSaveRecord={handleSubmitRecord}
                            onUpdateSettings={handleUpdateSettings}
                            showSuccessFeedback={showSuccessFeedback}
                            auxiliaryLineMode={user.auxiliaryLineMode}
                        />
                    )}

                    {viewMode === 'list' && (
                        <RecordList
                            records={records}
                            onEdit={handleEditRecord}
                            onDelete={handleDeleteRecord}
                            thresholds={user.thresholds}
                        />
                    )}

                    {viewMode === 'physician' && (
                        <PhysicianView records={records} userSettings={user} />
                    )}

                    {viewMode === 'settings' && (
                        <SettingsView
                            user={user}
                            onBack={() => setViewMode('dashboard')}
                            onUpdate={(newSettings) => {
                                setUser(newSettings);
                                // Update Local Storage to persist changes across reloads
                                const savedUser = localStorage.getItem('glusure_user_full');
                                if (savedUser) {
                                    const parsed = JSON.parse(savedUser);
                                    const updatedUser = { ...parsed, ...newSettings };
                                    localStorage.setItem('glusure_user_full', JSON.stringify(updatedUser));
                                }
                            }}
                        />
                    )}
                </div>

                {/* Record Form Modal */}
                <RecordForm
                    isOpen={isFormOpen}
                    onClose={() => {
                        setIsFormOpen(false);
                        setEditingRecord(null);
                    }}
                    onSubmit={handleSubmitRecord}
                    initialData={editingRecord}
                    userName={user.name}
                />
            </Layout>
        </div>
    );
}

export default App;
