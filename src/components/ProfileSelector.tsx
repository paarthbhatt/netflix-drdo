import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, Trash2, Loader2, Users } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ViewerProfile } from '../types';

interface ProfileSelectorProps {
  userId: string;
  onSelectProfile: (profile: ViewerProfile) => void;
}

const AVATAR_PRESETS = [
  'bg-blue-600',
  'bg-red-600',
  'bg-green-600',
  'bg-yellow-500',
  'bg-purple-600',
  'bg-pink-600',
];

export default function ProfileSelector({ userId, onSelectProfile }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<ViewerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dialog / Action overlays
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState(AVATAR_PRESETS[0]);
  const [newProfileIsKids, setNewProfileIsKids] = useState(false);

  const [editingProfile, setEditingProfile] = useState<ViewerProfile | null>(null);

  // Fetch profiles on load
  const loadProfiles = async () => {
    setIsLoading(true);
    setErrorMessage('');
    const path = `users/${userId}/profiles`;
    try {
      const snap = await getDocs(collection(db, path));
      const list: ViewerProfile[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          name: d.name,
          avatar: d.avatar,
          isKids: d.isKids,
          watchlist: d.watchlist || [],
          createdAt: d.createdAt,
        });
      });
      setProfiles(list);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (adaptedError: any) {
        setErrorMessage('Failed to load profiles. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [userId]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    if (profiles.length >= 5) {
      setErrorMessage('You can have a maximum of 5 watcher profiles.');
      setIsAddingProfile(false);
      return;
    }

    setErrorMessage('');
    const profileId = `profile_${Date.now()}`;
    const path = `users/${userId}/profiles/${profileId}`;

    try {
      const payload = {
        name: newProfileName,
        avatar: newProfileAvatar,
        isKids: newProfileIsKids,
        watchlist: [],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, `users/${userId}/profiles`, profileId), payload);
      setNewProfileName('');
      setNewProfileIsKids(false);
      setIsAddingProfile(false);
      await loadProfiles();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, path);
      } catch (adaptedError: any) {
        setErrorMessage('Failed to create profile. Security validation error.');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editingProfile.name.trim()) return;

    setErrorMessage('');
    const path = `users/${userId}/profiles/${editingProfile.id}`;

    try {
      await updateDoc(doc(db, `users/${userId}/profiles`, editingProfile.id), {
        name: editingProfile.name,
        avatar: editingProfile.avatar,
        isKids: editingProfile.isKids,
      });

      setEditingProfile(null);
      await loadProfiles();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch (adaptedError: any) {
        setErrorMessage('Failed to update profile.');
      }
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!window.confirm('Are you sure you want to delete this watcher profile? Watchlist settings will be lost.')) return;
    setErrorMessage('');
    const path = `users/${userId}/profiles/${profileId}`;

    try {
      await deleteDoc(doc(db, `users/${userId}/profiles`, profileId));
      if (editingProfile?.id === profileId) {
        setEditingProfile(null);
      }
      await loadProfiles();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, path);
      } catch (adaptedError: any) {
        setErrorMessage('Permission denied. Cannot delete profile.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white" id="profile-loader">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-400 font-sans tracking-wide text-sm">Preparing stream choices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-6 relative" id="profile-selector-container">
      
      {/* Platform Branding corner */}
      <div className="absolute top-8 left-8">
        <h2 className="text-red-600 font-extrabold text-2xl tracking-tighter cursor-pointer select-none font-sans">
          NETFLIX
        </h2>
      </div>

      <div className="w-full max-w-4xl text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-8 tracking-tight font-sans transition-all duration-300">
          {isEditingMode ? 'Manage Viewer Profiles' : "Who's watching?"}
        </h1>

        {errorMessage && (
          <div className="max-w-md mx-auto bg-red-950/40 border border-red-500/50 text-red-200 text-xs px-4 py-3 rounded mb-8" id="profile-error">
            {errorMessage}
          </div>
        )}

        {/* Profiles Grid */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-6 md:gap-8 mb-12">
          {profiles.map((prof) => (
            <div 
              key={prof.id} 
              id={`profile-card-${prof.id}`}
              className="group flex flex-col items-center select-none"
            >
              
              {/* Profile Avatar Box */}
              <div className="relative">
                <button
                  id={`select-avatar-${prof.id}`}
                  onClick={() => {
                    if (isEditingMode) {
                      setEditingProfile(prof);
                    } else {
                      onSelectProfile(prof);
                    }
                  }}
                  className={`w-28 h-28 md:w-32 md:h-32 rounded-lg flex items-center justify-center text-3xl md:text-4xl font-extrabold uppercase transition-all duration-300 cursor-pointer ${prof.avatar} ${
                    isEditingMode 
                      ? 'border-4 border-gray-400 hover:border-white scale-105 opacity-85' 
                      : 'border-2 border-transparent hover:border-white group-hover:scale-105'
                  }`}
                >
                  {prof.name.slice(0, 2)}
                </button>

                {/* Edit overlay */}
                {isEditingMode && (
                  <button
                    id={`edit-avatar-trigger-${prof.id}`}
                    onClick={() => setEditingProfile(prof)}
                    className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center cursor-pointer transition-opacity group-hover:bg-black/50"
                  >
                    <Edit2 className="w-6 h-6 text-white" />
                  </button>
                )}
              </div>

              {/* Name indicator */}
              <span className={`mt-4 text-base font-medium tracking-wide text-gray-400 group-hover:text-white transition-colors duration-200`}>
                {prof.name}
                {prof.isKids && (
                  <span className="block text-[10px] bg-sky-950 text-sky-400 font-bold px-1.5 py-0.5 rounded mt-1 uppercase w-max mx-auto tracking-wider">
                    Kids Panel
                  </span>
                )}
              </span>
            </div>
          ))}

          {/* Add Profile button slot (renders if listing counts < 5) */}
          {profiles.length < 5 && (
            <div className="flex flex-col items-center">
              <button
                id="add-profile-trigger"
                onClick={() => setIsAddingProfile(true)}
                className="w-28 h-28 md:w-32 md:h-32 rounded-lg border-2 border-dashed border-[#444] hover:border-white text-[#444] hover:text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 bg-transparent"
              >
                <Plus className="w-10 h-10" />
              </button>
              <span className="mt-4 text-base text-[#444] group-hover:text-white transition-colors">
                Add Profile
              </span>
            </div>
          )}
        </div>

        {/* Action button bar */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            id="toggle-profile-edit-mode"
            onClick={() => setIsEditingMode(!isEditingMode)}
            className={`border px-6 py-2.5 font-semibold text-sm tracking-widest uppercase transition-colors cursor-pointer rounded ${
              isEditingMode 
                ? 'bg-white text-black border-white hover:bg-neutral-200' 
                : 'text-gray-500 border-gray-500 hover:text-white hover:border-white'
            }`}
          >
            {isEditingMode ? 'Done Managing' : 'Manage Profiles'}
          </button>
        </div>
      </div>

      {/* --- Overlay Modal: Create Profile --- */}
      {isAddingProfile && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in" id="add-profile-modal">
          <div className="w-full max-w-md bg-[#141414] border border-[#222] rounded-xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 font-sans">Add Watcher Profile</h2>
            <form onSubmit={handleCreateProfile} className="space-y-6">
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Profile Name
                </label>
                <input
                  id="new-profile-name-input"
                  type="text"
                  required
                  maxLength={15}
                  placeholder="e.g. Kids Screen, Guest"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-[#333] border border-transparent focus:border-gray-500 rounded px-4 py-3 text-white text-sm focus:outline-none focus:ring-0 transition-colors"
                />
              </div>

              {/* Avatar Selector Presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Select Theme Color
                </label>
                <div className="flex gap-3 justify-center py-2">
                  {AVATAR_PRESETS.map((color) => (
                    <button
                      key={color}
                      id={`preset-color-${color}`}
                      type="button"
                      onClick={() => setNewProfileAvatar(color)}
                      className={`w-10 h-10 rounded-lg cursor-pointer transition-all hover:scale-110 flex items-center justify-center ${color} ${
                        newProfileAvatar === color ? 'ring-4 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {newProfileAvatar === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kid switch */}
              <div className="flex items-center justify-between p-4 bg-[#1f1f1f] rounded-lg border border-[#2ea] shadow-sm">
                <div>
                  <span className="font-semibold block text-sm">Parental Control Guard</span>
                  <span className="text-gray-400 text-xs mt-0.5 block">Restrict stream library to child-friendly ratings G/PG.</span>
                </div>
                <input
                  id="new-profile-kids-toggle"
                  type="checkbox"
                  checked={newProfileIsKids}
                  onChange={(e) => setNewProfileIsKids(e.target.checked)}
                  className="w-5 h-5 accent-red-600 rounded bg-[#333] cursor-pointer"
                />
              </div>

              {/* CTAs */}
              <div className="flex gap-3 pt-2">
                <button
                  id="cancel-add-profile"
                  type="button"
                  onClick={() => setIsAddingProfile(false)}
                  className="w-1/2 bg-[#2a2a2a] hover:bg-[#333] py-3 rounded font-semibold text-sm cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-add-profile"
                  type="submit"
                  className="w-1/2 bg-red-600 hover:bg-red-700 py-3 rounded font-semibold text-sm cursor-pointer transition-colors shadow"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Overlay Modal: Edit Profile --- */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-profile-modal">
          <div className="w-full max-w-md bg-[#141414] border border-[#222] rounded-xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 font-sans">Edit Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Profile Name
                </label>
                <input
                  id="edit-profile-name-input"
                  type="text"
                  required
                  maxLength={15}
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="w-full bg-[#333] border border-transparent focus:border-gray-500 rounded px-4 py-3 text-white text-sm focus:outline-none focus:ring-0 transition-colors"
                />
              </div>

              {/* Avatar Selector Presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Select Theme Color
                </label>
                <div className="flex gap-3 justify-center py-2">
                  {AVATAR_PRESETS.map((color) => (
                    <button
                      key={color}
                      id={`edit-preset-color-${color}`}
                      type="button"
                      onClick={() => setEditingProfile({ ...editingProfile, avatar: color })}
                      className={`w-10 h-10 rounded-lg cursor-pointer transition-all hover:scale-110 flex items-center justify-center ${color} ${
                        editingProfile.avatar === color ? 'ring-4 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {editingProfile.avatar === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kid switch */}
              <div className="flex items-center justify-between p-4 bg-[#1f1f1f] rounded-lg border border-[#2ea] shadow-sm">
                <div>
                  <span className="font-semibold block text-sm">Parental Control Guard</span>
                  <span className="text-gray-400 text-xs mt-0.5 block">Restrict stream library to child-friendly ratings G/PG.</span>
                </div>
                <input
                  id="edit-profile-kids-toggle"
                  type="checkbox"
                  checked={editingProfile.isKids}
                  onChange={(e) => setEditingProfile({ ...editingProfile, isKids: e.target.checked })}
                  className="w-5 h-5 accent-red-600 rounded bg-[#333] cursor-pointer"
                />
              </div>

              {/* CTAs */}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <button
                    id="cancel-edit-profile"
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    className="w-1/2 bg-[#2a2a2a] hover:bg-[#333] py-3 rounded font-semibold text-sm cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-edit-profile"
                    type="submit"
                    className="w-1/2 bg-red-600 hover:bg-red-700 py-3 rounded font-semibold text-sm cursor-pointer transition-colors shadow"
                  >
                    Save Changes
                  </button>
                </div>
                
                <button
                  id="delete-profile-trigger"
                  type="button"
                  onClick={() => handleDeleteProfile(editingProfile.id)}
                  className="w-full bg-red-950/20 hover:bg-red-900/30 text-red-500 border border-red-500/20 py-3 rounded font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                  Delete Viewer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
