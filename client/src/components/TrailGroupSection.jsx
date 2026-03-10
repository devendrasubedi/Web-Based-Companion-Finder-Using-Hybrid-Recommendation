import React, { useState } from 'react';
import { Users, Plus, MapPin, Calendar, UserPlus, ArrowRight } from 'lucide-react';

const TrailGroupSection = ({ trailName, trailId }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [groups, setGroups] = useState([
        {
            id: 1,
            name: 'Everest Base Camp Quest 2026',
            description: 'Join us for an epic adventure. Experienced guides included.',
            trail: trailName,
            startDate: '2026-04-15',
            endDate: '2026-05-05',
            membersCount: 8,
            maxMembers: 12,
            createdBy: 'John Doe',
            members: ['John Doe', 'Jane Smith'],
            status: 'active'
        },
        {
            id: 2,
            name: 'Solo Trekkers Unite',
            description: 'For independent trekkers. We share tips and enjoy the journey together.',
            trail: trailName,
            startDate: '2026-05-10',
            endDate: '2026-05-25',
            membersCount: 5,
            maxMembers: 8,
            createdBy: 'Sarah Connor',
            members: ['Sarah Connor'],
            status: 'active'
        }
    ]);
    const [newGroup, setNewGroup] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        maxMembers: 10
    });

    const handleCreateGroup = (e) => {
        e.preventDefault();
        if (!newGroup.name || !newGroup.startDate) {
            alert('Please fill in all required fields');
            return;
        }

        const createdGroup = {
            id: Date.now(),
            name: newGroup.name,
            description: newGroup.description,
            trail: trailName,
            startDate: newGroup.startDate,
            endDate: newGroup.endDate,
            membersCount: 1,
            maxMembers: newGroup.maxMembers,
            createdBy: 'You',
            members: ['You'],
            status: 'active'
        };

        setGroups([createdGroup, ...groups]);
        setNewGroup({
            name: '',
            description: '',
            startDate: '',
            endDate: '',
            maxMembers: 10
        });
        setShowCreateModal(false);
    };

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Trekking Groups</h2>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Create Group
                </button>
            </div>

            <p className="text-gray-600 mb-6">Find fellow trekkers going to {trailName} or create your own group.</p>

            {/* Groups List */}
            {groups.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No groups yet for this trail. Be the first to create one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {groups.map(group => {
                        const isFull = group.membersCount >= group.maxMembers;
                        return (
                            <div
                                key={group.id}
                                className="border border-gray-200 rounded-lg p-4 hover:border-green-400 hover:shadow-md transition-all"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900 line-clamp-2">{group.name}</h3>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                                        isFull
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-green-100 text-green-800'
                                    }`}>
                                        {group.membersCount}/{group.maxMembers}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.description}</p>

                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <span>{group.startDate} to {group.endDate}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <span>Led by {group.createdBy}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleJoinGroup(group.id)}
                                    disabled={isFull}
                                    className={`w-full font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 ${
                                        isFull
                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {isFull ? (
                                        <>Group Full</>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            Join
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* View All Groups Link */}
            {groups.length > 0 && (
                <a
                    href="/groups"
                    className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                >
                    View all groups
                    <ArrowRight className="w-4 h-4" />
                </a>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Group for {trailName}</h2>

                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                                <input
                                    type="text"
                                    value={newGroup.name}
                                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                    placeholder={`e.g., ${trailName} 2026 Adventure`}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newGroup.description}
                                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                    placeholder="Tell others about your group and what you're looking for in trekking partners..."
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
                                        required
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
    );
};

export default TrailGroupSection;
