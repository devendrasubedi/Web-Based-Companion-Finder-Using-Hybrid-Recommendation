import React from 'react';
import { Users, UserMinus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfileFriends = ({ friends, isOwnProfile, onRemoveFriend }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border h-full">
            <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                <span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span>
                Friends ({friends?.length || 0})
            </h3>
            {friends && friends.length > 0 ? (
                <ul className="space-y-3">
                    {friends.map((friend, index) => (
                        <li key={index} className="flex items-center justify-between gap-3 group p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                onClick={() => navigate(`/profile/${friend.userId}`)}
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-white text-sm font-bold">
                                        {friend.name ? friend.name.charAt(0).toUpperCase() : '?'}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-foreground/80 group-hover:text-foreground transition-colors font-medium">
                                        {friend.name || "Unknown User"}
                                    </span>
                                    {friend.province && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="w-3 h-3" />
                                            <span>{friend.province}, Nepal</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isOwnProfile && onRemoveFriend && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFriend(friend.userId);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                                    title="Remove friend"
                                >
                                    <UserMinus className="w-4 h-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm italic">No friends yet.</p>
                </div>
            )}
        </div>
    );
};

export default ProfileFriends;
