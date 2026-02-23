import React, { useState, useMemo } from 'react';
import {
    Search, X, ChevronDown, ChevronRight,
    Bed, Utensils, Droplets, Camera,
    Building2, ShieldPlus, ShoppingBag,
    MapPin
} from 'lucide-react';

// ─── Category Definitions ───────────────────────────────────────────────────
// Each item maps to OSM tags used in the Overpass query in TrailMap.jsx
export const POI_CATEGORIES = [
    {
        id: 'stay',
        label: 'Stay',
        color: '#0ea5e9',
        icon: <Bed className="w-4 h-4" />,
        items: [
            { id: 'hotel', label: 'Hotels', osmTags: [['tourism', 'hotel'], ['tourism', 'motel']] },
            { id: 'guest_house', label: 'Guest Houses', osmTags: [['tourism', 'guest_house'], ['tourism', 'lodging']] },
            { id: 'alpine_hut', label: 'Teahouses / Huts', osmTags: [['tourism', 'alpine_hut'], ['amenity', 'shelter'], ['tourism', 'chalet']] },
            { id: 'camp_site', label: 'Campsites', osmTags: [['tourism', 'camp_site'], ['tourism', 'caravan_site']] },
        ],
    },
    {
        id: 'food',
        label: 'Food',
        color: '#f97316',
        icon: <Utensils className="w-4 h-4" />,
        items: [
            { id: 'restaurant', label: 'Restaurants', osmTags: [['amenity', 'restaurant'], ['amenity', 'food_court']] },
            { id: 'cafe', label: 'Cafes / Tea', osmTags: [['amenity', 'cafe'], ['amenity', 'bar'], ['amenity', 'pub']] },
            { id: 'fast_food', label: 'Fast Food', osmTags: [['amenity', 'fast_food']] },
        ],
    },
    {
        id: 'water',
        label: 'Water',
        color: '#06b6d4',
        icon: <Droplets className="w-4 h-4" />,
        items: [
            { id: 'drinking_water', label: 'Drinking Water', osmTags: [['amenity', 'drinking_water'], ['amenity', 'water_point']] },
            { id: 'spring', label: 'Springs', osmTags: [['natural', 'spring']] },
            { id: 'waterfall', label: 'Waterfalls', osmTags: [['waterway', 'waterfall']] },
        ],
    },
    {
        id: 'attractions',
        label: 'Attractions',
        color: '#8b5cf6',
        icon: <Camera className="w-4 h-4" />,
        items: [
            { id: 'viewpoint', label: 'Viewpoints', osmTags: [['tourism', 'viewpoint']] },
            { id: 'peak', label: 'Peaks', osmTags: [['natural', 'peak'], ['natural', 'volcano']] },
            { id: 'waterfall_attr', label: 'Waterfalls', osmTags: [['waterway', 'waterfall'], ['natural', 'waterfall']] },
            { id: 'park', label: 'Parks / Reserves', osmTags: [['leisure', 'park'], ['leisure', 'nature_reserve'], ['boundary', 'national_park']] },
            { id: 'museum', label: 'Museums', osmTags: [['tourism', 'museum'], ['tourism', 'attraction']] },
        ],
    },
    {
        id: 'facilities',
        label: 'Facilities',
        color: '#64748b',
        icon: <Building2 className="w-4 h-4" />,
        items: [
            { id: 'toilets', label: 'Toilets', osmTags: [['amenity', 'toilets']] },
            { id: 'parking', label: 'Parking', osmTags: [['amenity', 'parking']] },
            { id: 'bench', label: 'Benches', osmTags: [['amenity', 'bench']] },
            { id: 'waste_bin', label: 'Bins', osmTags: [['amenity', 'waste_basket'], ['amenity', 'waste_disposal']] },
        ],
    },
    {
        id: 'safety',
        label: 'Safety',
        color: '#ef4444',
        icon: <ShieldPlus className="w-4 h-4" />,
        items: [
            { id: 'hospital', label: 'Hospitals', osmTags: [['amenity', 'hospital']] },
            { id: 'clinic', label: 'Clinics', osmTags: [['amenity', 'clinic'], ['amenity', 'doctors']] },
            { id: 'pharmacy', label: 'Pharmacies', osmTags: [['amenity', 'pharmacy']] },
            { id: 'police', label: 'Police', osmTags: [['amenity', 'police']] },
        ],
    },
    {
        id: 'supplies',
        label: 'Supplies',
        color: '#16a34a',
        icon: <ShoppingBag className="w-4 h-4" />,
        items: [
            { id: 'shop', label: 'Shops / Markets', osmTags: [['shop', 'general'], ['shop', 'supermarket'], ['shop', 'convenience']] },
            { id: 'outdoor', label: 'Outdoor Gear', osmTags: [['shop', 'outdoor'], ['shop', 'sports']] },
            { id: 'bakery', label: 'Bakeries', osmTags: [['shop', 'bakery']] },
        ],
    },
];

