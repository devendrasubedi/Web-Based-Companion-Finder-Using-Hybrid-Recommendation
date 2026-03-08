import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, MapPin, Calendar, UserCheck, Loader } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import GroupCard from '../components/GroupCard';

const GroupsPage = () => {
    const { isAuthenticated } = useAuthStore();
    const [activeTab, setActiveTab] = useState('groups'); // 'groups', 'partners', 'mygroups'
    const [searchQuery, setSearchQuery] = useState('');
    const [trailFilter, setTrailFilter] = useState('');
    const [trails, setTrails] = useState([]);
    const [groups, setGroups] = useState([]);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroup, setNewGroup] = useState({
        name: '',
        description: '',
        trail: '',
        startDate: '',
        endDate: '',
        maxMembers: 10
    });

    // Fetch all trails
    useEffect(() => {
        const fetchTrails = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/trails');
                const data = await response.json();
                setTrails(data);
            } catch (error) {
                console.error('Error fetching trails:', error);
            }
        };
        fetchTrails();
    }, []);

    // Fetch groups based on search and filter
    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            try {
                // Simulate fetching groups from backend
                // For now, we'll create mock data
                let filteredGroups = mockGroups;

                // Filter by trail
                if (trailFilter) {
                    filteredGroups = filteredGroups.filter(g =>
                        g.trail.toLowerCase().includes(trailFilter.toLowerCase())
                    );
                }

                // Filter by search query
                if (searchQuery) {
                    filteredGroups = filteredGroups.filter(g =>
                        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        g.description.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }

                setGroups(filteredGroups);
            } catch (error) {
                console.error('Error fetching groups:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroups();
    }, [searchQuery, trailFilter]);

    // Fetch partners based on search
    useEffect(() => {
        const fetchPartners = async () => {
            setLoading(true);
            try {
                // Simulate fetching partners from backend
                let filteredPartners = mockPartners;

                if (searchQuery) {
                    filteredPartners = filteredPartners.filter(p =>
                        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.bio.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }

                setPartners(filteredPartners);
            } catch (error) {
                console.error('Error fetching partners:', error);
            } finally {
                setLoading(false);
            }
        };

        if (activeTab === 'partners') {
            fetchPartners();
        }
    }, [searchQuery, activeTab]);

    // Handle create group
    const handleCreateGroup = (e) => {
        e.preventDefault();
        if (!newGroup.name || !newGroup.trail || !newGroup.startDate) {
            alert('Please fill in all required fields');
            return;
        }

        const createdGroup = {
            id: Date.now(),
            ...newGroup,
            membersCount: 1,
            maxMembers: newGroup.maxMembers,
            createdBy: 'Current User',
            members: ['Current User'],
            status: 'active'
        };

        setGroups([createdGroup, ...groups]);
        setNewGroup({
            name: '',
            description: '',
            trail: '',
            startDate: '',
            endDate: '',
            maxMembers: 10
        });
        setShowCreateModal(false);
    };

    // Handle join group
    const handleJoinGroup = (groupId) => {
        setGroups(groups.map(g => {
            if (g.id === groupId && g.membersCount < g.maxMembers) {
                return {
                    ...g,
                    membersCount: g.membersCount + 1,
                    members: [...g.members, 'You']
                };
            }
            return g;
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-green-600" />
                            <h1 className="text-3xl font-bold text-gray-900">Find Trekking Partners</h1>
                        </div>
                        {isAuthenticated && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Create Group
                            </button>
                        )}
                    </div>
                    <p className="text-gray-600">Connect with fellow adventurers, join groups, or create your own for upcoming treks.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-3 font-medium transition-colors ${
                            activeTab === 'groups'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-600 hover:text-green-600'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Groups
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`px-4 py-3 font-medium transition-colors ${
                            activeTab === 'partners'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-600 hover:text-green-600'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4" />
                            Partners
                        </div>
                    </button>
                    {isAuthenticated && (
                        <button
                            onClick={() => setActiveTab('mygroups')}
                            className={`px-4 py-3 font-medium transition-colors ${
                                activeTab === 'mygroups'
                                    ? 'text-green-600 border-b-2 border-green-600'
                                    : 'text-gray-600 hover:text-green-600'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                My Groups
                            </div>
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
                    <div className="flex gap-4 flex-col md:flex-row">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'partners' ? 'Search partners...' : 'Search groups...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        </div>

                        {/* Trail Filter (only for groups) */}
                        {activeTab === 'groups' && (
                            <select
                                value={trailFilter}
                                onChange={(e) => setTrailFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 md:w-64"
                            >
                                <option value="">All Trails</option>
                                {trails.map(trail => (
                                    <option key={trail.id} value={trail.name}>
                                        {trail.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader className="w-8 h-8 text-green-600 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Groups Tab */}
                        {activeTab === 'groups' && (
                            <div>
                                {groups.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No groups found. Create one to start!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groups.map(group => (
                                            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="text-lg font-bold text-gray-900 flex-1">{group.name}</h3>
                                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                        {group.membersCount}/{group.maxMembers}
                                                    </span>
                                                </div>

                                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{group.description}</p>

                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <MapPin className="w-4 h-4 mr-2 text-green-600" />
                                                        {group.trail}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Calendar className="w-4 h-4 mr-2 text-green-600" />
                                                        {group.startDate} to {group.endDate}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleJoinGroup(group.id)}
                                                    disabled={group.membersCount >= group.maxMembers}
                                                    className={`w-full font-medium py-2 px-4 rounded-lg transition-colors ${
                                                        group.membersCount >= group.maxMembers
                                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                                >
                                                    {group.membersCount >= group.maxMembers ? 'Full' : 'Join Group'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Partners Tab */}
                        {activeTab === 'partners' && (
                            <div>
                                {partners.length === 0 ? (
                                    <div className="text-center py-12">
                                        <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No partners found.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {partners.map(partner => (
                                            <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow p-5">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <img
                                                        src={partner.image}
                                                        alt={partner.name}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-900">{partner.name}</h3>
                                                        <p className="text-sm text-green-600">{partner.level}</p>
                                                    </div>
                                                </div>

                                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{partner.bio}</p>

                                                <div className="flex gap-2">
                                                    <button className="flex-1 bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                                                        Connect
                                                    </button>
                                                    <button className="flex-1 bg-gray-100 text-gray-900 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                                                        View Profile
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* My Groups Tab */}
                        {activeTab === 'mygroups' && (
                            <div>
                                {groups.filter(g => g.members.includes('You')).length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">You haven't joined any groups yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groups.filter(g => g.members.includes('You')).map(group => (
                                            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-green-200 overflow-hidden hover:shadow-md transition-shadow p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="text-lg font-bold text-gray-900 flex-1">{group.name}</h3>
                                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                        {group.membersCount}/{group.maxMembers}
                                                    </span>
                                                </div>

                                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{group.description}</p>

                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <MapPin className="w-4 h-4 mr-2 text-green-600" />
                                                        {group.trail}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Calendar className="w-4 h-4 mr-2 text-green-600" />
                                                        {group.startDate} to {group.endDate}
                                                    </div>
                                                </div>

                                                <button className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                                                    Go to Chat
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Create Group Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Group</h2>

                            <form onSubmit={handleCreateGroup} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                                    <input
                                        type="text"
                                        value={newGroup.name}
                                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                        placeholder="e.g., Everest Base Camp 2026"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Choose Trail *</label>
                                    <select
                                        value={newGroup.trail}
                                        onChange={(e) => setNewGroup({ ...newGroup, trail: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="">Select a trail</option>
                                        {trails.map(trail => (
                                            <option key={trail.id} value={trail.name}>
                                                {trail.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={newGroup.description}
                                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                        placeholder="Tell others about your group..."
                                        rows="3"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                                        <input
                                            type="date"
                                            value={newGroup.startDate}
                                            onChange={(e) => setNewGroup({ ...newGroup, startDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={newGroup.endDate}
                                            onChange={(e) => setNewGroup({ ...newGroup, endDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="50"
                                        value={newGroup.maxMembers}
                                        onChange={(e) => setNewGroup({ ...newGroup, maxMembers: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                                    >
                                        Create Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Mock data for groups and partners
const mockGroups = [
    {
        id: 1,
        name: 'Everest Base Camp Quest 2026',
        description: 'Join us for an epic adventure to Everest Base Camp. We have experienced guides and will take care of logistics.',
        trail: 'Everest Base Camp',
        startDate: '2026-04-15',
        endDate: '2026-05-05',
        membersCount: 8,
        maxMembers: 12,
        createdBy: 'John Doe',
        members: ['John Doe', 'Jane Smith', 'You'],
        status: 'active'
    },
    {
        id: 2,
        name: 'Annapurna Circuit Adventure',
        description: 'Beautiful circuit trek with stunning mountain views. Perfect for intermediate trekkers.',
        trail: 'Annapurna Circuit',
        startDate: '2026-05-01',
        endDate: '2026-05-20',
        membersCount: 5,
        maxMembers: 10,
        createdBy: 'Mike Wilson',
        members: ['Mike Wilson'],
        status: 'active'
    },
    {
        id: 3,
        name: 'Langtang Valley Trail Group',
        description: 'Moderate trek suitable for beginners. Close to Kathmandu, great for a quick getaway.',
        trail: 'Langtang Valley',
        startDate: '2026-03-20',
        endDate: '2026-03-27',
        membersCount: 12,
        maxMembers: 12,
        createdBy: 'Sarah Connor',
        members: ['Sarah Connor'],
        status: 'active'
    },
    {
        id: 4,
        name: 'Poon Hill Sunrise Watchers',
        description: 'Short trek to catch the magnificent sunrise. Back in 4 days.',
        trail: 'Ghorepani Poon Hill',
        startDate: '2026-04-10',
        endDate: '2026-04-14',
        membersCount: 6,
        maxMembers: 8,
        createdBy: 'Tom Hardy',
        members: ['Tom Hardy'],
        status: 'active'
    },
];

const mockPartners = [
    {
        id: 1,
        name: 'Alex Johnson',
        bio: 'Experienced mountaineer. Completed Kilimanjaro, Elbrus, and Aconcagua. Love high altitude trekking.',
        level: 'Expert',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'
    },
    {
        id: 2,
        name: 'Emma Wilson',
        bio: 'Weekend trekker from Kathmandu. Exploring Nepal\'s hidden trails. Always up for new adventures.',
        level: 'Intermediate',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'
    },
    {
        id: 3,
        name: 'Priya Sharma',
        bio: 'Solo traveler. Have trekked in Himalayas, Alps, and Andes. Love photography and meeting new people.',
        level: 'Advanced',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'
    },
    {
        id: 4,
        name: 'David Chen',
        bio: 'Beginner friendly guide. Passionate about sustainable tourism and local culture.',
        level: 'Beginner',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop'
    },
];

export default GroupsPage;
