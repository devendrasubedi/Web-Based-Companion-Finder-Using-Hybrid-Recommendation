import React from 'react';
import { Clock, TrendingUp, Star, MapPin } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';

const TrailCard = ({ trail, onClick }) => {
  if (!trail) return null;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 h-full flex flex-col w-full"
    >
      {/* Image Container - Slightly shorter on mobile (h-36) */}
      <div className="relative h-36 sm:h-44 overflow-hidden shrink-0">
        <ImageWithFallback
          src={trail.image}
          alt={trail.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Rating Badge */}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-gray-100/50">
          <Star className="w-3 h-3 text-yellow-500 fill-current" />
          <span className="text-[10px] sm:text-xs font-bold text-gray-900">{trail.rating}</span>
        </div>
      </div>
      
      {/* Content Container */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        {/* Location */}
        <div className="flex items-center gap-1 text-gray-500 text-[10px] sm:text-xs mb-1 uppercase tracking-wide font-medium">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{trail.location}</span>
        </div>

        {/* Title - Responsive Text Size */}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 leading-tight group-hover:text-green-700 transition-colors line-clamp-1">
          {trail.name}
        </h3>

        {/* Stats Row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 text-gray-600 text-[10px] sm:text-xs bg-gray-50 px-1.5 py-0.5 rounded">
            <Clock className="w-3 h-3 text-green-600" />
            <span className="font-medium whitespace-nowrap">{trail.duration}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 text-[10px] sm:text-xs bg-gray-50 px-1.5 py-0.5 rounded">
            <TrendingUp className="w-3 h-3 text-orange-500" />
            <span className="capitalize font-medium truncate">{trail.difficulty}</span>
          </div>
        </div>

        {/* Description - Responsive Text Size */}
        <p className="text-gray-500 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-3 h-8 sm:h-10">
          {trail.description || "Experience breathtaking views and diverse landscapes..."}
        </p>

        {/* "View Details" */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-100 flex justify-between items-center">
             <span className="text-[10px] sm:text-xs font-semibold text-green-600 group-hover:underline">View Details</span>
        </div>
      </div>
    </div>
  );
};

export default TrailCard;