import { Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfileSavedHikes = ({ savedHikes }) => {
    const navigate = useNavigate();

    const handleHikeClick = (hike) => {
        const hikeId = typeof hike === 'string' ? hike : (hike.trailId || hike.id || hike._id);
        if (hikeId) navigate(`/trail/${hikeId}`);
    };

    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border h-full">
            <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm"></span>
                Saved Trails
            </h3>
            {savedHikes && savedHikes.length > 0 ? (
                <ul className="space-y-3">
                    {savedHikes.map((hike, index) => {
                        const name = typeof hike === 'string' ? hike : (hike?.trailName || hike?.name || 'Unknown Trail');
                        const savedAt = hike?.savedAt ? new Date(hike.savedAt).toLocaleDateString() : null;
                        const distance = hike?.distance_km ? `${hike.distance_km} km` : null;

                        return (
                            <li
                                key={index}
                                onClick={() => handleHikeClick(hike)}
                                className="flex items-start gap-3 group cursor-pointer hover:bg-muted p-2 rounded-lg -ml-2 transition-colors"
                            >
                                <Bookmark className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-yellow-500 transition-colors shrink-0" />
                                <div className="min-w-0">
                                    <span className="text-foreground/80 group-hover:text-foreground transition-colors font-medium block truncate">
                                        {name}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {distance && <span>{distance}</span>}
                                        {savedAt && <span>{savedAt}</span>}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-muted-foreground text-sm italic py-4">No trails saved yet.</p>
            )}
        </div>
    );
};

export default ProfileSavedHikes;
