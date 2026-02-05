import { motion } from "framer-motion";
import Input from "../components/Input";
import { Loader, Lock, Mail, User, Mountain, Phone, Calendar, MapPin, ChevronDown, UserCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { useAuthStore } from "../store/authStore";
import { nepalData } from "../data/nepalData";

const SignUpPage = () => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [dob, setDob] = useState("");
	const [phone, setPhone] = useState("");
	const [province, setProvince] = useState("");
	const [district, setDistrict] = useState("");
	const [gender, setGender] = useState("");
	const [formErrors, setFormErrors] = useState({});
	const navigate = useNavigate();

	const { signup, error, isLoading } = useAuthStore();

	const validateForm = () => {
		const errors = {};
		if (!name.trim()) errors.name = "Full Name is required";
		if (!dob) errors.dob = "Date of Birth is required";
		if (!gender) errors.gender = "Gender is required";
		if (!phone.trim()) errors.phone = "Phone number is required";
		if (!province) errors.province = "Province is required";
		if (!district) errors.district = "District is required";
		if (!email.trim()) errors.email = "Email is required";
		if (!password) errors.password = "Password is required";
		return errors;
	};

	const handleSignUp = async (e) => {
		e.preventDefault();
		const errors = validateForm();
		if (Object.keys(errors).length > 0) {
			setFormErrors(errors);
			return;
		}
		setFormErrors({});

		try {
			await signup(email, password, name, dob, phone, province, district, gender);
			navigate("/verify-email");
		} catch (error) {
			console.log(error);
		}
	};

	const selectErrorClass = "border-destructive focus:border-destructive focus:ring-destructive/20";
	const selectNormalClass = "border-input focus:ring-primary/20 focus:border-ring";

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-primary via-secondary to-accent relative overflow-hidden">
			{/* Decorative Elements */}
			<div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
				<div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
				<div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl" />
			</div>

			<div className="relative w-full max-w-2xl">
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
							Create Account
						</h2>
						<p className='text-muted-foreground'>Join us for your next adventure</p>
					</div>

					<form onSubmit={handleSignUp} className="space-y-5">

						{/* Name and DOB Row */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<Input
								icon={<User className="w-5 h-5" />}
								type='text'
								placeholder='Full Name'
								value={name}
								onChange={(e) => setName(e.target.value)}
								label="Full Name"
								error={formErrors.name}
							/>
							<Input
								icon={<Calendar className="w-5 h-5" />}
								type='date'
								placeholder='Date of Birth'
								value={dob}
								onChange={(e) => setDob(e.target.value)}
								label="Date of Birth"
								required
								error={formErrors.dob}
							/>
						</div>

						{/* Gender and Phone Row */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							{/* Custom Select for Gender */}
							<div className="w-full">
								<label className="block text-sm font-medium text-foreground mb-1.5">
									Gender
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
										<UserCheck className="w-5 h-5" />
									</div>
									<select
										value={gender}
										onChange={(e) => setGender(e.target.value)}
										className={`w-full bg-input-background border text-foreground text-sm rounded-xl focus:ring-2 block p-3 pl-10 appearance-none outline-none transition-all duration-200 ${formErrors.gender ? selectErrorClass : selectNormalClass}`}
									>
										<option value="" disabled>Select Gender</option>
										<option value="male">Male</option>
										<option value="female">Female</option>
										<option value="other">Other</option>
									</select>
									<div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
										<ChevronDown className="w-4 h-4" />
									</div>
								</div>
								{formErrors.gender && <p className="mt-1.5 text-sm text-destructive">{formErrors.gender}</p>}
							</div>

							<Input
								icon={<Phone className="w-5 h-5" />}
								type='tel'
								placeholder='Phone Number'
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								label="Phone Number"
								error={formErrors.phone}
							/>
						</div>

						{/* Province and District Row */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							{/* Custom Select for Province */}
							<div className="w-full">
								<label className="block text-sm font-medium text-foreground mb-1.5">
									Province
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
										<MapPin className="w-5 h-5" />
									</div>
									<select
										value={province}
										onChange={(e) => {
											setProvince(e.target.value);
											setDistrict(""); // Reset district when province changes
										}}
										className={`w-full bg-input-background border text-foreground text-sm rounded-xl focus:ring-2 block p-3 pl-10 appearance-none outline-none transition-all duration-200 ${formErrors.province ? selectErrorClass : selectNormalClass}`}
									>
										<option value="" disabled>Select Province</option>
										{Object.keys(nepalData).map((prov) => (
											<option key={prov} value={prov}>{prov}</option>
										))}
									</select>
									<div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
										<ChevronDown className="w-4 h-4" />
									</div>
								</div>
								{formErrors.province && <p className="mt-1.5 text-sm text-destructive">{formErrors.province}</p>}
							</div>

							{/* Custom Select for District */}
							<div className="w-full">
								<label className="block text-sm font-medium text-foreground mb-1.5">
									District
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
										<MapPin className="w-5 h-5" />
									</div>
									<select
										value={district}
										onChange={(e) => setDistrict(e.target.value)}
										className={`w-full bg-input-background border text-foreground text-sm rounded-xl focus:ring-2 block p-3 pl-10 appearance-none outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${formErrors.district ? selectErrorClass : selectNormalClass}`}
										disabled={!province}
									>
										<option value="" disabled>Select District</option>
										{province && nepalData[province]?.map((dist) => (
											<option key={dist} value={dist}>{dist}</option>
										))}
									</select>
									<div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
										<ChevronDown className="w-4 h-4" />
									</div>
								</div>
								{formErrors.district && <p className="mt-1.5 text-sm text-destructive">{formErrors.district}</p>}
							</div>
						</div>

						<Input
							icon={<Mail className="w-5 h-5" />}
							type='email'
							placeholder='Email Address'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							label="Email Address"
							error={formErrors.email}
						/>

						<Input
							icon={<Lock className="w-5 h-5" />}
							type='password'
							placeholder='Password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							label="Password"
							error={formErrors.password}
						/>
						{error && <p className='text-destructive text-sm font-semibold mt-2'>{error}</p>}

						<PasswordStrengthMeter password={password} />

						<motion.button
							className='mt-5 w-full py-3 px-4 bg-primary text-white 
						font-bold rounded-xl shadow-lg hover:bg-primary/90
						transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-xl'
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							type='submit'
							disabled={isLoading}
						>
							{isLoading ? <Loader className='animate-spin' size={24} /> : "Sign Up"}
						</motion.button>
					</form>
					<div className='text-center pt-4 border-t border-border mt-6'>
						<p className='text-muted-foreground text-sm'>
							Already have an account?{" "}
							<Link to={"/login"} className='text-primary hover:text-primary/80 transition-colors font-medium'>
								Login
							</Link>
						</p>
					</div>
				</motion.div>
			</div>
		</div>
	);
};
export default SignUpPage;
