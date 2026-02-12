import React, { useState } from 'react';
import { Search, X, ChevronDown, ChevronRight, Bed, Utensils, Trees, Camera } from 'lucide-react';

export const POI_GROUPS = [
    {
        id: 'accommodation',
        label: 'Accommodation',
        icon: <Bed className="w-4 h-4" />,
        items: [
            { id: 'hotel', label: 'Hotels', types: ['hotel', 'motel', 'hostel'] },
            { id: 'guest_house', label: 'Guest Houses / Lodges', types: ['guest_house', 'lodging'] },
            { id: 'hut', label: 'Teahouses / Huts', types: ['alpine_hut', 'shelter', 'hut', 'chalet'] },
            { id: 'campsite', label: 'Campsites', types: ['camp_site', 'caravan_site'] }
        ]
    },
    {
        id: 'food_water',
        label: 'Food & Water',
        icon: <Utensils className="w-4 h-4" />,
        items: [
            { id: 'restaurant', label: 'Restaurants', types: ['restaurant', 'food_court'] },
            { id: 'cafe', label: 'Cafes / Tea Shops', types: ['cafe', 'tea_shop', 'bar'] },
            { id: 'water', label: 'Water Points', types: ['drinking_water', 'water_point', 'fountain'] }
        ]
    },
    {
        id: 'nature',
        label: 'Nature',
        icon: <Trees className="w-4 h-4" />,
        items: [
            { id: 'peak', label: 'Peaks', types: ['peak', 'volcano', 'saddle'] },
            { id: 'lake', label: 'Lakes', types: ['lake', 'water', 'pond'] },
            { id: 'river', label: 'Rivers', types: ['river_bank', 'stream', 'waterfall', 'spring'] },
            { id: 'forest', label: 'Forests', types: ['forest', 'wood'] },
            { id: 'park', label: 'National Parks', types: ['national_park', 'protected_area'] }
        ]
    },
    {
        id: 'attractions',
        label: 'Viewpoints & Attractions',
        icon: <Camera className="w-4 h-4" />,
        items: [
            { id: 'viewpoint', label: 'Viewpoints', types: ['viewpoint'] },
            { id: 'attraction', label: 'Attractions', types: ['attraction', 'artwork', 'museum', 'information'] }
        ]
    }
];

const PoiSidebar = ({ selectedFilters, toggleFilter, clearFilters, isLoading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState([]); 

    const toggleGroup = (groupId) => {
        setOpenGroups(prev => 
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );
    };

    if (!isOpen) {
        return (
            <div className="absolute top-4 left-4 z-[500]">
                <button 
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all border border-gray-200/50 text-sm font-medium text-gray-700 group"
                >
                    {isLoading ? <span className="animate-spin">⌛</span> : <Search className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform" />}
                    {isLoading ? 'Searching...' : 'Search Nearby...'}
                </button>
            </div>
        );
    }

    return (
        <div className="absolute top-4 left-4 z-[500] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl w-72 max-h-[80vh] flex flex-col border border-gray-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <span className="font-semibold text-sm text-gray-800">Explore Nearby</span>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-gray-200/50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="overflow-y-auto p-2 scrollbar-hide">
                {POI_GROUPS.map(group => {
                    const isOpen = openGroups.includes(group.id);
                    const activeCount = group.items.filter(i => selectedFilters.includes(i.id)).length;
                    
                    return (
                        <div key={group.id} className="mb-1 last:mb-0">
                            <button 
                                onClick={() => toggleGroup(group.id)}
                                className={`flex items-center w-full p-3 text-sm font-medium rounded-xl transition-all ${
                                    isOpen ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50/50'
                                }`}
                            >
                                <span className={`mr-3 ${activeCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {group.icon}
                                </span>
                                <span className="flex-1 text-left">{group.label}</span>
                                {activeCount > 0 && (
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-2">
                                        {activeCount}
                                    </span>
                                )}
                                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            </button>
                            
                            {isOpen && (
                                <div className="ml-9 mr-2 my-1 space-y-1 border-l-2 border-gray-100 pl-2">
                                    {group.items.map(item => (
                                        <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors select-none">
                                            <div className="relative flex items-center justify-center">
                                                <input 
                                                    type="checkbox"
                                                    className="peer h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500/20 transition-all cursor-pointer"
                                                    checked={selectedFilters.includes(item.id)}
                                                    onChange={() => toggleFilter(item.id)}
                                                />
                                            </div>
                                            <span className={`text-xs ${selectedFilters.includes(item.id) ? 'text-gray-900 font-medium' : 'text-gray-500 group-hover:text-gray-700'} transition-colors`}>
                                                {item.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedFilters.length > 0 && (
                <div className="p-3 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{selectedFilters.length} active filters</span>
                    <button 
                        onClick={clearFilters}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        Clear Selection
                    </button>
                </div>
            )}
        </div>
    );
};

export default PoiSidebar;