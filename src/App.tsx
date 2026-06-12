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
import { Loader2, Film, ShieldAlert, CheckCircle2, Tv, Play, ChevronRight, HelpCircle, Plus, Minus, ChevronDown, ChevronUp, Globe, X, Smartphone, Sparkles, Smile, ArrowDownCircle } from 'lucide-react';

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
          <div className="w-full relative">
            
            {/* HERO HERO CONTAINER BLOCK WITH SLANTED BACKGROUND GRID */}
            <div 
              className="relative w-full min-h-[660px] md:min-h-[760px] border-b-8 border-[#232323] flex flex-col justify-between overflow-hidden"
            >
              {/* Slanted Background Grid mirroring Netflix.com design */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div 
                  className="w-[150%] h-[150%] -translate-x-[15%] -translate-y-[20%] grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 transform rotate-12 opacity-40 select-none"
                >
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="aspect-[2/3] w-full bg-neutral-900 rounded-md overflow-hidden border border-neutral-800 shadow-md"
                    >
                      <img 
                        src={`https://images.unsplash.com/photo-${[
                          '1618005182384-a83a8bd57fbe',
                          '1574375927938-d5a98e8edd85',
                          '1536440136628-849c177e76a1',
                          '1489599849927-2ee91cede3ba',
                          '1517604931442-7e0c8ed2963c',
                          '1542204172-e7052809a920',
                          '1594909122845-11baa439b7bf',
                          '1585647347483-22b66260dffd',
                          '1598897135837-143953defdb5',
                          '1509198397868-475647b2a1e5',
                          '1535016120720-40c646be5580',
                          '1568832359672-e36cf5d74f54'
                        ][i % 12]}?w=350&auto=format&fit=crop`}
                        alt="poster background card"
                        className="w-full h-full object-cover grayscale brightness-[0.7] focus:outline-none"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
                {/* Dark Vignette radial and linear gradient overlay */}
                <div 
                  className="absolute inset-0 z-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 65%, rgba(0,0,0,0.98) 100%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%)'
                  }}
                />
              </div>
              
              {/* Header Floating Segment */}
              <header className="px-6 md:px-24 py-6 flex items-center justify-between max-w-7xl w-full mx-auto z-20">
                <h1 className="text-[#E50914] font-black text-3xl md:text-5xl tracking-tighter select-none font-sans filter drop-shadow">
                  NETFLIX
                </h1>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <select className="bg-black/60 border border-neutral-600 rounded text-xs px-8 py-1.5 font-medium text-white appearance-none cursor-pointer focus:outline-none focus:border-white">
                      <option>English</option>
                      <option>Hindi</option>
                    </select>
                    <Globe className="w-3.5 h-3.5 text-neutral-300 absolute left-2.5 top-2" />
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
              <div className="flex-1 flex flex-col justify-center items-center text-center px-4 max-w-4xl mx-auto z-20 pt-12 pb-16 space-y-5">
                
                {authError && (
                  <div className="bg-red-950/70 border border-red-500/50 text-red-200 text-xs md:text-sm px-4 py-3 rounded-md max-w-md mx-auto flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
                    <span>{authError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight md:leading-none text-white max-w-4xl text-center">
                    Unlimited movies, TV shows, and more
                  </h2>
                  <p className="text-lg md:text-2xl font-bold text-white">
                    Starts at ₹149. Cancel at any time.
                  </p>
                  <p className="text-sm md:text-lg text-neutral-300 max-w-2xl mx-auto">
                    Ready to watch? Enter your email to create or restart your membership.
                  </p>
                </div>

                {/* Lead Form */}
                <form 
                  onSubmit={handleGetStarted} 
                  className="w-full max-w-[650px] flex flex-col sm:flex-row gap-2 mt-4"
                >
                  <input 
                    type="email" 
                    placeholder="Email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 bg-black/40 border border-neutral-600 focus:border-white focus:outline-none rounded text-white px-5 py-4 text-base transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-[#E50914] hover:bg-[#C11119] text-white font-bold text-lg md:text-2xl px-6 md:px-8 py-3.5 rounded flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    Get Started
                    <ChevronRight className="w-6 h-6 shrink-0" />
                  </button>
                </form>

              </div>

              {/* Arc Divider Overlay shadow */}
              <div className="w-full h-8 bg-gradient-to-t from-black to-transparent z-20"></div>
            </div>

            {/* NEW ADDITION: SECTION: TRENDING NOW (Based on Screenshot 2) */}
            <div className="w-full bg-black py-12 border-b-8 border-[#232323]">
              <div className="max-w-7xl mx-auto px-6 md:px-24">
                
                {/* Title & Dropdowns segment */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    Trending Now
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <select className="bg-neutral-900 border border-neutral-700 text-white rounded px-4 py-1.5 pr-8 text-xs font-semibold appearance-none cursor-pointer focus:outline-none">
                        <option>India</option>
                        <option>Global</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2 pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select className="bg-neutral-900 border border-neutral-700 text-white rounded px-4 py-1.5 pr-8 text-xs font-semibold appearance-none cursor-pointer focus:outline-none">
                        <option>Movies</option>
                        <option>TV Shows</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Row of Horizontal Cards with Outline Rank Overlays */}
                <div className="overflow-x-auto scrollbar-hide flex gap-12 py-4 pl-6 select-none cursor-grab active:cursor-grabbing pb-8">
                  {[
                    {
                      rank: 1,
                      title: "Maa Behen",
                      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop"
                    },
                    {
                      rank: 2,
                      title: "Teach You A Lesson",
                      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500&auto=format&fit=crop"
                    },
                    {
                      rank: 3,
                      title: "Kara",
                      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&auto=format&fit=crop"
                    },
                    {
                      rank: 4,
                      title: "Dhurandhar",
                      image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop"
                    },
                    {
                      rank: 5,
                      title: "Hawaii Five-O",
                      image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop"
                    },
                    {
                      rank: 6,
                      title: "Berlin Connection",
                      image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop"
                    }
                  ].map((movie) => (
                    <div 
                      key={movie.rank} 
                      onClick={() => setShowSignInCard(true)}
                      className="relative shrink-0 w-[140px] md:w-[170px] aspect-[2/3] group cursor-pointer animate-fade-in"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-full h-full rounded-lg overflow-hidden border border-neutral-800 shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:border-neutral-500">
                        <img 
                          src={movie.image} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {/* Red Netflix-style ribbon overlay */}
                        <div className="absolute top-2 left-2 bg-[#E50914] text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter">
                          N
                        </div>
                      </div>

                      {/* Rank Number Overlay */}
                      <span 
                        className="absolute -left-8 -bottom-5 text-[110px] md:text-[150px] font-black leading-none pointer-events-none select-none tracking-tighter"
                        style={{
                          WebkitTextStroke: '4px rgba(130, 130, 130, 0.85)',
                          color: '#000000',
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {movie.rank}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* NEW ADDITION: SECTION: MORE REASONS TO JOIN (Based on Screenshot 2) */}
            <div className="w-full bg-black py-16 border-b-8 border-[#232323]">
              <div className="max-w-7xl mx-auto px-6 md:px-24">
                
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-8">
                  More reasons to join
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1 */}
                  <div className="relative rounded-2xl p-6 min-h-[220px] flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#101323] via-[#141a36] to-[#120F1D] border border-neutral-900 shadow">
                    <div>
                      <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Enjoy on your TV
                      </h4>
                      <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                        Watch on smart TVs, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray players and more.
                      </p>
                    </div>
                    {/* Artistic neon-tv icon container */}
                    <div className="absolute bottom-4 right-4 bg-gradient-to-br from-pink-500/20 to-purple-500/20 p-3 rounded-full border border-pink-500/30 flex items-center justify-center">
                      <Tv className="w-6 h-6 text-pink-400" />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="relative rounded-2xl p-6 min-h-[220px] flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#101323] via-[#141a36] to-[#120F1D] border border-neutral-900 shadow">
                    <div>
                      <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Download shows
                      </h4>
                      <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                        Save your favourites easily and always have something to watch offline.
                      </p>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-3 rounded-full border border-blue-500/30 flex items-center justify-center">
                      <ArrowDownCircle className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="relative rounded-2xl p-6 min-h-[220px] flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#101323] via-[#141a36] to-[#120F1D] border border-neutral-900 shadow">
                    <div>
                      <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Watch everywhere
                      </h4>
                      <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                        Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV.
                      </p>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 p-3 rounded-full border border-purple-500/30 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="relative rounded-2xl p-6 min-h-[220px] flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#101323] via-[#141a36] to-[#120F1D] border border-neutral-900 shadow">
                    <div>
                      <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">
                        Profiles for kids
                      </h4>
                      <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                        Send kids on adventures with their favourite characters in a space made just for them—free.
                      </p>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 p-3 rounded-full border border-orange-500/30 flex items-center justify-center">
                      <Smile className="w-6 h-6 text-orange-400" />
                    </div>
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
