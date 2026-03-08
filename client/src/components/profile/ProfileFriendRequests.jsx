import React from 'react';
import { UserPlus, X } from 'lucide-react';

const ProfileFriendRequests = ({ friendRequests, onAccept, onReject }) => {
    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border h-full">
            <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></span>
                Friend Requests ({friendRequests?.length || 0})
            </h3>
            {friendRequests && friendRequests.length > 0 ? (
                <ul className="space-y-3">
                    {friendRequests.map((request, index) => (
                        <li key={index} className="p-3 rounded-lg border border-border bg-muted/30">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-white text-sm font-bold">
                                        {request.name ? request.name.charAt(0).toUpperCase() : '?'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-foreground font-semibold">{request.name || "Unknown User"}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {request.sentAt ? new Date(request.sentAt).toLocaleDateString() : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onAccept(request.userId, request.name)}
                                    className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Accept
                                </button>
                                <button
                                    onClick={() => onReject(request.userId)}
                                    className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <X className="w-4 h-4" />
                                    Reject
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm italic">No pending friend requests.</p>
                </div>
            )}
        </div>
    );
};

export default ProfileFriendRequests;
