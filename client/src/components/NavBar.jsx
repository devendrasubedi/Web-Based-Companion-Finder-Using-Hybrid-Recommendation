import React, { useState } from 'react';
import { Menu, X, Mountain, User, MessageCircle, Home, Compass, Users, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useChatStore from '../store/useChatStore';
import { useAuthStore } from '../store/authStore';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { conversations } = useChatStore();
  const { isAuthenticated, logout } = useAuthStore();

  const unreadCount = conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

  // Helper to check active state
  const isActive = (path) => location.pathname === path ? "text-green-700 font-semibold" : "text-gray-600 hover:text-green-600";

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Logo Section */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <Mountain className="h-8 w-8 text-green-700" />
            <span className="font-bold text-xl tracking-tight text-gray-900">TrekMate</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`${isActive('/')} transition-colors text-sm font-medium flex items-center gap-1.5`}>
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link to="/explore" className={`${isActive('/explore')} transition-colors text-sm font-medium flex items-center gap-1.5`}>
              <Compass className="w-4 h-4" />
              Explore
            </Link>

            {isAuthenticated ? (
              <>
                <Link to="/groups" className={`${isActive('/groups')} transition-colors text-sm font-medium flex items-center gap-1.5`}>
                  <Users className="w-4 h-4" />
                  Groups
                </Link>
                <Link to="/messages" className={`${isActive('/messages')} transition-colors text-sm font-medium flex items-center gap-1.5 relative`}>
                  <MessageCircle className="w-4 h-4" />
                  Messages
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-3 bg-red-500 text-white text-[10px] font-bold h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile & Logout for Authenticated Users */}
                <div className="border-l border-gray-200 pl-6 ml-2 flex items-center gap-4">
                  <Link to="/profile">
                    <button className={`p-2 rounded-full transition-all ${location.pathname === '/profile' ? 'bg-green-50 text-green-700' : 'bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-700'}`}>
                      <User className="w-5 h-5" />
                    </button>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="p-2 rounded-full transition-all bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Login/Signup buttons for non-authenticated users */}
                <div className="border-l border-gray-200 pl-6 ml-2 flex items-center gap-3">
                  <Link to="/login">
                    <button className="px-4 py-2 text-sm font-medium text-green-700 border border-green-600 rounded-lg hover:bg-green-50 transition-colors">
                      Login
                    </button>
                  </Link>
                  <Link to="/signup">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                      Sign Up
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-green-700 hover:bg-gray-50 focus:outline-none transition-colors gap-2"
            >
              <span className="text-sm font-medium">Menu</span>
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 z-50">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
            >
              <Home className="w-5 h-5" />
              Home
            </Link>
            <Link
              to="/explore"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
            >
              <Compass className="w-5 h-5" />
              Explore
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/groups"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
                >
                  <Users className="w-5 h-5" />
                  Groups
                </Link>
                <Link
                  to="/messages"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50 justify-between"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5" />
                    Messages
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="border-t border-gray-100 my-2 pt-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-green-700 hover:bg-green-50"
                  >
                    <User className="w-5 h-5" />
                    My Profile
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-t border-gray-100 my-2 pt-2 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-green-700 hover:bg-green-50"
                  >
                    <User className="w-5 h-5" />
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;