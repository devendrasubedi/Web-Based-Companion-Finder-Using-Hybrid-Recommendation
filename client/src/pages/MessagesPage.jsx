import React from 'react';
import { MessageCircle, Inbox } from 'lucide-react';

const MessagesPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen pt-24 pb-12 bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-medium text-foreground">Messages</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Chat with your trekking buddies
          </p>
        </div>

        {/* Empty State Container */}
        <div className="flex flex-col items-center justify-center py-16 md:py-24 bg-card rounded-xl border border-border shadow-sm px-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Inbox className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
          </div>

          <h2 className="text-xl md:text-2xl font-medium text-foreground mb-2 text-center">
            No Messages Yet
          </h2>

          <p className="text-muted-foreground text-center max-w-xs md:max-w-md mb-8 text-sm md:text-base">
            Start a conversation by joining a group or connecting with other trekkers to plan your next adventure.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => onNavigate('groups')}
              className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-all shadow-md font-medium text-center"
            >
              Explore Groups
            </button>
            <button
              onClick={() => onNavigate('explore')}
              className="w-full sm:w-auto bg-card text-foreground border-2 border-border px-6 py-3 rounded-lg hover:border-primary/50 transition-all font-medium text-center"
            >
              Find Trails
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;