import { Bookmark } from 'lucide-react';

const ProfileSavedHikes = ({ savedHikes }) => {
    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border h-full">
            <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm"></span>
                Saved Trails
            </h3>
            {savedHikes && savedHikes.length > 0 ? (
                <ul className="space-y-3">
                    {savedHikes.map((hike, index) => (
                        <li key={index} className="flex items-start gap-3 group cursor-pointer hover:bg-muted p-2 rounded-lg -ml-2 transition-colors">
                            <Bookmark className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-yellow-500 transition-colors" />
                            <span className="text-foreground/80 group-hover:text-foreground transition-colors font-medium">
                                {typeof hike === 'string' ? hike : hike?.name || "Unknown Trail"}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted-foreground text-sm italic py-4">No trails saved yet.</p>
            )}
        </div>
    );
};

export default ProfileSavedHikes;
