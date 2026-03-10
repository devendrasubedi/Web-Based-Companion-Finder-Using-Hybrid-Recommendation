import React from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import ChatContainer from '../components/chat/ChatContainer';

const MessagesPage = () => {
  const { conversationId } = useParams();
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background overflow-hidden">
      <div className="flex-1 w-full px-2 sm:px-6 lg:px-8 py-4 flex flex-col min-h-0">
        {/* Header Section */}
        <div className="mb-4 shrink-0 px-2 sm:px-0">
          <div className="flex items-center gap-3 mb-1">
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-medium text-foreground">Messages</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base hidden sm:block">
            Chat with your trekking buddies
          </p>
        </div>

        {/* Chat Container */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-0">
          <ChatContainer initialConversationId={conversationId} />
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;