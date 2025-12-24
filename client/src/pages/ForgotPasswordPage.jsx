import { motion } from "framer-motion";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import Input from "../components/Input";
import { ArrowLeft, Loader, Mail, Mountain } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPasswordPage = () => {
	const [email, setEmail] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);

	const { isLoading, forgotPassword } = useAuthStore();

	const handleSubmit = async (e) => {
		e.preventDefault();
		await forgotPassword(email);
		setIsSubmitted(true);
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary via-secondary to-accent relative overflow-hidden">
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
							Forgot Password
						</h2>
						{!isSubmitted && <p className='text-muted-foreground'>Enter your email to reset your password</p>}
					</div>

					{!isSubmitted ? (
						<form onSubmit={handleSubmit} className="space-y-5">
							<Input
								icon={<Mail className="w-5 h-5" />}
								type='email'
								placeholder='Email Address'
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								label="Email Address"
								required
							/>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								className='w-full py-3 px-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 transition duration-200 flex items-center justify-center'
								type='submit'
							>
								{isLoading ? <Loader className='size-6 animate-spin' /> : "Send Reset Link"}
							</motion.button>
						</form>
					) : (
						<div className='text-center'>
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ type: "spring", stiffness: 500, damping: 30 }}
								className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'
							>
								<Mail className='h-8 w-8 text-primary' />
							</motion.div>
							<p className='text-muted-foreground mb-6'>
								If an account exists for <span className="font-semibold text-foreground">{email}</span>, you will receive a password reset link shortly.
							</p>
						</div>
					)}
					<div className='text-center pt-4 border-t border-border mt-6'>
						<Link to={"/login"} className='text-sm text-primary hover:text-primary/80 flex items-center justify-center transition-colors font-medium'>
							<ArrowLeft className='h-4 w-4 mr-2' /> Back to Login
						</Link>
					</div>
				</motion.div>
			</div>
		</div>
	);
};
export default ForgotPasswordPage;
