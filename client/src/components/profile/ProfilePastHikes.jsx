const ProfilePastHikes = ({ pastHikes }) => {
    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border h-full">
            <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                <span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span>
                Completed Treks
            </h3>
            {pastHikes && pastHikes.length > 0 ? (
                <ul className="space-y-3">
                    {pastHikes.map((hike, index) => (
                        <li key={index} className="flex items-start gap-3 group">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted group-hover:bg-primary transition-colors"></div>
                            <span className="text-foreground/80 group-hover:text-foreground transition-colors font-medium">
                                {typeof hike === 'string' ? hike : hike?.name || "Unknown Trek"}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted-foreground text-sm italic py-4">No completed treks recorded yet.</p>
            )}
        </div>
    );
};

export default ProfilePastHikes;
