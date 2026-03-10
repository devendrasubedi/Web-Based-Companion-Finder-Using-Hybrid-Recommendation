import React, { useState } from 'react';
import { MapPin, Calendar, Users, Zap, Clock, UserCheck, MessageCircle } from 'lucide-react';

const GroupCard = ({ group, onJoin, onViewDetails, onOpenChat, isMember }) => {
  const [hasJoined, setHasJoined] = useState(false);
  
  // Handle both array (from API) and number formats for members
  const memberCount = Array.isArray(group.members)
    ? group.members.length
    : (group.memberCount || group.membersCount || group.members || 0);
  const maxMembers = group.maxMembers || 10;
  const isFull = memberCount >= maxMembers;
  const spotsLeft = maxMembers - memberCount;

  // Trail name: API returns trailName, fallback to trail
  const trailName = group.trailName || group.trail || 'Unknown Trail';

  // Creator name from populated creator object or direct fields
  const creatorName = (typeof group.creator === 'object' && group.creator?.name)
    ? group.creator.name
    : (group.creatorName || group.createdBy || '');

  const difficultyColors = {
    'Easy': 'text-green-600 bg-green-50',
    'Easy to Moderate': 'text-blue-600 bg-blue-50',
    'Moderate': 'text-yellow-600 bg-yellow-50',
    'Challenging': 'text-orange-600 bg-orange-50',
    'Difficult': 'text-red-600 bg-red-50',
    'Very Difficult': 'text-red-700 bg-red-50',
  };

  const handleJoinGroup = () => {
    if (!isFull) {
      setHasJoined(!hasJoined);
      if (onJoin) onJoin(group._id || group.id);
    }
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition">
      {/* Group Image */}
      {group.image && (
        <div className="relative h-32 overflow-hidden bg-gray-200">
          <img
            src={group.image}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Difficulty Badge (always shown at top of card body) */}
      {group.difficulty && (
        <div className="px-5 pt-4 pb-0">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${difficultyColors[group.difficulty] || 'text-gray-600 bg-gray-100'}`}>
            {group.difficulty}
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Creator Info */}
        {creatorName && (
          <div className="flex items-center gap-2 mb-3">
            <div className="text-sm">
              <p className="text-gray-700 font-medium">Organized by {creatorName}</p>
            </div>
          </div>
        )}

        {/* Group Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{group.name}</h3>

        {/* Trail */}
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={16} className="text-blue-600 flex-shrink-0" />
          <p className="text-sm text-gray-700 font-medium">{trailName}</p>
        </div>

        {/* Trek Date */}
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-gray-600">
            {group.trekDate ? new Date(group.trekDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }) : `${group.startDate} to ${group.endDate}`}
          </p>
        </div>

        {/* Duration */}
        {group.duration && (
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-purple-600 flex-shrink-0" />
            <p className="text-sm text-gray-600">{group.duration}</p>
          </div>
        )}

        {/* Description */}
        {group.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">{group.description}</p>
        )}

        {/* Members Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-600" />
              <span className="text-sm font-medium text-gray-900">
                {memberCount}/{maxMembers} Members
              </span>
            </div>
            {!isFull && spotsLeft > 0 && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
              </span>
            )}
            {isFull && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                Full
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {isMember ? (
            /* Member view: Show "Open in Chat" button */
            <button
              onClick={() => onOpenChat && onOpenChat(group.conversationId)}
              className="flex-1 flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm hover:shadow-md"
            >
              <MessageCircle size={16} />
              Open in Chat
            </button>
          ) : (
            /* Browse view: Show "Join Group" button */
            <button
              onClick={handleJoinGroup}
              disabled={isFull}
              className={`flex-1 flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition ${
                hasJoined
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isFull
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {hasJoined ? (
                <>
                  <UserCheck size={16} />
                  Joined
                </>
              ) : isFull ? (
                'Full'
              ) : (
                <>
                  <Zap size={16} />
                  Join Group
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;