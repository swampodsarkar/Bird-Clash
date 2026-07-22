import React, { useState, useEffect } from 'react';
import AuthScreen from './AuthScreen';
import Dashboard from './Dashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
    const [isPasskeyVerified, setIsPasskeyVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check session storage for passkey verification when the app loads
        try {
            const verified = sessionStorage.getItem('adminPasskeyVerified') === 'true';
            setIsPasskeyVerified(verified);
        } catch (e) {
            console.error("Could not access session storage:", e);
            setIsPasskeyVerified(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleLoginSuccess = () => {
        try {
            sessionStorage.setItem('adminPasskeyVerified', 'true');
            setIsPasskeyVerified(true);
        } catch (e) {
            console.error("Could not set session storage:", e);
            alert("Could not save session. Please enable cookies/storage and try again.");
        }
    };

    const handleLogout = () => {
        try {
            sessionStorage.removeItem('adminPasskeyVerified');
        } catch (e) {
            console.error("Could not remove session storage item:", e);
        }
        setIsPasskeyVerified(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </div>
        );
    }
    
    return (
        <>
            {isPasskeyVerified ? (
                <Dashboard onLogout={handleLogout} />
            ) : (
                <AuthScreen onLoginSuccess={handleLoginSuccess} />
            )}
            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                aria-label="Admin Notifications"
            />
        </>
    );
};

export default App;