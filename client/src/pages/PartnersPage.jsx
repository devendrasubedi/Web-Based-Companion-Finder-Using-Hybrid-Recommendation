import { useState, useMemo } from 'react';
import { Search, Users, MapPin, Calendar, Plus, AlertCircle } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import UserCard from '../components/UserCard';
import GroupCard from '../components/GroupCard';
import CreateGroupModal from '../components/CreateGroupModal';

// Mock data for users/partners
const mockUsers = [
  {
    id: 1,
    name: 'Raj Kumar',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raj',
    trailInterest: 'Everest Base Camp',
    plannedDate: '2024-04-15',
    experience: 'Intermediate',
    bio: 'Love mountain trekking, 5+ years experience',
    joinedGroups: 2,
  },
  {
    id: 2,
    name: 'Priya Singh',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    trailInterest: 'Annapurna Base Camp',
    plannedDate: '2024-05-20',
    experience: 'Advanced',
    bio: 'Professional trekker and guide',
    joinedGroups: 5,
  },
  {
    id: 3,
    name: 'Amit Patel',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit',
    trailInterest: 'Langtang Valley',
    plannedDate: '2024-03-30',
    experience: 'Beginner',
    bio: 'First time trekker, looking for experienced partners',
    joinedGroups: 1,
  },
  {
    id: 4,
    name: 'Sarah Chen',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    trailInterest: 'Makalu Base Camp',
    plannedDate: '2024-06-10',
    experience: 'Advanced',
    bio: 'Summit enthusiast, interested in high altitude treks',
    joinedGroups: 3,
  },
  {
    id: 5,
    name: 'Karan Thapa',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karan',
    trailInterest: 'Annapurna Base Camp',
    plannedDate: '2024-05-15',
    experience: 'Intermediate',
    bio: 'Weekend warrior, love Nepal treks',
    joinedGroups: 2,
  },
];

// Mock data for groups
const mockGroups = [
  {
    id: 1,
    name: 'ABC Spring Adventure 2024',
    trail: 'Annapurna Base Camp',
    description: 'Join us for an amazing trek to Annapurna Base Camp this spring',
    creatorName: 'Priya Singh',
    creatorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    members: 8,
    maxMembers: 15,
    trekDate: '2024-05-01',
    difficulty: 'Moderate',
    duration: '14 days',
    members_info: [
      { id: 2, name: 'Priya Singh' },
      { id: 5, name: 'Karan Thapa' },
    ],
  },
  {
    id: 2,
    name: 'EBC Ultimate Challenge',
    trail: 'Everest Base Camp',
    description: 'Experienced trekkers only. Challenging route with acclimatization focus',
    creatorName: 'Raj Kumar',
    creatorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raj',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    members: 5,
    maxMembers: 10,
    trekDate: '2024-04-15',
    difficulty: 'Difficult',
    duration: '18 days',
    members_info: [
      { id: 1, name: 'Raj Kumar' },
    ],
  },
  {
    id: 3,
    name: 'Langtang Valley Explorers',
    trail: 'Langtang Valley',
    description: 'Scenic valley trek perfect for all levels. Beautiful views guaranteed',
    creatorName: 'Amit Patel',
    creatorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    members: 12,
    maxMembers: 20,
    trekDate: '2024-03-30',
    difficulty: 'Easy',
    duration: '6 days',
    members_info: [
      { id: 3, name: 'Amit Patel' },
    ],
  },
  {
    id: 4,
    name: 'Makalu High Altitude Summit',
    trail: 'Makalu Base Camp',
    description: 'Extreme altitude trek. Only for experienced mountaineers',
    creatorName: 'Sarah Chen',
    creatorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    members: 3,
    maxMembers: 8,
    trekDate: '2024-06-10',
    difficulty: 'Very Difficult',
    duration: '20 days',
    members_info: [
      { id: 4, name: 'Sarah Chen' },
    ],
  },
  {
    id: 5,
    name: 'ABC Beginner Friendly',
    trail: 'Annapurna Base Camp',
    description: 'Perfect for first-time trekkers. Slow pace, good acclimatization',
    creatorName: 'Priya Singh',
    creatorImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    members: 6,
    maxMembers: 12,
    trekDate: '2024-05-20',
    difficulty: 'Easy to Moderate',
    duration: '16 days',
    members_info: [
      { id: 2, name: 'Priya Singh' },
    ],
  },
];

