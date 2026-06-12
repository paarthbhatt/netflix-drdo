import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { UserAccount, ViewerProfile, Movie } from './types';
import { movies } from './moviesData';

// Subcomponents
import SubscriptionPaywall from './components/SubscriptionPaywall';
import ProfileSelector from './components/ProfileSelector';
import Navbar from './components/Navbar';
import Billboard from './components/Billboard';
import MovieRow from './components/MovieRow';
import MovieDetailsModal from './components/MovieDetailsModal';
import VideoPlayer from './components/VideoPlayer';
import ManageAccountModal from './components/ManageAccountModal';

// Icons
import { Loader2, Film, ShieldAlert, CheckCircle2, Tv, Play, ChevronRight, HelpCircle, Plus, Minus, ChevronDown, ChevronUp, Globe, X } from 'lucide-react';

export default function App() {
  // Authentication & Session
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [authError, setAuthError] = useState('');

  // Domain states
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [activeProfile, setActiveProfile] = useState<ViewerProfile | null>(null);

  // Home stream navigation and filters
  const [activeTab, setActiveTab] = useState<'home' | 'watchlist' | 'kids'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected overlays models
  const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [showBillingPortal, setShowBillingPortal] = useState(false);

  // Landing Page Interactive States
  const [showSignInCard, setShowSignInCard] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState('');

  // Monitor Google Authentication stream
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError('');

      if (currentUser) {
        // Authenticated successfully, fetch subscription statuses from Firestore
        const path = `users/${currentUser.uid}`;
        try {
          const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserAccount({
              uid: data.uid,
              email: data.email,
              subscribed: data.subscribed,
              plan: data.plan,
              billingCycle: data.billingCycle,
              nextPaymentDate: data.nextPaymentDate,
              cardLast4: data.cardLast4,
              cardBrand: data.cardBrand,
              status: data.status,
              createdAt: data.createdAt,
            });
          } else {
            setUserAccount(null);
          }
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.GET, path);
          } catch (adaptedError: any) {
            console.error('Initial login configuration parse error', adaptedError.message);
          }
        }
      } else {
        // Unauthenticated state
        setUserAccount(null);
        setActiveProfile(null);
        setSearchQuery('');
        setDetailsMovie(null);
        setPlayingMovie(null);
        setShowBillingPortal(false);
      }
      setIsLoadingSession(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoadingSession(true);
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Auth Failed: ', err);
      setAuthError('Authentication failed. Please verify that popup blockers are disabled or open in a new tab.');
      setIsLoadingSession(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign Out Failed:', err);
    }
  };

  const handleSubscriptionSuccess = (account: UserAccount) => {
    setUserAccount(account);
  };

  const handleSelectProfile = (profile: ViewerProfile) => {
    setActiveProfile(profile);
    setActiveTab('home');
    setSearchQuery('');
  };

  const handleSwitchProfile = () => {
    setActiveProfile(null);
    setSearchQuery('');
  };

  const handleUpdateAccount = (updatedAccount: UserAccount) => {
    setUserAccount(updatedAccount);
  };

  // Sync profile watchlist adjustments in Firestore
  const handleToggleWatchlist = async (movieId: string) => {
    if (!user || !activeProfile) return;

    const isBookmarked = activeProfile.watchlist?.includes(movieId);
    const updatedWatchlist = isBookmarked
      ? activeProfile.watchlist.filter((id) => id !== movieId)
      : [...activeProfile.watchlist, movieId];

    const path = `users/${user.uid}/profiles/${activeProfile.id}`;

    try {
      // Update database doc
      await updateDoc(doc(db, `users/${user.uid}/profiles`, activeProfile.id), {
        watchlist: updatedWatchlist,
      });

      // Update local state instantly for latency compensation
      setActiveProfile({
        ...activeProfile,
        watchlist: updatedWatchlist,
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (adaptedError: any) {
        console.error('Failed to sync watchlist change to cloud: ', adaptedError.message);
      }
    }
  };

  // Filter and prioritize movie results matching Active Viewer settings
  const getFilteredMovies = () => {
    let list = [...movies];

    if (!activeProfile) return [];

    // Rule 1: Parental Guidance Guard
    if (activeProfile.isKids) {
      list = list.filter((m) => m.isKids); // only kids movies
    }

    // Rule 2: Search input matching query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.genres.some((g) => g.toLowerCase().includes(q)) ||
          m.cast.some((c) => c.toLowerCase().includes(q)) ||
          m.overview.toLowerCase().includes(q)
      );
      return list;
    }

    // Rule 3: Nav tab filters
    if (activeTab === 'watchlist') {
      list = list.filter((m) => activeProfile.watchlist?.includes(m.id));
    } else if (activeTab === 'kids') {
      list = list.filter((m) => m.isKids);
    }

    return list;
  };

  const filteredMovies = getFilteredMovies();

  // Categories segments
  const trendingMovies = filteredMovies.filter((m) => m.isTrending);
  const popularMovies = filteredMovies.filter((m) => m.isPopular);
  const documentaryMovies = filteredMovies.filter((m) => m.genres.includes('Documentary'));
  const sciFiMovies = filteredMovies.filter((m) => m.genres.includes('Sci-Fi'));
  const actionMovies = filteredMovies.filter((m) => m.genres.includes('Action') || m.genres.includes('Thriller'));
  const romanceMovies = filteredMovies.filter((m) => m.genres.includes('Romance'));
  const fantasyMovies = filteredMovies.filter((m) => m.genres.includes('Fantasy') || m.genres.includes('Adventure'));

  const billboardFeaturedMovie = filteredMovies[0] || movies[0];

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white" id="main-loading-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto" />
          <p className="font-sans text-gray-500 text-sm tracking-widest uppercase">Initializing stream pipeline...</p>
        </div>
      </div>
    );
  }

  // --- RENDERING ROUTINE A: Unauthenticated State (Landing Sign-in) ---
  if (!user) {
    const FAQS = [
      {
        q: "What is Netflix?",
        a: "Netflix is a streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more on thousands of internet-connected devices.\n\nYou can watch as much as you want, whenever you want without a single commercial – all for one low monthly price. There's always something new to discover, and new TV shows and movies are added every week!"
      },
      {
        q: "How much does Netflix cost?",
        a: "Watch Netflix on your smartphone, tablet, Smart TV, laptop, or streaming device, all for one fixed monthly fee. Plans range from $6.99 to $22.99 a month. No extra costs, no contracts."
      },
      {
        q: "Where can I watch?",
        a: "Watch anywhere, anytime. Sign in with your Netflix account to watch instantly on the web from your personal computer or on any internet-connected device that offers the Netflix app, including smart TVs, smartphones, tablets, streaming media players and game consoles.\n\nYou can also download your favorite shows with the iOS or Android app. Use downloads to watch while you're on the go and without an internet connection. Take Netflix with you anywhere."
      },
      {
        q: "How do I cancel?",
        a: "Netflix is flexible. There are no pesky contracts and no commitments. You can easily cancel your account online in two clicks. There are no cancellation fees – start or stop your account anytime."
      },
      {
        q: "What can I watch on Netflix?",
        a: "Netflix has an extensive library of feature films, documentaries, TV shows, anime, award-winning Netflix originals, and more. Watch as much as you want, anytime you want."
      },
      {
        q: "Is Netflix good for kids?",
        a: "The Netflix Kids experience is included in your membership to give parents control while kids enjoy family-friendly TV shows and movies in their own space.\n\nKids profiles come with PIN-protected parental controls that let you restrict the maturity rating of content kids can watch and block specific titles you don't want kids to see."
      }
    ];

    const handleGetStarted = (e: React.FormEvent) => {
      e.preventDefault();
      // Fluid transition: transfer typed email into the login credentials experience
      setShowSignInCard(true);
    };

    return (
      <div className="min-h-screen bg-black text-white font-sans select-none overflow-x-hidden" id="landing-container">
        
        {/* --- STATE 1: RE-DESIGNED BRANDED SIGN IN CARD PAGE --- */}
        {showSignInCard ? (
          <div 
            className="min-h-screen w-full relative flex flex-col justify-between"
            style={{
              backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%), url("https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?w=1600&auto=format&fit=crop")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Nav Header */}
            <header className="px-6 md:px-16 py-6 flex items-center justify-between z-10">
              <h1 
                onClick={() => setShowSignInCard(false)}
                className="text-[#E50914] font-black text-3xl md:text-4xl tracking-tighter cursor-pointer hover:opacity-90 select-none transition-all"
              >
                NETFLIX
              </h1>
              <button 
                onClick={() => setShowSignInCard(false)}
                className="text-white hover:text-neutral-300 text-sm font-medium flex items-center gap-1 bg-neutral-900/40 border border-neutral-700/50 px-4 py-1.5 rounded transition-all"
              >
                Back to Home
              </button>
            </header>

            {/* Core Sign In Box */}
            <main className="flex-1 flex items-center justify-center p-4 z-10 pb-16">
              <div className="bg-black/85 md:bg-black/75 rounded-md px-8 md:px-16 py-12 md:py-16 max-w-[450px] w-full border border-neutral-950 shadow-2xl backdrop-blur-sm">
                
                <h2 className="text-3xl font-bold mb-7 text-white tracking-tight">Sign In</h2>
                
                {authError && (
                  <div className="bg-[#E87C03] text-white text-xs md:text-sm px-4 py-3 rounded-md mb-6 flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-white mt-0.5" />
                    <span className="leading-tight">{authError}</span>
                  </div>
                )}

                <form onSubmit={handleGoogleSignIn} className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="email" 
                      placeholder="Email or mobile number"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-[#161616]/90 border border-neutral-700 focus:border-white text-white rounded px-4 py-3 text-sm focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="relative group">
                    <input 
                      type="password" 
                      placeholder="Password (for demo, sign in with Google below)"
                      className="w-full bg-[#161616]/90 border border-neutral-700 focus:border-white text-white rounded px-4 py-3 text-sm focus:outline-none transition-colors"
                      disabled
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full bg-[#E50914] hover:bg-[#C11119] text-white font-semibold py-3.5 rounded text-sm transition-all shadow-lg active:scale-[0.99] cursor-pointer"
                  >
                    Legacy Sign In (Sandbox Mode)
                  </button>

                  <div className="text-center text-xs text-neutral-400 py-1 font-medium">OR</div>

                  {/* HIGH VALUE SECURE INSTANT AUTHENTICATION ACCESS */}
                  <button
                    type="button"
                    id="landing-google-signin-top"
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white text-neutral-900 hover:bg-neutral-100 font-bold py-3 px-4 rounded text-sm transition-all shadow flex items-center justify-center gap-2.5 active:scale-[0.99] cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>

                <div className="flex items-center justify-between text-xs text-neutral-400 mt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#E50914] rounded" />
                    Remember me
                  </label>
                  <a href="#help" className="hover:underline hover:text-neutral-300">Need help?</a>
                </div>

                <div className="mt-8 space-y-4">
                  <p className="text-sm text-neutral-500 font-sans">
                    New to Netflix?{' '}
                    <span 
                      onClick={() => setShowSignInCard(false)} 
                      className="text-white hover:underline cursor-pointer font-medium"
                    >
                      Sign up now
                    </span>.
                  </p>
                  <p className="text-xs text-neutral-500 font-sans leading-relaxed">
                    This page is protected by Google reCAPTCHA to ensure you're not a bot.{' '}
                    <span className="text-blue-500 hover:underline cursor-pointer">Learn more.</span>
                  </p>
                </div>

              </div>
            </main>

            {/* Subdued Footer */}
            <footer className="bg-black/85 border-t border-neutral-800/80 py-8 px-6 md:px-16 text-xs text-neutral-400 z-10">
              <div className="max-w-5xl mx-auto space-y-4">
                <p className="hover:underline cursor-pointer">Questions? Call 1-800-892-0000</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                  <span className="hover:underline cursor-pointer">FAQ</span>
                  <span className="hover:underline cursor-pointer">Help Center</span>
                  <span className="hover:underline cursor-pointer">Terms of Use</span>
                  <span className="hover:underline cursor-pointer">Privacy Policy</span>
                </div>
              </div>
            </footer>
          </div>
        ) : (
          /* --- STATE 2: HIGH-FIDELITY NETFLIX LANDING PAGE --- */
          <div className="w-full">
            
            {/* HERO HERO CONTAINER BLOCK */}
            <div 
              className="relative w-full h-[650px] md:h-[730px] border-b-8 border-[#232323]"
              style={{
                backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.9) 100%), url("https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?w=1600&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              
              {/* Header Floating Segment */}
              <header className="px-6 md:px-24 py-6 flex items-center justify-between max-w-7xl mx-auto">
                <h1 className="text-[#E50914] font-black text-3xl md:text-5.5xl tracking-tighter select-none font-sans filter drop-shadow">
                  NETFLIX
                </h1>
                
                <div className="flex items-center gap-4">
                  <div className="relative hidden sm:block">
                    <select className="bg-black/60 border border-neutral-600 rounded text-xs px-8 py-1.5 font-medium text-white appearance-none cursor-pointer focus:outline-none focus:border-white">
                      <option>English</option>
                      <option>Hindi</option>
                    </select>
                    <Globe className="w-3.5 h-3.5 text-neutral-300 absolute left-2.5 top-2.5" />
                  </div>
                  
                  <button
                    id="landing-google-signin-top"
                    onClick={() => setShowSignInCard(true)}
                    className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold text-xs md:text-sm px-4.5 py-1.5 rounded transition-all shadow select-none cursor-pointer active:scale-[0.98]"
                  >
                    Sign In
                  </button>
                </div>
              </header>

              {/* Main Landing Copy Content */}
              <div className="h-full flex flex-col justify-center items-center text-center px-4 max-w-4xl mx-auto -mt-16 md:-mt-24 space-y-5">
                
                {authError && (
                  <div className="bg-red-950/70 border border-red-500/50 text-red-200 text-xs md:text-sm px-4 py-3 rounded-md max-w-md mx-auto flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
                    <span>{authError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <h2 className="text-3xl md:text-5.5xl font-extrabold tracking-tight leading-tight md:leading-none text-white max-w-4xl text-center">
                    Unlimited movies, TV shows, and more
                  </h2>
                  <p className="text-lg md:text-2xl font-medium text-neutral-200">
                    Starts at $6.99. Cancel anytime.
                  </p>
                  <p className="text-sm md:text-lg text-neutral-300 max-w-2xl mx-auto">
                    Ready to watch? Enter your email to create or restart your membership.
                  </p>
                </div>

                {/* Simulated Lead Form */}
                <form 
                  onSubmit={handleGetStarted} 
                  className="w-full max-w-[650px] flex flex-col sm:flex-row gap-2 mt-4"
                >
                  <input 
                    type="email" 
                    placeholder="Email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 bg-black/65 border border-neutral-600 focus:border-white focus:outline-none rounded text-white px-5 py-4 text-base transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold text-lg md:text-2xl px-6 md:px-8 py-3.5 rounded flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    Get Started
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </form>

              </div>
            </div>

            {/* GRID OF ALTERNATING SHOWCASE ROWS */}
            <div className="w-full">
              
              {/* Feature Box 1 */}
              <div className="w-full bg-black py-16 md:py-20 border-b-8 border-[#232323]">
                <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Enjoy on your TV</h3>
                    <p className="text-base md:text-2xl text-neutral-300 leading-relaxed font-normal">
                      Watch on Smart TVs, Playstation, Xbox, Apple TV, Chromecast, Blu-ray players, and more.
                    </p>
                  </div>
                  <div className="flex-1 relative flex justify-center">
                    <div className="relative max-w-[480px]">
                      {/* Styled High quality screen overlay mock */}
                      <img 
                        src="https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop" 
                        alt="Tv display"
                        className="rounded border border-neutral-800 shadow-2xl relative z-10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-[8%] left-[13%] w-[74%] h-[56%] bg-red-600/10 blur-xl animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Box 2 */}
              <div className="w-full bg-black py-16 md:py-20 border-b-8 border-[#232323]">
                <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col-reverse md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 relative flex justify-center">
                    <div className="relative max-w-[360px] bg-neutral-900 rounded-xl p-4 border border-neutral-850 shadow-2xl">
                      <img 
                        src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop" 
                        alt="Stranger Things Poster"
                        className="rounded h-[220px] w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="mt-3.5 flex items-center justify-between px-2 bg-black/80 py-2 border border-neutral-800 rounded">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-11 bg-red-800 rounded"></div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">Stranger Things</p>
                            <p className="text-[10px] text-blue-500">Downloading...</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 border-2 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Download your shows to watch offline</h3>
                    <p className="text-base md:text-2xl text-neutral-300 leading-relaxed font-normal">
                      Save your favorites easily and always have something to watch.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Box 3 */}
              <div className="w-full bg-black py-16 md:py-20 border-b-8 border-[#232323]">
                <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Watch everywhere</h3>
                    <p className="text-base md:text-2xl text-neutral-300 leading-relaxed font-normal">
                      Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV.
                    </p>
                  </div>
                  <div className="flex-1 relative flex justify-center">
                    <div className="relative max-w-[480px]">
                      <img 
                        src="https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=500&auto=format&fit=crop" 
                        alt="Device compilation"
                        className="rounded border border-neutral-850 shadow-2xl relative z-10"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Box 4 */}
              <div className="w-full bg-black py-16 md:py-20 border-b-8 border-[#232323]">
                <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col-reverse md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 relative flex justify-center">
                    <div className="relative max-w-[400px] text-center space-y-4 bg-gradient-to-tr from-purple-950/20 to-blue-950/20 p-8 rounded-2xl border border-neutral-850 shadow-lg">
                      <div className="flex gap-4 justify-center">
                        <div className="w-20 h-20 rounded-lg bg-[#E50914] flex items-center justify-center font-bold text-3xl shadow">Kids</div>
                        <div className="w-20 h-20 rounded-lg bg-[#3F51B5] flex items-center justify-center font-bold text-3xl shadow opacity-70">Fun</div>
                        <div className="w-20 h-20 rounded-lg bg-[#4CAF50] flex items-center justify-center font-bold text-3xl shadow opacity-40">Play</div>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono">Profile Control Panel Mockups</p>
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Create profiles for kids</h3>
                    <p className="text-base md:text-2xl text-neutral-300 leading-relaxed font-normal">
                      Send kids on adventures with their favorite characters in a space made just for them—free with your membership.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* FREQUENTLY ASKED QUESTIONS (ACCORDION SECTION) */}
            <div className="w-full bg-black py-16 md:py-24 border-b-8 border-[#232323]">
              <div className="max-w-[815px] mx-auto px-4 space-y-12">
                <h3 className="text-3xl md:text-5xl font-black text-center tracking-tight leading-tight">
                  Frequently Asked Questions
                </h3>

                {/* FAQ List Accordions */}
                <div className="space-y-2.5">
                  {FAQS.map((faq, idx) => {
                    const isOpen = faqOpenIndex === idx;
                    return (
                      <div key={idx} className="bg-[#2D2D2D] hover:bg-[#414141] transition-colors overflow-hidden">
                        
                        {/* Header toggle */}
                        <button 
                          onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                          className="w-full px-6 py-6 flex items-center justify-between text-left cursor-pointer focus:outline-none select-none"
                        >
                          <span className="text-lg md:text-2xl font-medium tracking-tight text-white">{faq.q}</span>
                          {isOpen ? (
                            <X className="w-6 h-6 md:w-8 md:h-8 shrink-0 text-white" />
                          ) : (
                            <Plus className="w-6 h-6 md:w-8 md:h-8 shrink-0 text-white" />
                          )}
                        </button>

                        {/* Expandable answers body */}
                        <div 
                          className={`transition-all duration-300 ease-in-out px-6 ${
                            isOpen ? "max-h-[800px] py-6 border-t border-black/30 opacity-100" : "max-h-0 opacity-0 py-0 overflow-hidden"
                          }`}
                        >
                          <p className="text-base md:text-xl text-neutral-200 leading-relaxed font-normal whitespace-pre-wrap">
                            {faq.a}
                          </p>
                        </div>

                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-4 text-center">
                  <p className="text-sm md:text-lg text-neutral-300 max-w-xl mx-auto">
                    Ready to watch? Enter your email to create or restart your membership.
                  </p>
                  
                  {/* Repeat registration form */}
                  <form 
                    onSubmit={handleGetStarted} 
                    className="w-full max-w-[650px] flex flex-col sm:flex-row gap-2 mx-auto"
                  >
                    <input 
                      type="email" 
                      placeholder="Email address"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1 bg-black/65 border border-neutral-600 focus:border-white focus:outline-none rounded text-white px-5 py-4 text-base transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold text-lg md:text-2xl px-6 md:px-8 py-3.5 rounded flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      Get Started
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </form>
                </div>

              </div>
            </div>

            {/* FULL COMPREHENSIVE RESPONSIVE FOOTER */}
            <footer className="bg-black py-16 md:py-20 text-neutral-400 text-xs md:text-sm px-6">
              <div className="max-w-5xl mx-auto space-y-8">
                
                <p className="hover:underline cursor-pointer text-base">
                  Questions? Call 1-800-892-0000
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4">
                  <div className="space-y-3.5">
                    <p className="hover:underline cursor-pointer">FAQ</p>
                    <p className="hover:underline cursor-pointer">Investor Relations</p>
                    <p className="hover:underline cursor-pointer">Ways to Watch</p>
                    <p className="hover:underline cursor-pointer">Corporate Information</p>
                    <p className="hover:underline cursor-pointer">Only on Netflix</p>
                  </div>
                  
                  <div className="space-y-3.5">
                    <p className="hover:underline cursor-pointer">Help Center</p>
                    <p className="hover:underline cursor-pointer">Jobs</p>
                    <p className="hover:underline cursor-pointer">Terms of Use</p>
                    <p className="hover:underline cursor-pointer">Contact Us</p>
                  </div>

                  <div className="space-y-3.5">
                    <p className="hover:underline cursor-pointer">Account</p>
                    <p className="hover:underline cursor-pointer">Redeem Gift Cards</p>
                    <p className="hover:underline cursor-pointer">Privacy</p>
                    <p className="hover:underline cursor-pointer">Speed Test</p>
                  </div>

                  <div className="space-y-3.5">
                    <p className="hover:underline cursor-pointer">Media Center</p>
                    <p className="hover:underline cursor-pointer">Buy Gift Cards</p>
                    <p className="hover:underline cursor-pointer">Cookie Preferences</p>
                    <p className="hover:underline cursor-pointer">Legal Notices</p>
                  </div>
                </div>

                <div className="relative w-max mt-4">
                  <select className="bg-black border border-neutral-700 rounded text-xs px-8 py-2 font-medium text-white appearance-none cursor-pointer focus:outline-none">
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                  <Globe className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                </div>

                <p className="text-neutral-500 mt-6 cursor-default">
                  Netflix Sandbox Edition
                </p>

              </div>
            </footer>

          </div>
        )}

      </div>
    );
  }

  // --- RENDERING ROUTINE B: Authenticated but Unsubscribed (Paywall) ---
  if (!userAccount || !userAccount.subscribed) {
    return (
      <SubscriptionPaywall 
        onSubscriptionSuccess={handleSubscriptionSuccess}
        userEmail={user.email || ''}
      />
    );
  }

  // --- RENDERING ROUTINE C: Subscribed but Profile Selector active ---
  if (!activeProfile) {
    return (
      <ProfileSelector 
        userId={user.uid}
        onSelectProfile={handleSelectProfile}
      />
    );
  }

  // --- RENDERING ROUTINE D: Full Stream Platform App ---
  return (
    <div className="min-h-screen bg-black text-white relative font-sans select-none" id="stream-platform">
      <Navbar 
        currentProfile={activeProfile}
        onSearchChange={setSearchQuery}
        onNavigate={setActiveTab}
        activeTab={activeTab}
        onSwitchProfile={handleSwitchProfile}
        onManageAccount={() => setShowBillingPortal(true)}
        onSignOut={handleSignOut}
      />

      {/* Hero display block (only visible if not browsing listing tabs or search is not empty) */}
      {searchQuery.trim() === '' && activeTab === 'home' && billboardFeaturedMovie && (
        <Billboard 
          movie={billboardFeaturedMovie}
          onPlayClick={(m) => setPlayingMovie(m)}
          onInfoClick={(m) => setDetailsMovie(m)}
        />
      )}

      {/* Lists & Sliders */}
      <div className={`space-y-12 pb-24 ${searchQuery.trim() === '' && activeTab === 'home' ? '-mt-16 md:-mt-24 relative z-30' : 'pt-24'}`}>
        
        {/* Dynamic header if search/tab active */}
        {searchQuery.trim() !== '' && (
          <div className="px-4 md:px-12 text-sm text-neutral-400 font-sans flex items-center gap-1.5 py-4">
            Showing results for query: <strong className="text-white text-base">"{searchQuery}"</strong> ({filteredMovies.length} found)
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="px-4 md:px-12 text-sm text-neutral-400 font-sans flex items-center gap-1.5 py-4 border-b border-neutral-900 pb-2">
            My Bookmarked Stream Collection • <strong className="text-white">{filteredMovies.length} Titles</strong>
          </div>
        )}

        {/* If no titles match criteria, render cute empty notifier */}
        {filteredMovies.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-24 space-y-4" id="empty-stream-notif">
            <Film className="w-12 h-12 text-neutral-600 mx-auto animate-pulse" />
            <h3 className="text-white text-lg font-bold font-sans">No matching movies found</h3>
            <p className="text-gray-500 text-sm leading-normal max-w-xs mx-auto">
              {activeTab === 'watchlist' 
                ? 'Your watchlist is currently empty. Press the Plus badge on thumbnail cards to construct your watchlist list!'
                : 'Try refining your search text or navigating back to standard categories.'}
            </p>
            {activeTab === 'watchlist' && (
              <button 
                id="browse-home-empty"
                onClick={() => setActiveTab('home')}
                className="bg-red-600 px-4 py-2 rounded text-xs font-bold leading-normal text-white"
              >
                Browse Catalog
              </button>
            )}
          </div>
        ) : (
          /* Normal Category shelves layout */
          <>
            {searchQuery.trim() !== '' || activeTab === 'watchlist' ? (
              <MovieRow 
                title={searchQuery.trim() !== '' ? 'Search Results' : 'My Watchlist'}
                movies={filteredMovies}
                currentProfile={activeProfile}
                onMovieClick={(m) => setDetailsMovie(m)}
                onPlayClick={(m) => setPlayingMovie(m)}
                onToggleWatchlist={handleToggleWatchlist}
                rowId="filtered-grid"
              />
            ) : (
              /* Group shelves */
              <>
                <MovieRow 
                  title="Trending Now"
                  movies={trendingMovies}
                  currentProfile={activeProfile}
                  onMovieClick={(m) => setDetailsMovie(m)}
                  onPlayClick={(m) => setPlayingMovie(m)}
                  onToggleWatchlist={handleToggleWatchlist}
                  rowId="trending"
                />

                <MovieRow 
                  title="Popular on Netflix"
                  movies={popularMovies}
                  currentProfile={activeProfile}
                  onMovieClick={(m) => setDetailsMovie(m)}
                  onPlayClick={(m) => setPlayingMovie(m)}
                  onToggleWatchlist={handleToggleWatchlist}
                  rowId="popular"
                />

                <MovieRow 
                  title="Blockbuster Action & Thrillers"
                  movies={actionMovies}
                  currentProfile={activeProfile}
                  onMovieClick={(m) => setDetailsMovie(m)}
                  onPlayClick={(m) => setPlayingMovie(m)}
                  onToggleWatchlist={handleToggleWatchlist}
                  rowId="action"
                />

                <MovieRow 
                  title="Sci-Fi Thrillers"
                  movies={sciFiMovies}
                  currentProfile={activeProfile}
                  onMovieClick={(m) => setDetailsMovie(m)}
                  onPlayClick={(m) => setPlayingMovie(m)}
                  onToggleWatchlist={handleToggleWatchlist}
                  rowId="scifi"
                />

                <MovieRow 
                  title="Fantasy & Heroic Adventures"
                  movies={fantasyMovies}
                  currentProfile={activeProfile}
                  onMovieClick={(m) => setDetailsMovie(m)}
                  onPlayClick={(m) => setPlayingMovie(m)}
                  onToggleWatchlist={handleToggleWatchlist}
                  rowId="fantasy"
                />

                <MovieRow 
                  title="Romantic Stories & Comedies"
                  movies={romanceMovies}
                  currentProfile={activeProfile}
                  onMovieClick={(m) => setDetailsMovie(m)}
                  onPlayClick={(m) => setPlayingMovie(m)}
                  onToggleWatchlist={handleToggleWatchlist}
                  rowId="romance"
                />

                <MovieRow 
                  title="Docuseries & Documentaries"
                  movies={documentaryMovies}
                  currentProfile={activeProfile}
                  onMovieClick={(m) => setDetailsMovie(m)}
                  onPlayClick={(m) => setPlayingMovie(m)}
                  onToggleWatchlist={handleToggleWatchlist}
                  rowId="documents"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* --- OVERLAYS: Details modal --- */}
      {detailsMovie && (
        <MovieDetailsModal 
          movie={detailsMovie}
          currentProfile={activeProfile}
          onClose={() => setDetailsMovie(null)}
          onPlayClick={(m) => {
            setDetailsMovie(null);
            setPlayingMovie(m);
          }}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

      {/* --- OVERLAYS: Cinema video player --- */}
      {playingMovie && (
        <VideoPlayer 
          movie={playingMovie}
          onClose={() => setPlayingMovie(null)}
        />
      )}

      {/* --- OVERLAYS: Subscriptions billing account portal --- */}
      {showBillingPortal && userAccount && (
        <ManageAccountModal 
          account={userAccount}
          onClose={() => setShowBillingPortal(false)}
          onUpdateAccount={handleUpdateAccount}
        />
      )}
    </div>
  );
}
