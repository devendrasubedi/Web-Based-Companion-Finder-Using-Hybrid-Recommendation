import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MapPin, Users, Calendar, AlertCircle, Loader, Filter, ChevronDown, X } from 'lucide-react';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupCard from '../components/GroupCard';
import ProfileCard from '../components/ProfileCard';
import { useAuthStore } from '../store/authStore';
import { useAuthGuard } from '../hooks/useAuthGuard';
import axios from 'axios';

export default function GroupsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { canPerformAction } = useAuthGuard();

  // State for groups
  const [groups, setGroups] = useState([]);
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [friendStatuses, setFriendStatuses] = useState({});
  const [userGroups, setUserGroups] = useState([]);
  const [trailsForDropdown, setTrailsForDropdown] = useState([]);

  // Search Users State
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'my-groups', 'friends'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrailFilter, setSelectedTrailFilter] = useState('');
  const [trailFilterQuery, setTrailFilterQuery] = useState('');
  const [showTrailDropdown, setShowTrailDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const trailDropdownRef = useRef(null);

  // Close trail dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (trailDropdownRef.current && !trailDropdownRef.current.contains(e.target)) {
        setShowTrailDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all groups
  const fetchAllGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groups/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to fetch groups');

      const data = await response.json();
      setGroups(data.groups || []);
      setError('');
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's groups
  const fetchUserGroups = async () => {
    try {
      const response = await fetch('/api/groups/user/my-groups', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to fetch user groups');

      const data = await response.json();
      setUserGroups(data.groups || []);
    } catch (err) {
      console.error('Error fetching user groups:', err);
    }
  };

  // Fetch suggested friends (now using hybrid recommendations)
  const fetchSuggestedFriends = async () => {
    try {
      const response = await fetch('/api/recommendations/companions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      
      // Ensure we have an array (support both data.companions and data.friends formats)
      const usersList = Array.isArray(data.companions) ? data.companions 
                      : Array.isArray(data.friends) ? data.friends 
                      : Array.isArray(data) ? data 
                      : [];
                      
      // Limit to 8 for the groups page display
      const displayList = usersList.slice(0, 8);
      setSuggestedFriends(displayList);

      // Load friend statuses
      if (user && displayList.length > 0) {
        const otherIds = displayList
          .filter(u => String(u._id) !== String(user._id || user.id))
          .map(u => u._id);
        const statusResults = await Promise.allSettled(
          otherIds.map(uid =>
            axios.get(`/api/friends/status/${uid}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }).then(r => ({ uid, status: r.data.status }))
          )
        );
        const statuses = {};
        statusResults.forEach(r => {
          if (r.status === 'fulfilled') statuses[r.value.uid] = r.value.status;
        });
        setFriendStatuses(statuses);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  // Fetch trails for dropdown
  const fetchTrails = async () => {
    try {
      const response = await fetch('/api/trails/');
      if (!response.ok) throw new Error('Failed to fetch trails');

      const data = await response.json();
      // Store full trail objects with their IDs
      setTrailsForDropdown(data || []);
    } catch (err) {
      console.error('Error fetching trails:', err);
    }
  };

  // Search New Users
  const handleSearchNewUsers = async (e) => {
    e.preventDefault();
    if (!userSearchQuery.trim()) return;

    try {
      setSearchingUsers(true);
      const response = await fetch(`/api/users?search=${encodeURIComponent(userSearchQuery)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to search users');

      const data = await response.json();
      setUserSearchResults(data || []);
      
      // Load friend statuses for results
      if (user && data.length > 0) {
        const otherIds = data
          .filter(u => String(u._id) !== String(user._id || user.id))
          .map(u => u._id);
        const statusResults = await Promise.allSettled(
          otherIds.map(uid =>
            axios.get(`/api/friends/status/${uid}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }).then(r => ({ uid, status: r.data.status }))
          )
        );
        const statuses = {};
        statusResults.forEach(r => {
          if (r.status === 'fulfilled') statuses[r.value.uid] = r.value.status;
        });
        setFriendStatuses(prev => ({ ...prev, ...statuses }));
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Search groups
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      fetchAllGroups();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/groups/search?search=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to search groups');

      const data = await response.json();
      setGroups(data.groups || []);
      setError('');
    } catch (err) {
      console.error('Error searching groups:', err);
      setError('Failed to search groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle create group
  const handleCreateGroup = async (formData) => {
    try {
      setLoading(true);

      // Find the trail ID by matching the trail name
      const selectedTrail = trailsForDropdown.find(t => (t.name || t.id) === formData.trailName);
      if (!selectedTrail) {
        throw new Error('Selected trail not found');
      }

      // Add trailId to form data (use id or _id field from trail object)
      const groupData = {
        ...formData,
        trailId: selectedTrail.id || selectedTrail._id
      };

      console.log("📤 Sending group data:", groupData);
      console.log("   Selected trail:", selectedTrail);
      console.log("   formData:", formData);

      const response = await fetch('/api/groups/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error("❌ Server returned error:", errorData);
          throw new Error(errorData.message || 'Failed to create group');
        } catch (parseError) {
          // If response is not JSON (e.g., HTML error page), throw generic error
          console.error("❌ Server error (non-JSON response):", response.status, response.statusText);
          throw new Error(`Server error (${response.status}). Please check the server logs.`);
        }
      }

      const data = await response.json();
      console.log("✅ Group created successfully:", data);

      // Close modal
      setShowCreateModal(false);

      // Refresh groups and switch to My Groups tab to show the new group
      await fetchAllGroups();
      await fetchUserGroups();
      setActiveTab('my-groups');

      setError('');
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  // Handle join group
  const handleJoinGroup = async (groupId) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join group');
      }

      // Refresh both lists so the group moves from Browse to My Groups
      await fetchAllGroups();
      await fetchUserGroups();

      setError('');
    } catch (err) {
      console.error('Error joining group:', err);
      setError(err.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId, userName) => {
    if (!canPerformAction('send friend requests')) return;

    try {
      const response = await axios.post('/api/friends/request', {
        receiverId: userId,
        receiverName: userName
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: 'request_sent'
        }));
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
      alert(error.response?.data?.message || "Failed to send friend request");
    }
  };

  const handleAcceptRequest = async (userId, userName) => {
    if (!canPerformAction('manage friend requests')) return;

    try {
      const response = await axios.post('/api/friends/accept', {
        senderId: userId,
        senderName: userName
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setFriendStatuses(prev => ({
          ...prev,
          [userId]: 'friends'
        }));
      }
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      alert("Failed to accept friend request");
    }
  };

  // Handle open chat for a group
  const handleOpenChat = (conversationId) => {
    if (conversationId) {
      navigate(`/messages/${conversationId}`);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchAllGroups();
    fetchUserGroups();
    fetchSuggestedFriends();
    fetchTrails();
  }, []);

  // Filtered groups for Browse tab: exclude user's groups, apply trail filter & search
  const filteredGroups = useMemo(() => {
    // Get the set of group IDs the user is already a member of
    const userGroupIds = new Set(userGroups.map(g => g._id));

    // Start with all groups, excluding ones the user is in
    let browsableGroups = groups.filter(group => !userGroupIds.has(group._id));

    // Apply trail filter if selected
    if (selectedTrailFilter) {
      browsableGroups = browsableGroups.filter(group =>
        (group.trailName || '') === selectedTrailFilter
      );
    }

    // Apply search filter if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      browsableGroups = browsableGroups.filter(group =>
        (group.name || '').toLowerCase().includes(query) ||
        (group.trailName || '').toLowerCase().includes(query) ||
        (group.description || '').toLowerCase().includes(query)
      );
    }

    return browsableGroups;
  }, [groups, userGroups, searchQuery, selectedTrailFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-200">
          <div className="flex gap-4 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${activeTab === 'browse'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Browse Groups
            </button>
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${activeTab === 'my-groups'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              My Groups {userGroups.length > 0 && `(${userGroups.length})`}
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${activeTab === 'friends'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Suggested Friends
            </button>
            <button
              onClick={() => setActiveTab('search-users')}
              className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${activeTab === 'search-users'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Search Users
            </button>
            {/* Search Users Tab added next step */}
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold transition duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            Create Group
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Browse Groups Tab */}
        {activeTab === 'browse' && (
          <div>
            {/* Search & Trail Filter */}
            <div className="mb-8 space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search groups by name, trail, or description..."
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 hover:border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>
              </form>

              {/* Trail Filter Dropdown (Searchable) */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
                  <Filter size={18} />
                  <span className="text-sm font-semibold">Filter by Trail:</span>
                </div>
                <div className="relative flex-1 max-w-md" ref={trailDropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedTrailFilter ? selectedTrailFilter : trailFilterQuery}
                      onChange={(e) => {
                        setTrailFilterQuery(e.target.value);
                        setSelectedTrailFilter('');
                        setShowTrailDropdown(true);
                      }}
                      onFocus={() => setShowTrailDropdown(true)}
                      placeholder="Type or select a trail..."
                      className="w-full px-4 py-2.5 pr-20 border-2 border-gray-300 hover:border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition bg-white text-sm font-medium"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {(selectedTrailFilter || trailFilterQuery) && (
                        <button
                          onClick={() => {
                            setSelectedTrailFilter('');
                            setTrailFilterQuery('');
                            setShowTrailDropdown(false);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full transition"
                        >
                          <X size={14} className="text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowTrailDropdown(!showTrailDropdown)}
                        className="p-1 hover:bg-gray-100 rounded-full transition"
                      >
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${showTrailDropdown ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {showTrailDropdown && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedTrailFilter('');
                          setTrailFilterQuery('');
                          setShowTrailDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition ${!selectedTrailFilter ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'
                          }`}
                      >
                        All Trails
                      </button>
                      {trailsForDropdown
                        .filter(trail => {
                          const name = trail.name || trail.id;
                          return !trailFilterQuery || name.toLowerCase().includes(trailFilterQuery.toLowerCase());
                        })
                        .map(trail => {
                          const trailName = trail.name || trail.id;
                          return (
                            <button
                              key={trail._id || trail.id}
                              onClick={() => {
                                setSelectedTrailFilter(trailName);
                                setTrailFilterQuery('');
                                setShowTrailDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition ${selectedTrailFilter === trailName ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'
                                }`}
                            >
                              {trailName}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-green-600 mr-3" size={24} />
                <p className="text-gray-600">Loading groups...</p>
              </div>
            )}

            {/* Groups Grid */}
            {!loading && filteredGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map(group => (
                  <GroupCard
                    key={group._id}
                    group={group}
                    onJoin={handleJoinGroup}
                    isMember={false}
                  />
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-12">
                <MapPin className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg font-medium">No groups found</p>
                <p className="text-gray-500">Try a different search or create a new group</p>
              </div>
            ) : null}
          </div>
        )}

        {/* My Groups Tab */}
        {activeTab === 'my-groups' && (
          <div>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-green-600 mr-3" size={24} />
                <p className="text-gray-600">Loading your groups...</p>
              </div>
            )}

            {!loading && userGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userGroups.map(group => (
                  <GroupCard
                    key={group._id}
                    group={group}
                    isMember={true}
                    onOpenChat={handleOpenChat}
                  />
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg font-medium">You haven't joined any groups yet</p>
                <p className="text-gray-500">Browse groups and join one to get started</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Suggested Friends Tab */}
        {activeTab === 'friends' && (
          <div>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-green-600 mr-3" size={24} />
                <p className="text-gray-600">Loading suggested friends...</p>
              </div>
            )}

            {!loading && suggestedFriends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestedFriends.map(friend => (
                  <ProfileCard
                    key={friend._id}
                    user={friend}
                    onClick={() => navigate(`/profile/${friend._id}`)}
                    friendStatus={friendStatuses[friend._id] || 'none'}
                    onAddFriend={handleAddFriend}
                    onAcceptRequest={handleAcceptRequest}
                  />
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg font-medium">No users available</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Search Users Tab */}
        {activeTab === 'search-users' && (
          <div>
            <form onSubmit={handleSearchNewUsers} className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 hover:border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <button 
                  type="submit" 
                  disabled={searchingUsers}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </form>

            {searchingUsers && (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-green-600 mr-3" size={24} />
                <p className="text-gray-600">Searching users...</p>
              </div>
            )}

            {!searchingUsers && userSearchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userSearchResults.map(result => (
                  <ProfileCard
                    key={result._id}
                    user={result}
                    onClick={() => navigate(`/profile/${result._id}`)}
                    friendStatus={friendStatuses[result._id] || 'none'}
                    onAddFriend={handleAddFriend}
                    onAcceptRequest={handleAcceptRequest}
                  />
                ))}
              </div>
            ) : !searchingUsers && userSearchQuery ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg font-medium">No users found</p>
                <p className="text-gray-500">Try a different search term</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
          availableTrails={trailsForDropdown}
        />
      )}
    </div>
  );
}
