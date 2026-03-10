import { Navigate, Route, Routes, Outlet } from "react-router-dom";


import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import HomePage from "./pages/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ExploreSearchPage from "./pages/ExploreSearchPage";
import GroupsPage from "./pages/GroupsPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import TrailDetails from "./pages/TrailDetails";
import PreferencesPage from "./pages/PreferencesPage";

import LoadingSpinner from "./components/LoadingSpinner";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { useEffect } from "react";
import { SocketProvider } from "./context/SocketContext";

// protect routes that require full authentication (login + verified)
const ProtectedRoute = ({ children }) => {
	const { isAuthenticated, user } = useAuthStore();

	if (!isAuthenticated) {
		return <Navigate to='/login' replace />;
	}

	if (!user?.isVerified) {
		return <Navigate to='/verify-email' replace />;
	}

	return children;
};

// Protect profile route - redirects to homepage if not authenticated
const ProtectedProfileRoute = ({ children }) => {
	const { isAuthenticated, user } = useAuthStore();

	if (!isAuthenticated) {
		return <Navigate to='/' replace />;
	}

	if (!user?.isVerified) {
		return <Navigate to='/verify-email' replace />;
	}

	return children;
};

// Protect pages that should only be accessible to authenticated users (for messaging etc)
const AuthRequiredRoute = ({ children }) => {
	const { isAuthenticated } = useAuthStore();

	if (!isAuthenticated) {
		return <Navigate to='/login' replace />;
	}

	return children;
};

// redirect authenticated users away from auth pages
const RedirectAuthenticatedUser = ({ children }) => {
	const { isAuthenticated, user } = useAuthStore();

	if (isAuthenticated && user?.isVerified) {
		return <Navigate to='/' replace />;
	}

	return children;
};

const MainLayout = () => {
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<NavBar />
			<main className="grow">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
};

const AuthLayout = () => {
	return (
		<div className='min-h-screen bg-linear-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center relative overflow-hidden'>
			<div className='absolute inset-0 overflow-hidden'>
				<div className='absolute -top-40 -left-40 w-80 h-80 border-4 border-emerald-500 rounded-full opacity-10 animate-blob'></div>
				<div className='absolute top-0 -right-20 w-80 h-80 border-4 border-emerald-500 rounded-full opacity-10 animate-blob animation-delay-2000'></div>
				<div className='absolute -bottom-40 left-20 w-80 h-80 border-4 border-emerald-500 rounded-full opacity-10 animate-blob animation-delay-4000'></div>
			</div>
			<Outlet />
		</div>
	);
}

function App() {
	const { isCheckingAuth, checkAuth } = useAuthStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	if (isCheckingAuth) return <LoadingSpinner />;

	return (
		<SocketProvider>
			<Routes>
				{/* Public Routes with MainLayout - No authentication required for access */}
				<Route element={<MainLayout />}>
					{/* HomePage - Fully public, no auth required */}
					<Route path='/' element={<HomePage />} />
					{/* These pages are public but contain action-protected buttons */}
					<Route path='/explore' element={<ExploreSearchPage />} />
					<Route path='/trail/:id' element={<TrailDetails />} />
					{/* Others' profiles are public for viewing */}
					<Route path='/profile/:id' element={<ProfilePage />} />
				</Route>

				{/* Protected Routes - Require authentication */}
				<Route
					element={
						<AuthRequiredRoute>
							<MainLayout />
						</AuthRequiredRoute>
					}
				>
					{/* Own profile - requires login (redirects to home if not authenticated) */}
					<Route path='/profile' element={<ProfilePage />} />
					{/* These pages require login */}
					<Route path='/groups' element={<GroupsPage />} />
					<Route path='/messages' element={<MessagesPage />} />
					<Route path='/messages/:conversationId' element={<MessagesPage />} />
					<Route path='/preferences' element={<PreferencesPage />} />
				</Route>

				{/* Standalone Auth Routes */}
				<Route
					path='/signup'
					element={
						<RedirectAuthenticatedUser>
							<SignUpPage />
						</RedirectAuthenticatedUser>
					}
				/>
				<Route
					path='/login'
					element={
						<RedirectAuthenticatedUser>
							<LoginPage />
						</RedirectAuthenticatedUser>
					}
				/>
				<Route path='/verify-email' element={<EmailVerificationPage />} />
				<Route
					path='/forgot-password'
					element={
						<RedirectAuthenticatedUser>
							<ForgotPasswordPage />
						</RedirectAuthenticatedUser>
					}
				/>
				<Route
					path='/reset-password/:token'
					element={
						<RedirectAuthenticatedUser>
							<ResetPasswordPage />
						</RedirectAuthenticatedUser>
					}
				/>
				{/* catch all routes */}
				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
			<Toaster />
		</SocketProvider>
	);
}

export default App;