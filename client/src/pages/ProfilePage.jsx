<<<<<<< HEAD

import { useState, useEffect } from 'react';
import { mockUsers } from '../data/mockData';
import axios from 'axios';
import { MapPin, Languages, Edit2, Mountain, Bookmark, Award } from 'lucide-react';
=======
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Mountain } from 'lucide-react';
>>>>>>> e9f3635f32dd9aa80be7a98b1fea157047c1087d

import ProfileDetails from '../components/profile/ProfileDetails';
import ProfilePreferences from '../components/profile/ProfilePreferences';
import ProfilePastHikes from '../components/profile/ProfilePastHikes';
import ProfileSavedHikes from '../components/profile/ProfileSavedHikes';

function ProfilePage() {
  const { id } = useParams();
  const { user: authUser, logout, updateProfile, getUserProfile } = useAuthStore();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
<<<<<<< HEAD
  const [loading, setLoading] = useState(true);
  
  // Find the user or fallback to the first mock user
  const user = userId ? mockUsers.find(u => u.id === userId) : mockUsers[0];
  const isOwnProfile = !userId || user?.email === currentUserEmail;
=======
  const [editedUser, setEditedUser] = useState({});
>>>>>>> e9f3635f32dd9aa80be7a98b1fea157047c1087d


  // If no ID param, it's own profile. If ID matches authUser ID, it's own profile.
  const isOwnProfile = !id || (authUser && id === authUser._id);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        if (isOwnProfile) {
          if (authUser) {
            setUser(authUser);
            setEditedUser(authUser);
          }
        } else {
          // Fetch other user
          const fetchedUser = await getUserProfile(id);
          setUser(fetchedUser);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id, authUser, isOwnProfile, getUserProfile]);

  // Sync edits 
  useEffect(() => {
    if (isOwnProfile && authUser) {
      setUser(authUser);
      if (!isEditing) {
        setEditedUser(authUser);
      }
    }
  }, [authUser, isOwnProfile, isEditing]);


  const handleSave = async () => {
    try {
      await updateProfile(editedUser);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {

    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center items-center">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">User not found</h2>
          <button onClick={() => navigate('/')} className="text-primary hover:underline">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* 1. Profile Details Block */}
        <ProfileDetails
          user={user}
          isOwnProfile={isOwnProfile}
          isEditing={isEditing}
          onEditToggle={() => setIsEditing(true)}
          onSave={handleSave}
          onCancel={() => { setIsEditing(false); setEditedUser(user); }}
          onLogout={handleLogout}
          editedUser={editedUser}
          setEditedUser={setEditedUser}
        />

        {/* 2. Grid for Preferences, Past Hikes, Saved Hikes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* Preferences Block */}
          <div className="lg:col-span-1">
            <ProfilePreferences
              user={user}
              isOwnProfile={isOwnProfile}
            />
          </div>

          {/* Activity Section (Split into Past and Saved) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Past Hikes Block */}
              <ProfilePastHikes pastHikes={user.pastHikes} />

              {/* Saved Hikes Block */}
              <ProfileSavedHikes savedHikes={user.savedHikes} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProfilePage;