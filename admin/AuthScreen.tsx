import React, { useState } from 'react';

interface AuthScreenProps {
    onLoginSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
    const [passkey, setPasskey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Simulate a small delay for UX
        setTimeout(() => {
            if (passkey === 'admin321') {
                onLoginSuccess();
            } else {
                setError('Incorrect passkey. Please try again.');
            }
            setLoading(false);
        }, 500);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-center text-white mb-2">Admin Panel</h1>
                    <p className="text-center text-gray-400 mb-6">Enter passkey to manage Clash Fever</p>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="passkey" className="sr-only">Passkey</label>
                            <input
                                id="passkey"
                                type="password"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 text-lg text-center text-gray-200 bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full px-4 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 transform active:scale-95"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : 'Unlock'}
                        </button>
                        {error && <p className="text-sm text-red-400 text-center pt-2">{error}</p>}
                    </form>
                </div>
                <p className="text-center text-xs text-gray-600 mt-8">Clash Fever &copy; SM Studio Inc.</p>
            </div>
        </div>
    );
};

export default AuthScreen;