import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, RefreshCw, Trash2, Smartphone, KeyRound, Save } from 'lucide-react';

function Toast({ message, type, onClose }: { message: string, type: 'error' | 'success', onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl text-white font-medium ${type === 'success' ? 'bg-bongga-aqua' : 'bg-bongga-orange'} transition-all z-50 transform hover:scale-105 duration-200 border border-white/20 backdrop-blur-md`}>
            {message}
        </div>
    );
}

export default function Dashboard() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [newSessionName, setNewSessionName] = useState('');
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [apiKeyModal, setApiKeyModal] = useState<{ key: string; isOpen: boolean }>({ key: '', isOpen: false });
    const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions');
            const data = await res.json();
            setSessions(data);
        } catch (err) { }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleAddSession = async () => {
        if (!newSessionName.trim()) return;
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: newSessionName })
            });

            if (!res.ok) {
                const errorText = await res.text();
                try {
                    const errJson = JSON.parse(errorText);
                    setToast({ message: errJson.error || 'Error creating session', type: 'error' });
                } catch (e) {
                    setToast({ message: `Server error`, type: 'error' });
                }
                return;
            }

            const data = await res.json();
            if (data.success) {
                setNewSessionName('');
                setApiKeyModal({ key: data.apiKey, isOpen: true });
                await fetchSessions();
                setActiveSessionId(data.sessionId);
                setToast({ message: 'Session created successfully', type: 'success' });
            }
        } catch (err: any) {
            setToast({ message: err.message || 'Network error', type: 'error' });
        }
    };

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* API Key Modal with Glassmorphism */}
            {apiKeyModal.isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-bongga-dark/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-10 text-center space-y-6 border border-bongga-light transform transition-all scale-100">
                        <div className="mx-auto w-16 h-16 rounded-full bg-bongga-aqua/10 flex items-center justify-center mb-4">
                            <KeyRound className="w-8 h-8 text-bongga-aqua" />
                        </div>
                        <h3 className="text-2xl flex items-center justify-center gap-2 text-bongga-dark font-bold">
                            Credentials Generated
                        </h3>
                        <p className="text-bongga-dark/70 text-base">Your secret authorization key is ready:</p>

                        <div className="border border-bongga-aqua/50 border-dashed bg-bongga-aqua/5 px-6 py-4 rounded-xl text-sm break-all font-mono text-bongga-dark font-semibold selection:bg-bongga-aqua selection:text-white">
                            {apiKeyModal.key}
                        </div>

                        <p className="text-sm border border-bongga-orange/30 bg-bongga-orange/10 text-bongga-dark py-3 px-4 rounded-xl">
                            <span className="text-bongga-orange font-bold mr-2">⚠️ IMPORTANT:</span>
                            Save this key securely now. For security reasons, it won't be displayed again.
                        </p>
                        <button
                            onClick={() => setApiKeyModal({ key: '', isOpen: false })}
                            className="w-full bg-bongga-dark hover:bg-black text-white font-bold tracking-wide py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                        >
                            I HAVE SAVED MY SECRET KEY
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Sessions Control Panel */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm hover:shadow-md transition-shadow p-8 space-y-8 border border-bongga-light/50">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-bongga-dark flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-bongga-orange" /> Connected Devices
                    </h2>
                </div>

                <div className="flex flex-wrap gap-4">
                    {sessions.map((s) => {
                        const isConnected = s.status === 'connected';
                        const isActive = activeSessionId === s.id;
                        return (
                            <button
                                key={s.id}
                                onClick={() => setActiveSessionId(s.id)}
                                className={`px-6 py-3 border-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${isActive
                                    ? 'border-bongga-orange bg-bongga-orange/5 text-bongga-orange shadow-sm'
                                    : 'border-transparent bg-bongga-light/50 text-bongga-dark/70 hover:bg-bongga-light hover:text-bongga-dark'
                                    }`}
                            >
                                <span className={isConnected ? "text-bongga-aqua" : "text-bongga-orange/50"}>
                                    {isConnected ? '●' : '○'}
                                </span>
                                {s.id}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-bongga-light">
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-2 border-bongga-light/80 rounded-xl px-5 py-4 focus:ring-0 focus:border-bongga-orange text-bongga-dark outline-none font-medium placeholder:text-bongga-dark/40 transition-colors"
                        placeholder="New environment alias (e.g. staging-bot)"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSession()}
                    />
                    <button
                        onClick={handleAddSession}
                        disabled={!newSessionName.trim()}
                        className="bg-bongga-orange hover:bg-bongga-orange/90 disabled:bg-bongga-light disabled:text-bongga-dark/40 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md hover:shadow-lg disabled:shadow-none"
                    >
                        <Plus className="w-5 h-5" /> Initialize Session
                    </button>
                </div>
            </div>

            {/* Active Session details pane */}
            {activeSessionId && (
                <SessionDetails
                    sessionId={activeSessionId}
                    onToast={(msg, type) => setToast({ message: msg, type })}
                    onDeleted={() => {
                        setActiveSessionId(null);
                        fetchSessions();
                    }}
                />
            )}
        </div>
    );
}

function SessionDetails({ sessionId, onToast, onDeleted }: { sessionId: string, onToast: (msg: string, type: 'success' | 'error') => void, onDeleted: () => void }) {
    const [data, setData] = useState<any>({});
    const [webhook, setWebhook] = useState('');
    const webhookInputDirty = useRef(false); // Prevents state overwrite while user is typing
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const refreshData = async () => {
        try {
            // Avoid spamming requests if session got unmounted or deleted before
            const res = await fetch(`/api/sessions/${sessionId}/status`);
            if (!res.ok) return;
            const body = await res.json();
            setData(body);

            // Only update local webhook state if the user hasn't typed anything yet
            if (!webhookInputDirty.current && body.webhookUrl !== webhook) {
                setWebhook(body.webhookUrl || '');
            }
        } catch (e) { }
    };

    useEffect(() => {
        // Reset dirty state when changing sessions
        webhookInputDirty.current = false;
        refreshData();
        const interval = setInterval(refreshData, 3000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const handleWebhookChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        webhookInputDirty.current = true;
        setWebhook(e.target.value);
    };

    const saveWebhook = async () => {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webhookUrl: webhook })
            });
            if (res.ok) {
                webhookInputDirty.current = false; // Mark sync
                onToast('Webhook configuration saved', 'success');
            } else {
                onToast('Failed to save webhook routing', 'error');
            }
        } catch (err: any) {
            onToast('Network error saving webhook URL', 'error');
        }
    };

    const executeDelete = async () => {
        setShowDeleteConfirm(false);
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
            if (res.ok) {
                onToast('Session terminated entirely', 'success');
                onDeleted();
            } else {
                onToast('Could not delete session', 'error');
            }
        } catch (e) {
            onToast('Network error on deletion', 'error');
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg p-8 space-y-10 border border-bongga-light animate-[fadeInUp_0.4s_ease-out]">
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-bongga-dark/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-6 border border-bongga-light transform transition-all scale-100">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl flex items-center justify-center gap-2 text-bongga-dark font-bold">
                            Terminate Session?
                        </h3>
                        <p className="text-bongga-dark/70 text-base">
                            Are you sure you want to completely delete session <strong>'{sessionId}'</strong>? This revokes the API key immediately and disconnects WhatsApp.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                            >
                                Terminate
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-bongga-dark flex items-center gap-3">
                    Session Workspace <span className="text-bongga-orange font-mono font-medium opacity-80 pl-2 border-l-2 border-bongga-orange">{sessionId}</span>
                </h2>

                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center gap-2 text-red-500 hover:text-white border border-red-200 hover:border-red-500 hover:bg-red-500 px-5 py-2.5 rounded-xl font-semibold transition-colors bg-red-50/50"
                >
                    <Trash2 className="w-4 h-4" /> Terminate Session
                </button>
            </div>

            {/* Status Viewport */}
            {data.status === 'connected' ? (
                <div className="bg-bongga-aqua/10 border-2 border-bongga-aqua/30 text-bongga-aqua font-bold p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-3 shadow-inner">
                    <Check className="w-10 h-10 bg-bongga-aqua text-white rounded-full p-2" />
                    Connection Established & Active
                </div>
            ) : data.status === 'qr' && data.qr ? (
                <div className="bg-bongga-gold/5 border-2 border-bongga-gold/20 p-8 rounded-2xl flex flex-col items-center gap-6">
                    <div className="space-y-2 text-center">
                        <p className="font-bold text-bongga-dark text-lg">Waiting for WhatsApp link</p>
                        <p className="text-bongga-dark/70 text-sm max-w-sm mx-auto">Open WhatsApp on your phone, tap Menu or Settings and select Linked Devices. Point your camera at this code.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md">
                        <img src={data.qr} alt="Scan to connect" className="w-64 h-64" />
                    </div>
                </div>
            ) : (
                <div className="bg-bongga-light/50 border border-bongga-light text-bongga-dark/60 p-10 rounded-2xl flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-bongga-orange/60" />
                    <p className="font-medium tracking-wide">Orchestrating Baileys Socket... Please wait.</p>
                </div>
            )}

            {/* Developer Code Snippet */}
            <div className="bg-[#1e1e1e] p-6 rounded-2xl shadow-inner border border-[#333] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-bongga-orange"></div>
                <h4 className="text-bongga-dark/40 font-bold uppercase text-xs tracking-wider absolute top-4 right-6 bg-white/10 px-3 py-1 rounded-full text-white/70">
                    curl execution
                </h4>

                <div className="font-mono text-[13px] md:text-sm text-gray-300 leading-relaxed overflow-x-auto pt-6 pb-2">
                    <span className="text-bongga-aqua font-bold mr-2">curl</span>
                    <span className="text-gray-400">-X POST</span>
                    <span className="text-bongga-orange ml-2">http://127.0.0.1:4321/api/v1/sessions/{sessionId}/send-message</span> \
                    <br />
                    &nbsp;&nbsp;<span className="text-gray-400">-H</span> <span className="text-bongga-gold">"Content-Type: application/json"</span> \
                    <br />
                    &nbsp;&nbsp;<span className="text-gray-400">-H</span> <span className="text-bongga-gold">"Authorization: Bearer YOUR_API_KEY"</span> \
                    <br />
                    &nbsp;&nbsp;<span className="text-gray-400">-d</span> <span className="text-green-300">'&#123;"number": "57300XXXXXXXX", "message": "Triggered by external system"&#125;'</span>
                </div>
            </div>

            {/* Webhook Settings */}
            <div className="space-y-5 bg-bongga-light/30 p-8 rounded-2xl border border-bongga-light/60">
                <div>
                    <h3 className="text-lg font-bold text-bongga-dark">Incoming Request Routing</h3>
                    <p className="text-bongga-dark/60 text-sm mt-1">Send inbound WhatsApp messages directly into your n8n workflow URL</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                    <input
                        className="flex-1 bg-white border-2 border-bongga-light/80 rounded-xl px-5 py-3 outline-none focus:border-bongga-aqua font-mono text-sm shadow-sm transition-colors text-bongga-dark"
                        placeholder="https://n8n-webhook-domain.com/webhook-path"
                        value={webhook}
                        onChange={handleWebhookChange}
                    />
                    <button
                        onClick={saveWebhook}
                        className="bg-bongga-aqua hover:bg-[#5b9569] text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md"
                    >
                        <Save className="w-5 h-5" /> Update Path
                    </button>
                </div>
            </div>
        </div>
    );
}
