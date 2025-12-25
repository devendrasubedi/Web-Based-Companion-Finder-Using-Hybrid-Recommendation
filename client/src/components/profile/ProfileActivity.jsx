import { Mountain, Bookmark } from 'lucide-react';

const ProfileActivity = ({ pastHikes, savedHikes }) => {
    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border min-h-[400px]">
            <h2 className="text-xl font-bold text-foreground mb-8 flex items-center gap-2">
                <Mountain className="w-5 h-5 text-primary" />
                Hiking Activity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* Completed Treks */}
                <div>
                    <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                        <span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span>
                        Completed Treks
                    </h3>
                    {pastHikes && pastHikes.length > 0 ? (
                        <ul className="space-y-3">
                            {pastHikes.map((hike, index) => (
                                <li key={index} className="flex items-start gap-3 group">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted group-hover:bg-primary transition-colors"></div>
                                    {/* Assuming hike is a string or object with name. Based on previous code it was just mapping hike */}
                                    <span className="text-foreground/80 group-hover:text-foreground transition-colors font-medium">
                                        {typeof hike === 'string' ? hike : hike.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-sm italic py-4">No completed treks recorded yet.</p>
                    )}
                </div>

                {/* Saved Trails */}
                <div>
                    <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm"></span>
                        Saved Trails
                    </h3>
                    {savedHikes && savedHikes.length > 0 ? (
                        <ul className="space-y-3">
                            {savedHikes.map((hike, index) => (
                                <li key={index} className="flex items-start gap-3 group cursor-pointer hover:bg-muted p-2 rounded-lg -ml-2 transition-colors">
                                    <Bookmark className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-yellow-500 transition-colors" />
                                    {/* Assuming hike is a string or object with name */}
                                    <span className="text-foreground/80 group-hover:text-foreground transition-colors font-medium">
                                        {typeof hike === 'string' ? hike : hike.name || "Unknown Trail"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-sm italic py-4">No trails saved yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileActivity;
