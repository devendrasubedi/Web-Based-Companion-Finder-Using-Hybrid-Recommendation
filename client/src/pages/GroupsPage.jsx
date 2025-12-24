import React from 'react';
import { Users } from 'lucide-react';

const GroupsPage = () => {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-green-100 p-6 rounded-full mb-6">
                <Users className="w-16 h-16 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Groups Coming Soon</h1>
            <p className="text-gray-600 max-w-md">
                We're building a way for you to connect with fellow trekkers, plan trips, and share experiences. Stay tuned!
            </p>
        </div>
    );
};

export default GroupsPage;
