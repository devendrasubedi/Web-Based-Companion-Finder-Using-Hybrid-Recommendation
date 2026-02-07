import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { Mountain } from "lucide-react";

const EmailVerificationPage = () => {
	const [code, setCode] = useState(["", "", "", "", "", ""]);
	const inputRefs = useRef([]);
	const navigate = useNavigate();

	const { error, isLoading, verifyEmail } = useAuthStore();

	const handleChange = (index, value) => {
		const newCode = [...code];

		// Handle pasted content
		if (value.length > 1) {
			const pastedCode = value.slice(0, 6).split("");
			for (let i = 0; i < 6; i++) {
				newCode[i] = pastedCode[i] || "";
			}
			setCode(newCode);

			// Focus on the last non-empty input or the first empty one
			const lastFilledIndex = newCode.findLastIndex((digit) => digit !== "");
			const focusIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
			inputRefs.current[focusIndex].focus();
		} else {
			newCode[index] = value;
			setCode(newCode);

			// Move focus to the next input field if value is entered
			if (value && index < 5) {
				inputRefs.current[index + 1].focus();
			}
		}
	};

	const handleKeyDown = (index, e) => {
		if (e.key === "Backspace" && !code[index] && index > 0) {
			inputRefs.current[index - 1].focus();
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const verificationCode = code.join("");
		try {
			await verifyEmail(verificationCode);
			navigate("/preferences");
			toast.success("Email verified successfully");
		} catch (error) {
			console.log(error);
		}
	};

	// Auto submit when all fields are filled
	useEffect(() => {
		if (code.every((digit) => digit !== "")) {
			handleSubmit(new Event("submit"));
		}
	}, [code]);

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
					<h2 className='text-3xl font-bold mb-6 text-center text-foreground'>
						Verify Your Email
					</h2>
					<p className='text-center text-muted-foreground mb-6'>Enter the 6-digit code sent to your email address.</p>

					<form onSubmit={handleSubmit} className='space-y-6'>
						<div className='flex justify-between gap-2'>
							{code.map((digit, index) => (
								<input
									key={index}
									ref={(el) => (inputRefs.current[index] = el)}
									type='text'
									maxLength='6'
									value={digit}
									onChange={(e) => handleChange(index, e.target.value)}
									onKeyDown={(e) => handleKeyDown(index, e)}
									className='w-12 h-12 text-center text-2xl font-bold bg-gray-100 text-gray-900 border-2 border-gray-400 rounded-xl focus:border-primary focus:outline-none transition-all'
								/>
							))}
						</div>
						{error && <p className='text-destructive font-semibold mt-2 text-center'>{error}</p>}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							type='submit'
							disabled={isLoading || code.some((digit) => !digit)}
							className='w-full bg-primary text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-primary/90 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
						>
							{isLoading ? "Verifying..." : "Verify Email"}
						</motion.button>
					</form>
				</motion.div>
			</div>
		</div>
	);
};
export default EmailVerificationPage;
