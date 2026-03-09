import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MapPin, Users, Calendar, AlertCircle, Loader, Filter, ChevronDown, X } from 'lucide-react';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupCard from '../components/GroupCard';
import UserCard from '../components/UserCard';
import { useAuthStore } from '../store/authStore';

export default function GroupsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State for groups
  const [groups, setGroups] = useState([]);
  const [suggestedFriends, setSuggestedFriends] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [trailsForDropdown, setTrailsForDropdown] = useState([]);

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

  // Fetch suggested friends
  const fetchSuggestedFriends = async () => {
    try {
      const response = await fetch('/api/users/suggested/friends?limit=8', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to fetch friends');

      const data = await response.json();
      setSuggestedFriends(data.friends || []);
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

  // Handle connect with friend
  const handleConnectFriend = async (friendId) => {
    try {
      setLoading(true);

      // Create or get direct conversation
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ recipientId: friendId })
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const data = await response.json();

      // Navigate to messages
      navigate(`/messages/${data.conversation._id}`);
    } catch (err) {
      console.error('Error connecting with friend:', err);
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
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
      {/* Header */}
      <div className="sticky top-20 z-40 bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trek Groups</h1>
              <p className="text-gray-600 text-sm mt-1">Find partners, create groups, organize adventures</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white rounded-xl font-bold transition duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Create Group
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'browse'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Browse Groups
          </button>
          <button
            onClick={() => setActiveTab('my-groups')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'my-groups'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            My Groups {userGroups.length > 0 && `(${userGroups.length})`}
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'friends'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Suggested Friends
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
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition ${
                          !selectedTrailFilter ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'
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
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition ${
                                selectedTrailFilter === trailName ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'
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
                  <UserCard
                    key={friend._id}
                    user={friend}
                    onConnect={handleConnectFriend}
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
