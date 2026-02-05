import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { useNavigate, useParams } from "react-router-dom";
import Input from "../components/Input";
import { Lock, Mountain } from "lucide-react";
import toast from "react-hot-toast";

const ResetPasswordPage = () => {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const { resetPassword, error, isLoading, message } = useAuthStore();

	const { token } = useParams();
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			alert("Passwords do not match");
			return;
		}
		try {
			await resetPassword(token, password);

			toast.success("Password reset successfully, redirecting to login page...");
			setTimeout(() => {
				navigate("/login");
			}, 2000);
		} catch (error) {
			console.error(error);
			toast.error(error.message || "Error resetting password");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-primary via-secondary to-accent relative overflow-hidden">
			{/* Decorative Elements */}
			<div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
				<div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
				<div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl" />
			</div>

			<div className="relative w-full max-w-md">
				{/* Logo and Title */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-2xl">
						<Mountain className="w-10 h-10 text-primary" />
					</div>
					<h1 className="text-white text-3xl font-bold mb-2 drop-shadow-lg">TrekMate</h1>
					<p className="text-white/90 drop-shadow font-medium">Find your perfect hiking companion</p>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className='bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20'
				>
					<div className='text-center mb-8'>
						<h2 className='text-2xl font-bold text-foreground mb-2'>
							Reset Password
						</h2>
						<p className='text-muted-foreground'>Enter your new password below</p>
					</div>
					{error && <p className='text-destructive text-sm mb-4'>{error}</p>}
					{message && <p className='text-primary text-sm mb-4'>{message}</p>}

					<form onSubmit={handleSubmit} className="space-y-5">
						<Input
							icon={<Lock className="w-5 h-5" />}
							type='password'
							placeholder='New Password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							label="New Password"
							required
						/>

						<Input
							icon={<Lock className="w-5 h-5" />}
							type='password'
							placeholder='Confirm New Password'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							label="Confirm Password"
							required
						/>

						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className='w-full py-3 px-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 transition duration-200'
							type='submit'
							disabled={isLoading}
						>
							{isLoading ? "Resetting..." : "Set New Password"}
						</motion.button>
					</form>
				</motion.div>
			</div>
		</div>
	);
};
export default ResetPasswordPage;
