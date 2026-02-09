import React, { useState } from 'react';
import { X, Search, UserPlus, Check } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

const AddMemberModal = ({ onClose, onAddMember, conversationId, currentParticipants }) => {
    const { user: currentUser } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await axios.get(`/api/chat/users/search?query=${query}`);
            if (response.data.success) {
                // Filter out already participating users and already selected users
                const filteredUsers = response.data.users.filter(
                    user =>
                        !currentParticipants.find(p => p._id === user._id) &&
                        !selectedUsers.find(u => u._id === user._id) &&
                        user._id !== currentUser._id
                );
                setSearchResults(filteredUsers);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleUser = (user) => {
        if (selectedUsers.find(u => u._id === user._id)) {
            setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedUsers.length === 0) return;

        setIsLoading(true);
        try {
            const participantIds = selectedUsers.map(u => u._id);
            await onAddMember(participantIds);
            onClose();
        } catch (error) {
            console.error('Error adding members:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl w-full max-w-md overflow-hidden shadow-xl border border-border">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Add Members
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* User Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Add People</label>

                        {/* Selected Users Tags */}
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3 max-h-24 overflow-y-auto">
                                {selectedUsers.map(user => (
                                    <div key={user._id} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-primary/20">
                                        {user.name}
                                        <button onClick={() => toggleUser(user)} className="hover:text-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search users by name or email..."
                                className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            />
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 bg-card border border-border rounded-lg max-h-40 overflow-y-auto shadow-sm">
                                {searchResults.map(user => (
                                    <div
                                        key={user._id}
                                        onClick={() => toggleUser(user)}
                                        className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-semibold text-primary">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{user.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                        <Check className={`w-4 h-4 text-primary ${selectedUsers.find(u => u._id === user._id) ? 'opacity-100' : 'opacity-0'}`} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {isSearching && <p className="text-xs text-muted-foreground mt-2 text-center">Searching...</p>}
                        {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">No users found</p>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedUsers.length === 0 || isLoading}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Adding...
                            </>
                        ) : (
                            'Add Members'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;
