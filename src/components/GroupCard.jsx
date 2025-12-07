import React from 'react';
import { Calendar, Users, ArrowRight } from 'lucide-react';

const GroupCard = ({ group }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900">{group.title}</h3>
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            Open
          </span>
        </div>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{group.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-green-600" />
            {group.date}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-green-600" />
            {group.membersCount} / {group.maxMembers} Members
          </div>
        </div>

        <button className="w-full bg-white border-2 border-green-600 text-green-600 font-medium py-2 px-4 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
          View Details
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default GroupCard;