export default function PartnersPage() {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'groups', 'byTrail'
  const [userSearch, setUserSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [trailSearch, setTrailSearch] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedTrailForGroup, setSelectedTrailForGroup] = useState('');

  // Get all unique trails from groups
  const trails = useMemo(() => {
    return [...new Set(mockGroups.map(g => g.trail))].sort();
  }, []);

  // Filter users
  const filteredUsers = useMemo(() => {
    return mockUsers.filter(user =>
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.trailInterest.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.experience.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [userSearch]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return mockGroups.filter(group =>
      group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      group.trail.toLowerCase().includes(groupSearch.toLowerCase()) ||
      group.description.toLowerCase().includes(groupSearch.toLowerCase())
    );
  }, [groupSearch]);

  // Filter groups by selected trail
  const groupsByTrail = useMemo(() => {
    if (!trailSearch) return [];
    return mockGroups.filter(
      group => group.trail.toLowerCase() === trailSearch.toLowerCase()
    );
  }, [trailSearch]);

  const handleCreateGroupClick = (trail) => {
    setSelectedTrailForGroup(trail);
    setShowCreateGroupModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Find Trekking Partners</h1>
          <p className="text-gray-600">Search users, join groups, or create your own trekking adventure</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users size={18} />
            Find Partners
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'groups'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MapPin size={18} />
            Search Groups
          </button>
          <button
            onClick={() => setActiveTab('byTrail')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'byTrail'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar size={18} />
            Groups by Trail
          </button>
        </div>

        {/* TAB 1: Find Partners */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6">
              <SearchBar
                placeholder="Search partners by name, trail, or experience..."
                value={userSearch}
                onChange={setUserSearch}
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No partners found matching your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Search Groups */}
        {activeTab === 'groups' && (
          <div>
            <div className="mb-6 flex flex-col gap-4">
              <SearchBar
                placeholder="Search groups by name, trail, or description..."
                value={groupSearch}
                onChange={setGroupSearch}
              />
              <button
                onClick={() => handleCreateGroupClick('')}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition w-full md:w-auto"
              >
                <Plus size={20} />
                Create New Group
              </button>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No groups found matching your search</p>
                <button
                  onClick={() => handleCreateGroupClick('')}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  <Plus size={20} />
                  Create First Group
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map(group => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Groups by Trail */}
        {activeTab === 'byTrail' && (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a Trail to View Groups
              </label>
              <select
                value={trailSearch}
                onChange={e => setTrailSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a trail...</option>
                {trails.map(trail => (
                  <option key={trail} value={trail}>
                    {trail}
                  </option>
                ))}
              </select>
            </div>

            {trailSearch && groupsByTrail.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No groups found for {trailSearch}</p>
                <button
                  onClick={() => {
                    setSelectedTrailForGroup(trailSearch);
                    setShowCreateGroupModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  <Plus size={20} />
                  Create Group for {trailSearch}
                </button>
              </div>
            ) : trailSearch ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {groupsByTrail.length} Group{groupsByTrail.length !== 1 ? 's' : ''} for {trailSearch}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedTrailForGroup(trailSearch);
                      setShowCreateGroupModal(true);
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    <Plus size={18} />
                    Create Group
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupsByTrail.map(group => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-8 text-center">
                <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Select a trail to view available groups</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => {
            setShowCreateGroupModal(false);
            setSelectedTrailForGroup('');
          }}
          preselectedTrail={selectedTrailForGroup}
          availableTrails={trails}
        />
      )}
    </div>
  );
}
