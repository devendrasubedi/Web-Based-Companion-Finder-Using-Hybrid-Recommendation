import { motion } from "framer-motion";

const LoadingSpinner = ({ size = "md" }) => {
	const sizeClasses = {
		sm: "w-5 h-5 border-2",
		md: "w-8 h-8 border-4",
		lg: "w-16 h-16 border-4"
	};

	return (
		<motion.div
			className={`${sizeClasses[size]} border-current border-t-transparent rounded-full`}
			animate={{ rotate: 360 }}
			transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
		/>
	);
};

export default LoadingSpinner;