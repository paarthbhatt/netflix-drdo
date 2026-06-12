import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, LogOut, Settings, RefreshCw, X, User } from 'lucide-react';
import { ViewerProfile } from '../types';

interface NavbarProps {
  currentProfile: ViewerProfile;
  onSearchChange: (search: string) => void;
  onNavigate: (tab: 'home' | 'watchlist' | 'kids') => void;
  activeTab: 'home' | 'watchlist' | 'kids';
  onSwitchProfile: () => void;
  onManageAccount: () => void;
  onSignOut: () => void;
}

export default function Navbar({
  currentProfile,
  onSearchChange,
  onNavigate,
  activeTab,
  onSwitchProfile,
  onManageAccount,
  onSignOut,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Monitor screen scroll to change navbar background from transparent to solid black
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSearchChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearchChange(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearchChange('');
    setIsSearchOpen(false);
  };

  // Alert simulation matching premium notification stream
  const mockNotifications = [
    { id: 1, title: 'New Arrival: Stars of Circuit Breakers', time: 'Just now', unread: true },
    { id: 2, title: 'Invoice Paid: Plan Standard Renewed', time: '1 hour ago', unread: false },
    { id: 3, title: 'Top 10 in your area: Stranger Things', time: '1 day ago', unread: false },
  ];

  return (
    <nav 
      id="navbar-root"
      className={`fixed top-0 w-full z-40 transition-colors duration-500 flex items-center justify-between px-4 md:px-12 py-4 select-none ${
        isScrolled ? 'bg-black shadow-lg border-b border-neutral-900' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      {/* Left side links */}
      <div className="flex items-center gap-4 md:gap-10">
        <h1 
          onClick={() => onNavigate('home')} 
          className="text-red-600 font-extrabold text-2xl md:text-3xl tracking-tighter cursor-pointer font-sans active:opacity-85 select-none"
        >
          NETFLIX
        </h1>

        <ul className="hidden sm:flex items-center gap-6 text-sm text-[13px] font-medium tracking-wide">
          <li 
            onClick={() => onNavigate('home')}
            className={`cursor-pointer transition-colors hover:text-[#b3b3b3] ${activeTab === 'home' ? 'text-white' : 'text-neutral-300'}`}
          >
            Home
          </li>
          <li 
            onClick={() => onNavigate('watchlist')}
            className={`cursor-pointer transition-colors hover:text-[#b3b3b3] ${activeTab === 'watchlist' ? 'text-white' : 'text-neutral-300'}`}
          >
            My List
          </li>
          {!currentProfile.isKids && (
            <li 
              onClick={() => onNavigate('kids')}
              className={`cursor-pointer transition-colors hover:text-[#b3b3b3] ${activeTab === 'kids' ? 'text-white' : 'text-neutral-300'}`}
            >
              Kids Zone
            </li>
          )}
        </ul>
      </div>

      {/* Right side buttons */}
      <div className="flex items-center gap-4 md:gap-6">
        
        {/* Animated Search input bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center relative">
          <button
            id="search-button-trigger"
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="text-white hover:text-[#b3b3b3] cursor-pointer p-1.5 focus:outline-none focus:ring-0"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 flex items-center ${isSearchOpen ? 'w-40 md:w-56 ml-1.5 opacity-100' : 'w-0 opacity-0'}`}>
            <input
              id="navbar-search-input"
              type="text"
              placeholder="Titles, people, genres..."
              value={searchQuery}
              onChange={handleSearchChangeLocal}
              className="bg-[#141414]/90 border border-neutral-700 text-white rounded px-2.5 py-1 text-xs font-sans w-full focus:outline-none focus:border-red-600 focus:ring-0"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={clearSearch} 
                className="absolute right-2 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Kids label if profiles filters isKids */}
        {currentProfile.isKids && (
          <span className="text-sky-400 font-bold border border-sky-400/30 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider select-none bg-sky-950/20">
            Kids Mode
          </span>
        )}

        {/* Dynamic Alerts Dropdown */}
        <div className="relative">
          <button 
            id="notifications-dropdown-trigger"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsDropdownOpen(false);
            }}
            className="text-white hover:text-[#b3b3b3] p-1.5 cursor-pointer relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          </button>

          {isNotificationsOpen && (
            <div 
              id="notifications-list"
              className="absolute right-0 mt-3 w-72 bg-black border border-neutral-800 rounded shadow-2xl py-2 z-50 text-xs text-neutral-300 animate-slide-in"
            >
              <div className="px-4 py-2 border-b border-neutral-800 font-bold text-white uppercase tracking-wider pb-1">
                Notifications
              </div>
              <div className="max-y-64 overflow-y-auto">
                {mockNotifications.map((notif) => (
                  <div key={notif.id} className="px-4 py-3 hover:bg-neutral-900 border-b border-neutral-900 last:border-0 cursor-pointer">
                    <p className={`font-medium ${notif.unread ? 'text-white' : 'text-neutral-300'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-neutral-500 block mt-1">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown switch menu of Viewer Profiles */}
        <div className="relative">
          <div 
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setIsNotificationsOpen(false);
            }}
            id="navbar-profile-trigger"
            className="flex items-center gap-1.5 cursor-pointer select-none group"
          >
            {/* Minimal viewer badge */}
            <div className={`w-8 h-8 rounded text-white font-extrabold text-sm uppercase flex items-center justify-center ${currentProfile.avatar}`}>
              {currentProfile.name.slice(0, 2)}
            </div>
            <ChevronDown className={`w-4 h-4 text-white group-hover:text-[#b3b3b3] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDropdownOpen && (
            <div 
              id="navbar-profile-dropdown"
              className="absolute right-0 mt-3 w-56 bg-black border border-neutral-800 rounded shadow-2xl text-sm overflow-hidden z-50 animate-slide-in"
            >
              {/* Profile header visual */}
              <div className="px-4 py-3 bg-neutral-900/60 flex items-center gap-2.5 border-b border-neutral-900 select-none">
                <div className={`w-6 h-6 rounded text-white font-bold text-xs uppercase flex items-center justify-center ${currentProfile.avatar}`}>
                  {currentProfile.name.slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-white truncate text-xs">{currentProfile.name}</p>
                  <span className="text-[10px] text-neutral-500">Active Viewer</span>
                </div>
              </div>

              {/* Action items */}
              <div className="py-1">
                <button
                  id="navbar-switch-profiles"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSwitchProfile();
                  }}
                  className="w-full text-left px-4 py-2.5 text-neutral-300 hover:bg-neutral-900 hover:text-white flex items-center gap-2.5 cursor-pointer text-xs"
                >
                  <RefreshCw className="w-4 h-4 text-neutral-400" />
                  Switch Profiles
                </button>

                <button
                  id="navbar-manage-account"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onManageAccount();
                  }}
                  className="w-full text-left px-4 py-2.5 text-neutral-300 hover:bg-neutral-900 hover:text-white flex items-center gap-2.5 cursor-pointer text-xs"
                >
                  <Settings className="w-4 h-4 text-neutral-400" />
                  Account & Billing
                </button>
              </div>

              {/* Separator sign out key */}
              <div className="border-t border-neutral-900 py-1 bg-neutral-950/40">
                <button
                  id="navbar-sign-out"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSignOut();
                  }}
                  className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-neutral-900 hover:text-red-300 flex items-center gap-2.5 cursor-pointer text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4 text-red-400/80" />
                  Sign Out Netflix
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
