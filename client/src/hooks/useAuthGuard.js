import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * Custom hook to guard user actions that require authentication and verification
 * @returns {Object} Object with methods to check authentication/verification and navigate to login
 */
export const useAuthGuard = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  /**
   * Check if user can perform verified actions (friend requests, chat, reviews, ratings, save, etc)
   * @param {string} actionName - Name of the action for error message
   * @returns {boolean} true if user is authenticated and verified, false otherwise
   */
  const canPerformAction = (actionName = 'perform this action') => {
    if (!isAuthenticated) {
      toast.error(`Please login to ${actionName}`);
      navigate('/login', { state: { from: location.pathname } });
      return false;
    }

    if (!user?.isVerified) {
      toast.error(`Please verify your email to ${actionName}`);
      navigate('/verify-email');
      return false;
    }

    return true;
  };

  /**
   * Check only if user is authenticated
   * @param {string} actionName - Name of the action for error message
   * @returns {boolean} true if user is authenticated, false otherwise
   */
  const isUserAuthenticated = (actionName = 'perform this action') => {
    if (!isAuthenticated) {
      toast.error(`Please login to ${actionName}`);
      navigate('/login', { state: { from: location.pathname } });
      return false;
    }
    return true;
  };

  /**
   * Check if user is verified
   * @returns {boolean} true if user is verified, false otherwise
   */
  const isUserVerified = () => {
    return isAuthenticated && user?.isVerified;
  };

  return {
    canPerformAction,
    isUserAuthenticated,
    isUserVerified,
    isAuthenticated,
    user
  };
};
