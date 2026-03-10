import { MapPin, Calendar, Award, MessageSquare } from 'lucide-react';

export default function UserCard({ user }) {
  const experienceColors = {
    'Beginner': 'bg-green-100 text-green-800',
    'Intermediate': 'bg-blue-100 text-blue-800',
    'Advanced': 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition">
      {/* Header with Avatar */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24"></div>

      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="-mt-12 mb-4">
          <img
            src={user.image}
            alt={user.name}
            className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
          />
        </div>

        {/* Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">{user.name}</h3>

        {/* Experience Badge */}
        <div className="mb-3">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${experienceColors[user.experience] || 'bg-gray-100 text-gray-800'}`}>
            {user.experience}
          </span>
        </div>

        {/* Bio */}
        <p className="text-sm text-gray-600 mb-4">{user.bio}</p>

        {/* Trail Interest */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-gray-700 font-medium">{user.trailInterest}</p>
          </div>
        </div>

        {/* Planned Date */}
        <div className="flex items-start gap-2 mb-4">
          <Calendar size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-gray-700">{new Date(user.plannedDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}</p>
          </div>
        </div>

        {/* Groups Count */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <Award size={16} className="text-orange-600" />
          <span>{user.joinedGroups} group{user.joinedGroups !== 1 ? 's' : ''} joined</span>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
            <MessageSquare size={16} />
            Contact
          </button>
          <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition">
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}
