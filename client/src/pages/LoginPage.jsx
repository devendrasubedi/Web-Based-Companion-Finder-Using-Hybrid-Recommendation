import { useState } from 'react';
import { Mountain, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';

const LoginPage = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const { login, isLoading, error } = useAuthStore();
	// Local error state for form validation before API call
	const [formErrors, setFormErrors] = useState({});

	const validateForm = () => {
		const newErrors = {};

		if (!email) {
			newErrors.email = 'Email is required';
		} else if (!/\S+@\S+\.\S+/.test(email)) {
			newErrors.email = 'Please enter a valid email';
		}

		if (!password) {
			newErrors.password = 'Password is required';
		}

		setFormErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) return;

		await login(email, password);
	};

	return (
		<div className="h-screen flex items-center justify-center px-4 py-3 bg-gradient-to-br from-primary via-secondary to-accent relative overflow-hidden">
			{/* Decorative Elements */}
			<div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
				<div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
				<div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl" />
			</div>

			<div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto">
				{/* Logo and Title */}
				<div className="text-center mb-4 sm:mb-5">
					<div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full mb-2 sm:mb-3 shadow-2xl">
						<Mountain className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
					</div>
					<h1 className="text-white text-2xl sm:text-3xl font-bold mb-1 drop-shadow-lg">TrekMate</h1>
					<p className="text-white/90 drop-shadow font-medium text-sm">Find your perfect hiking companion</p>
				</div>

				{/* Login Card */}
				<div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 border border-white/20">
					<div className="text-center mb-3 sm:mb-4">
						<h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1">Welcome Back</h2>
						<p className="text-muted-foreground text-xs sm:text-sm">Login to continue your adventure</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
						<Input
							type="email"
							id="login-email"
							label="Email"
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
							}}
							placeholder="your@email.com"
							icon={<Mail className="w-5 h-5" />}
							error={formErrors.email}
						/>

						<div className="relative">
							<Input
								type={showPassword ? 'text' : 'password'}
								id="login-password"
								label="Password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
								}}
								placeholder="••••••••"
								icon={<Lock className="w-5 h-5" />}
								error={formErrors.password}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground transition-colors z-10"
							>
								{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
							</button>
						</div>

						{error && (
							<div className="p-2 sm:p-2.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium border border-red-100">
								{error}
							</div>
						)}

						<div className="flex items-center justify-between text-xs gap-2">
							<label className="flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
								/>
								<span className="text-muted-foreground whitespace-nowrap">Remember me</span>
							</label>
							<Link
								to="/forgot-password"
								className="text-primary hover:text-primary/80 transition-colors font-medium whitespace-nowrap"
							>
								Forgot password?
							</Link>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full bg-primary text-white py-2 sm:py-2.5 px-4 rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm"
						>
							{isLoading ? (
								<>
									<LoadingSpinner size="sm" />
									<span>Logging in...</span>
								</>
							) : (
								'Login'
							)}
						</button>

						<div className="text-center pt-2.5 sm:pt-3 border-t border-border mt-3 sm:mt-4">
							<p className="text-muted-foreground text-xs sm:text-sm">
								Don&apos;t have an account?{' '}
								<Link
									to="/signup"
									className="text-primary hover:text-primary/80 transition-colors font-medium"
								>
									Sign up
								</Link>
							</p>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;
