
import React, { useState } from 'react';
import { auth } from '../services/firebase';
import firebase from 'firebase/compat/app';
import { createPlayerProfile } from '../services/playerService';
import Button from './common/Button';
import { getFirebaseErrorMessage } from '../utils/errors';
import { useGameConfig } from '../hooks/useGameConfig';
import { useContentConfig } from '../hooks/useContentConfig';
import { useRealtime } from '../hooks/useRealtime';

const GoogleIcon: React.FC = () => (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
);

const GameLogo: React.FC = () => (
    <svg 
        viewBox="0 0 512 512" 
        className="w-16 h-16 sm:w-24 sm:h-24 mb-2 animate-bounce drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FCD34D" /> {/* yellow-300 */}
                <stop offset="100%" stopColor="#F59E0B" /> {/* yellow-500 */}
            </linearGradient>
            <linearGradient id="beakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F97316" /> {/* orange-500 */}
                <stop offset="100%" stopColor="#C2410C" /> {/* orange-700 */}
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        
        {/* Outer Glow */}
        <circle cx="256" cy="256" r="230" fill="rgba(255, 255, 255, 0.1)" filter="url(#glow)" />

        {/* Body */}
        <circle cx="256" cy="256" r="192" fill="url(#bodyGrad)" stroke="black" strokeWidth="12" />

        {/* Belly Patch */}
        <path
            d="M 140 360 Q 256 420 372 360 Q 256 460 140 360"
            fill="#FFF7ED"
            opacity="0.9"
        />

        {/* Eyes Container */}
        <g transform="translate(0, -20)">
            {/* Left Eye */}
            <circle cx="190" cy="220" r="50" fill="white" stroke="black" strokeWidth="8" />
            <circle cx="200" cy="220" r="18" fill="black" />
            {/* Right Eye */}
            <circle cx="322" cy="220" r="50" fill="white" stroke="black" strokeWidth="8" />
            <circle cx="312" cy="220" r="18" fill="black" />
            
            {/* Angry Eyebrows */}
            <path d="M 120 160 L 230 200" stroke="black" strokeWidth="16" strokeLinecap="round" />
            <path d="M 392 160 L 282 200" stroke="black" strokeWidth="16" strokeLinecap="round" />
        </g>

        {/* Beak */}
        <g transform="translate(0, 30)">
            <path 
                d="M 190 240 L 322 240 L 256 340 Z" 
                fill="url(#beakGrad)" 
                stroke="black" 
                strokeWidth="8" 
                strokeLinejoin="round"
            />
            {/* Beak Highlight */}
            <path d="M 210 250 L 302 250 L 256 260 Z" fill="rgba(255,255,255,0.3)" />
        </g>

        {/* Wings - stylized */}
        <path d="M 64 256 Q 30 200 64 180" stroke="black" strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M 448 256 Q 482 200 448 180" stroke="black" strokeWidth="12" strokeLinecap="round" fill="none" />
    </svg>
);

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const config = useGameConfig();
  const { lobbyBackground } = useContentConfig();
  const { patchVersion } = useRealtime();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
      if (auth.currentUser) {
        await createPlayerProfile(auth.currentUser, config.DAILY_LOGIN_BONUS_COINS);
      }
    } catch (error: any) {
      setError(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const result = await auth.signInWithEmailAndPassword(email, password);
        if (result.user) {
          await createPlayerProfile(result.user, config.DAILY_LOGIN_BONUS_COINS);
        }
      } else {
        if (!displayName.trim()) {
          setError("Please enter a username.");
          setLoading(false);
          return;
        }
        const result = await auth.createUserWithEmailAndPassword(email, password);
        if (result.user) {
          await result.user.updateProfile({ displayName });
          await createPlayerProfile(result.user, config.DAILY_LOGIN_BONUS_COINS);
        }
      }
    } catch (error: any) {
      setError(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setDisplayName('');
    setEmail('');
    setPassword('');
  }

  return (
    <div className="flex flex-col sm:flex-row h-full w-full overflow-hidden bg-gray-900">
      
      {/* Compact Hero Banner */}
      <div className="w-full h-auto min-h-[30%] sm:h-full sm:w-5/12 lg:w-1/2 relative flex items-center justify-center bg-black overflow-hidden flex-shrink-0">
          {/* Server & Version Info */}
          <div className="absolute top-2 left-2 z-20">
              <div className="bg-black/40 backdrop-blur-sm px-2 py-1 border border-yellow-400/30 rounded-md shadow-lg">
                <p className="font-pixel text-[8px] text-yellow-400">🇧🇩 BD SERVER</p>
                <p className="font-pixel text-[7px] text-gray-300">VER: v{patchVersion}.0</p>
              </div>
          </div>

          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${lobbyBackground})` }}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-transparent via-black/20 to-gray-900" />
          
          {/* Hero Content - Compact for portrait */}
          <div className="relative z-10 text-center flex flex-col items-center justify-center py-2 screen-enter">
             <GameLogo />
             <h1 className="text-xl sm:text-4xl font-pixel text-yellow-400 leading-tight" style={{ textShadow: '4px 4px 0 #000, 0 0 20px rgba(250,204,21,0.5)' }}>
                BIRD CLASH FEVER
             </h1>
             <p className="hidden sm:block mt-2 text-sm sm:text-lg text-white font-bold tracking-[0.3em] uppercase opacity-90">
                Enter the Arena
             </p>
          </div>
      </div>

      {/* Login Form */}
      <div className="w-full flex-1 sm:w-7/12 lg:w-1/2 bg-gray-900 flex items-center justify-center p-4 relative overflow-y-auto">
         {/* Subtle pattern background for the form side */}
         <div className="absolute inset-0 opacity-5 pointer-events-none" 
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}>
         </div>

         <div className="w-full max-w-xs sm:max-w-sm z-10 relative screen-enter">
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-gray-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)]">
                <h2 className="text-lg sm:text-2xl font-bold text-white mb-0.5 text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-center text-gray-400 text-[10px] mb-3 sm:mb-4">{isLogin ? 'Sign in to continue your journey' : 'Join the battle today!'}</p>

                <form onSubmit={handleEmailAuth} className="space-y-2">
                    {!isLogin && (
                        <div className="relative group">
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Username"
                                className="pixel-input w-full pl-3 pr-3 py-1.5 bg-gray-900/80 border-gray-600 focus:border-yellow-400 transition-colors rounded-lg text-xs"
                                required
                            />
                        </div>
                    )}
                    <div className="relative group">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="pixel-input w-full pl-3 pr-3 py-1.5 bg-gray-900/80 border-gray-600 focus:border-yellow-400 transition-colors rounded-lg text-xs"
                            required
                        />
                    </div>
                    <div className="relative group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="pixel-input w-full pl-3 pr-3 py-1.5 bg-gray-900/80 border-gray-600 focus:border-yellow-400 transition-colors rounded-lg text-xs"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full !py-1.5 !text-xs !font-bold !rounded-lg shadow-lg mt-1"
                        variant="primary"
                    >
                        {loading ? <span className="animate-pulse">Loading...</span> : (isLogin ? 'LOGIN' : 'SIGN UP')}
                    </Button>
                </form>

                {error && <div className="mt-2 p-1.5 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-[10px] text-center">{error}</div>}
                
                <div className="flex items-center justify-center mt-2 mb-2">
                    <button onClick={toggleAuthMode} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors hover:underline">
                        {isLogin ? 'New here? Create an account' : 'Already have an account? Login'}
                    </button>
                </div>

                <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-gray-700"></div>
                    <span className="flex-shrink mx-3 text-gray-500 text-[9px] uppercase tracking-wider">Or continue with</span>
                    <div className="flex-grow border-t border-gray-700"></div>
                </div>
                
                <Button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center !py-1.5 !text-xs !bg-white !text-black hover:!bg-gray-200 !border-none !rounded-lg shadow-md"
                    variant="secondary"
                >
                    <GoogleIcon />
                    Google
                </Button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AuthScreen;
