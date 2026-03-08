import { useNavigate } from 'react-router-dom';

const ProfilePastHikes = ({ pastHikes }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-border h-full">
            <h3 className="font-bold text-muted-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-border pb-2">
                <span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span>
                Completed Treks
            </h3>
            {pastHikes && pastHikes.length > 0 ? (
                <ul className="space-y-3">
                    {pastHikes.map((hike, index) => {
                        const name = typeof hike === 'string' ? hike : (hike?.trailName || hike?.name || 'Unknown Trek');
                        const trailId = typeof hike === 'string' ? null : (hike?.trailId || hike?.id || hike?._id);
                        const completedAt = hike?.completedAt ? new Date(hike.completedAt).toLocaleDateString() : null;

                        return (
                            <li
                                key={index}
                                onClick={() => trailId && navigate(`/trail/${trailId}`)}
                                className={`flex items-start gap-3 group ${trailId ? 'cursor-pointer hover:bg-muted p-2 rounded-lg -ml-2 transition-colors' : ''}`}
                            >
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted group-hover:bg-primary transition-colors shrink-0"></div>
                                <div className="min-w-0">
                                    <span className="text-foreground/80 group-hover:text-foreground transition-colors font-medium block truncate">
                                        {name}
                                    </span>
                                    {completedAt && (
                                        <span className="text-muted-foreground text-xs">{completedAt}</span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-muted-foreground text-sm italic py-4">No completed treks recorded yet.</p>
            )}
        </div>
    );
};

export default ProfilePastHikes;
