import React from 'react';
import { MessageCircle } from 'lucide-react';
import ChatContainer from '../components/chat/ChatContainer';

const MessagesPage = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-medium text-foreground">Messages</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Chat with your trekking buddies
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
          <ChatContainer />
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;