// ─── Component ───────────────────────────────────────────────────────────────
const PoiSidebar = ({ selectedFilters, toggleFilter, clearFilters, isLoading, poiCount = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleGroup = (groupId) =>
        setOpenGroups(prev =>
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );

    // Filter visible categories by search term
    const visibleCategories = useMemo(() => {
        if (!searchTerm.trim()) return POI_CATEGORIES;
        const q = searchTerm.toLowerCase();
        return POI_CATEGORIES.map(cat => ({
            ...cat,
            items: cat.items.filter(item => item.label.toLowerCase().includes(q)),
        })).filter(cat => cat.label.toLowerCase().includes(q) || cat.items.length > 0);
    }, [searchTerm]);

    const totalActive = selectedFilters.length;

    // ── Collapsed button ──────────────────────────────────────────────────────
    if (!isOpen) {
        return (
            <div className="absolute bottom-6 left-3 z-[9999]">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-sm hover:bg-white hover:shadow-md transition-all border border-border text-sm font-medium text-foreground group"
                >
                    {isLoading
                        ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <MapPin className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    }
                    <span>{isLoading ? 'Searching…' : 'Find Nearby'}</span>
                    {totalActive > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            {totalActive}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    // ── Expanded panel ────────────────────────────────────────────────────────
    return (
        <div className="absolute bottom-6 left-3 z-[9999] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl w-72 max-h-[390px] flex flex-col border border-border overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">Nearby POIs</span>
                        {poiCount > 0 && (
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {poiCount} found
                            </span>
                        )}
                        {isLoading && (
                            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin ml-1" />
                        )}
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-gray-200/60 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search categories…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-muted-foreground text-foreground transition"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Category list */}
            <div className="overflow-y-auto flex-1 p-2">
                {visibleCategories.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-6">No categories match "{searchTerm}"</p>
                )}

                {visibleCategories.map(cat => {
                    const isExpanded = openGroups.includes(cat.id);
                    const activeCount = cat.items.filter(i => selectedFilters.includes(i.id)).length;
                    const allActive = activeCount === cat.items.length;

                    return (
                        <div key={cat.id} className="mb-1 last:mb-0">
                            {/* Category header */}
                            <div className={`flex items-center w-full pr-2.5 rounded-xl transition-all ${isExpanded ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50/70'}`}>
                                <div
                                    className="p-2.5 cursor-pointer flex items-center shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        cat.items.forEach(item => {
                                            const isOn = selectedFilters.includes(item.id);
                                            if (allActive ? isOn : !isOn) toggleFilter(item.id);
                                        });
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={allActive}
                                        ref={el => { if (el) el.indeterminate = activeCount > 0 && !allActive }}
                                        onChange={() => { }}
                                        className="h-3.5 w-3.5 rounded border-gray-300 cursor-pointer accent-current"
                                        style={{ accentColor: cat.color }}
                                    />
                                </div>
                                <button
                                    onClick={() => toggleGroup(cat.id)}
                                    className="flex items-center flex-1 py-1.5 text-sm font-medium focus:outline-none"
                                >
                                    {/* Color dot + icon */}
                                    <span
                                        className="flex items-center justify-center w-7 h-7 rounded-lg mr-2.5 shrink-0"
                                        style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                                    >
                                        {cat.icon}
                                    </span>
                                    <span className="flex-1 text-left text-xs">{cat.label}</span>
                                    {activeCount > 0 && (
                                        <span
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-2"
                                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                                        >
                                            {activeCount}/{cat.items.length}
                                        </span>
                                    )}
                                    {isExpanded
                                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    }
                                </button>
                            </div>

                            {/* Sub-items */}
                            {isExpanded && (
                                <div className="ml-10 mr-1 mt-0.5 mb-1.5 space-y-0.5">
                                    {cat.items.map(item => {
                                        const checked = selectedFilters.includes(item.id);
                                        return (
                                            <label
                                                key={item.id}
                                                className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors select-none"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleFilter(item.id)}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 cursor-pointer accent-current"
                                                    style={{ accentColor: cat.color }}
                                                />
                                                <span className={`text-xs transition-colors ${checked ? 'text-gray-900 font-medium' : 'text-gray-500 group-hover:text-gray-700'
                                                    }`}>
                                                    {item.label}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer — clear all */}
            {totalActive > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/40 flex justify-between items-center shrink-0">
                    <span className="text-[11px] text-gray-500">
                        {totalActive} filter{totalActive > 1 ? 's' : ''} active
                    </span>
                    <button
                        onClick={() => { clearFilters(); setSearchTerm(''); }}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-medium px-3 py-1.5 rounded-full transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
};

export default PoiSidebar;