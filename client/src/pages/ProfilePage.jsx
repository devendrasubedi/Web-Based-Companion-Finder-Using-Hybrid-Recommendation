import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User } from 'lucide-react';
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

  // Relationship data — fetched from dedicated API endpoints
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [savedHikes, setSavedHikes] = useState([]);
  const [pastHikes, setPastHikes] = useState([]);
  const [friendStatus, setFriendStatus] = useState('none');

  const isOwnProfile = !id || (authUser && id === authUser._id);

  // ── Fetch profile data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        if (isOwnProfile) {
          if (authUser) {
            setUser(authUser);
            setEditedUser(authUser);

            // Fetch friends, requests, and interactions in parallel
            const [reqRes, friendsRes, interactionsRes] = await Promise.allSettled([
              axios.get('/api/friends/requests'),
              axios.get('/api/friends/'),
              axios.get('/api/users/interactions'),
            ]);

            if (reqRes.status === 'fulfilled' && reqRes.value.data.success) {
              setFriendRequests(reqRes.value.data.received || []);
            }
            if (friendsRes.status === 'fulfilled' && friendsRes.value.data.success) {
              setFriends(friendsRes.value.data.friends || []);
            }
            if (interactionsRes.status === 'fulfilled' && interactionsRes.value.data.success) {
              setSavedHikes(interactionsRes.value.data.savedHikes || []);
              setPastHikes(interactionsRes.value.data.pastHikes || []);
            }
          }
        } else {
          // Viewing another user's profile
          const fetchedUser = await getUserProfile(id);
          setUser(fetchedUser);

          // Fetch friend status, their friends list, and their interactions in parallel
          const [statusRes, friendsRes, interactionsRes] = await Promise.allSettled([
            axios.get(`/api/friends/status/${id}`),
            axios.get('/api/friends/'),
            axios.get(`/api/users/${id}/interactions`),
          ]);

          if (statusRes.status === 'fulfilled' && statusRes.value.data.success) {
            setFriendStatus(statusRes.value.data.status);
          }
          if (friendsRes.status === 'fulfilled' && friendsRes.value.data.success) {
            setFriends(friendsRes.value.data.friends || []);
          }
          if (interactionsRes.status === 'fulfilled' && interactionsRes.value.data.success) {
            setSavedHikes(interactionsRes.value.data.savedHikes || []);
            setPastHikes(interactionsRes.value.data.pastHikes || []);
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

  // ── Friend action handlers ──────────────────────────────────────────────────
  const handleAcceptFriendRequest = async (senderId) => {
    try {
      const response = await axios.post('/api/friends/accept', { senderId });
      if (response.data.success) {
        setFriendRequests(prev => prev.filter(req => String(req.userId) !== String(senderId)));
        // Refresh friends list
        const friendsRes = await axios.get('/api/friends/');
        if (friendsRes.data.success) setFriends(friendsRes.data.friends || []);
      }
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      alert("Failed to accept friend request");
    }
  };

  const handleRejectFriendRequest = async (senderId) => {
    try {
      const response = await axios.post('/api/friends/reject', { senderId });
      if (response.data.success) {
        setFriendRequests(prev => prev.filter(req => String(req.userId) !== String(senderId)));
      }
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      alert("Failed to reject friend request");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    try {
      const response = await axios.delete(`/api/friends/${friendId}`);
      if (response.data.success) {
        setFriends(response.data.friends || []);
      }
    } catch (error) {
      console.error("Failed to remove friend:", error);
      alert("Failed to remove friend");
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user?._id) return;
    try {
      if (friendStatus === 'request_received') {
        // Accept the incoming request
        const response = await axios.post('/api/friends/accept', { senderId: user._id });
        if (response.data.success) {
          setFriendStatus('friends');
          const friendsRes = await axios.get('/api/friends/');
          if (friendsRes.data.success) setFriends(friendsRes.data.friends || []);
        }
      } else {
        // Send new request
        const response = await axios.post('/api/friends/request', { receiverId: user._id });
        if (response.data.success) setFriendStatus('request_sent');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send friend request';
      alert(msg);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!user?._id) return;
    try {
      const response = await axios.post('/api/friends/cancel', { receiverId: user._id });
      if (response.data.success) setFriendStatus('none');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to cancel request';
      alert(msg);
    }
  };

  const handleRemoveCurrentFriend = async () => {
    if (!user?._id) return;
    if (!confirm(`Are you sure you want to remove ${user.name} from your friends?`)) return;
    try {
      const response = await axios.delete(`/api/friends/${user._id}`);
      if (response.data.success) {
        setFriendStatus('none');
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

        {/* 1. Profile Details */}
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
          onSendFriendRequest={handleSendFriendRequest}
          onCancelFriendRequest={handleCancelFriendRequest}
        />

        {/* Friend Requests (own profile only) */}
        {isOwnProfile && friendRequests.length > 0 && (
          <ProfileFriendRequests
            friendRequests={friendRequests}
            onAccept={handleAcceptFriendRequest}
            onReject={handleRejectFriendRequest}
          />
        )}

        {/* Grid: Preferences + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          <div className="lg:col-span-1">
            <ProfilePreferences
              user={user}
              isOwnProfile={isOwnProfile}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <ProfilePastHikes pastHikes={pastHikes} />
              <ProfileSavedHikes savedHikes={savedHikes} />
            </div>
          </div>
        </div>

        {/* Friends Section */}
        <ProfileFriends
          friends={friends}
          isOwnProfile={isOwnProfile}
          onRemoveFriend={handleRemoveFriend}
        />

      </div>
    </div>
  );
}

export default ProfilePage;