import React from 'react';
import { MapPin, Languages, UserPlus, UserCheck, Clock } from 'lucide-react';

const ProfileCard = ({
  user,
  onClick,
  showAddButton = true,
  friendStatus = 'none', // 'none', 'friends', 'request_sent', 'request_received'
  onAddFriend,
  onAcceptRequest
}) => {
  // Guard clause to prevent crashes if user data is missing
  if (!user) return null;

  const handleFriendAction = (e) => {
    e.stopPropagation();

    // Use _id preferably, fallback to id
    const userId = user._id || user.id;

    if (friendStatus === 'request_received' && onAcceptRequest) {
      onAcceptRequest(userId, user.name);
    } else if (friendStatus === 'none' && onAddFriend) {
      onAddFriend(userId, user.name);
    }
  };

  const getButtonContent = () => {
    switch (friendStatus) {
      case 'friends':
        return {
          icon: <UserCheck className="w-4 h-4" />,
          text: 'Friends',
          className: 'bg-green-100 text-green-700 cursor-default',
          disabled: true
        };
      case 'request_sent':
        return {
          icon: <Clock className="w-4 h-4" />,
          text: 'Request Sent',
          className: 'bg-gray-100 text-gray-600 cursor-default',
          disabled: true
        };
      case 'request_received':
        return {
          icon: <UserPlus className="w-4 h-4" />,
          text: 'Accept Request',
          className: 'bg-blue-600 text-white hover:bg-blue-700',
          disabled: false
        };
      default:
        return {
          icon: <UserPlus className="w-4 h-4" />,
          text: 'Add Friend',
          className: 'bg-green-600 text-white hover:bg-green-700',
          disabled: false
        };
    }
  };

  const buttonConfig = getButtonContent();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 p-4 min-w-[260px] w-full"
    >
      <div className="flex items-center gap-3">
        <div className="w-[15%] min-w-[50px] max-w-[60px] aspect-square bg-linear-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shrink-0">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-white text-xl font-bold">{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-gray-900 font-semibold truncate">{user.name}</h4>
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            {user.age && <span>{user.age} years | </span>}
            <span className="truncate">{user.gender}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{user.province}, Nepal</span>
          </div>
          {user.languages && user.languages.length > 0 && (
            <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
              <Languages className="w-3 h-3" />
              <span className="truncate">{user.languages.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
      {showAddButton && (
        <button
          onClick={handleFriendAction}
          disabled={buttonConfig.disabled}
          className={`w-full mt-4 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium ${buttonConfig.className}`}
        >
          {buttonConfig.icon}
          {buttonConfig.text}
        </button>
      )}
    </div>
  );
};

export default ProfileCard;