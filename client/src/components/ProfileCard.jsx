import React from 'react';
import { MapPin, Languages, UserPlus } from 'lucide-react';

const ProfileCard = ({ user, onClick, showAddButton = true }) => {
  // Guard clause to prevent crashes if user data is missing
  if (!user) return null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 p-5 min-w-[280px]"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-linear-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-white text-xl font-bold">{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-gray-900 font-semibold truncate">{user.name}</h4>
          <p className="text-gray-500 text-sm">
            {user.age} years, {user.gender}
          </p>
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{user.district}, {user.province}</span>
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
          onClick={(e) => {
            e.stopPropagation();
            // Add friend logic here
          }}
          className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Add Friend
        </button>
      )}
    </div>
  );
};

export default ProfileCard;