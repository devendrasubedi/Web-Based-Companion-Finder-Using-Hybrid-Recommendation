import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Mountain } from 'lucide-react';
import axios from 'axios';

import ProfileDetails from '../components/profile/ProfileDetails';
import ProfilePreferences from '../components/profile/ProfilePreferences';
import ProfilePastHikes from '../components/profile/ProfilePastHikes';
import ProfileSavedHikes from '../components/profile/ProfileSavedHikes';
import ProfileFriends from '../components/profile/ProfileFriends';
import ProfileFriendRequests from '../components/profile/ProfileFriendRequests';

function ProfilePage() {
  const { id } = useParams();
  const { user: authUser, logout, updateProfile, getUserProfile } = useAuthStore();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [friendRequests, setFriendRequests] = useState([]);


  const [friendStatus, setFriendStatus] = useState('none');

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

            // Fetch friend requests for own profile
            try {
              const response = await axios.get('/api/friends/requests');
              if (response.data.success) {
                setFriendRequests(response.data.received || []);
              }
            } catch (error) {
              console.error("Failed to fetch friend requests:", error);
            }
          }
        } else {
          // Fetch other user
          const fetchedUser = await getUserProfile(id);
          setUser(fetchedUser);

          // Fetch friend status
          try {
            const response = await axios.get(`/api/friends/status/${id}`);
            if (response.data.success) {
              setFriendStatus(response.data.status);
            }
          } catch (error) {
            console.error("Failed to fetch friend status:", error);
          }
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

  const handleAcceptFriendRequest = async (senderId, senderName) => {
    try {
      const response = await axios.post('/api/friends/accept', {
        senderId,
        senderName
      });

      if (response.data.success) {
        // Remove from friend requests
        setFriendRequests(prev => prev.filter(req => req.userId !== senderId));

        // Update user's friends list
        setUser(prev => ({
          ...prev,
          friends: response.data.friends
        }));
      }
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      alert("Failed to accept friend request");
    }
  };

  const handleRejectFriendRequest = async (senderId) => {
    try {
      const response = await axios.post('/api/friends/reject', {
        senderId
      });

      if (response.data.success) {
        // Remove from friend requests
        setFriendRequests(prev => prev.filter(req => req.userId !== senderId));
      }
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      alert("Failed to reject friend request");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!confirm("Are you sure you want to remove this friend?")) {
      return;
    }

    try {
      const response = await axios.delete(`/api/friends/${friendId}`);

      if (response.data.success) {
        // Update user's friends list
        setUser(prev => ({
          ...prev,
          friends: response.data.friends
        }));
      }
    } catch (error) {
      console.error("Failed to remove friend:", error);
      alert("Failed to remove friend");
    }
  };

  const handleRemoveCurrentFriend = async () => {
    if (!user || !user._id) return;

    if (!confirm(`Are you sure you want to remove ${user.name} from your friends?`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/friends/${user._id}`);
      if (response.data.success) {
        setFriendStatus('none');
        alert("Friend removed successfully");
        // Optionally redirect or refresh
      }
    } catch (error) {
      console.error("Failed to remove friend:", error);
      alert("Failed to remove friend");
    }
  };

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
          friendStatus={friendStatus}
          onRemoveCurrentFriend={handleRemoveCurrentFriend}
        />

        {/* Friend Requests Section (Only for own profile) */}
        {isOwnProfile && friendRequests.length > 0 && (
          <ProfileFriendRequests
            friendRequests={friendRequests}
            onAccept={handleAcceptFriendRequest}
            onReject={handleRejectFriendRequest}
          />
        )}

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

        {/* Friends Section */}
        <ProfileFriends
          friends={user.friends || []}
          isOwnProfile={isOwnProfile}
          onRemoveFriend={handleRemoveFriend}
        />

      </div>
    </div>
  );
}

export default ProfilePage;