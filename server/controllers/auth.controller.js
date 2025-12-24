import bcryptjs from "bcryptjs";
import crypto from "crypto";

import { User } from "../models/user.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from "../nodemailer/emails.js";
import { stat } from "fs";

export const signup = async (req, res) => {
    const { email, password, name, dob, phone, province, district, gender } = req.body;
    console.log("Signup Request Body:", req.body); // Debug log

    try {
        if (!email) throw new Error("Email is required");
        if (!password) throw new Error("Password is required");
        if (!name) throw new Error("Name is required");
        if (!dob) throw new Error("Date of Birth is required");
        if (!phone) throw new Error("Phone is required");
        if (!province) throw new Error("Province is required");
        if (!district) throw new Error("District is required");
        if (!gender) throw new Error("Gender is required");

        const userAlreadyExists = await User.findOne({ email });
        console.log("userAlreadyExists", userAlreadyExists)
        if (userAlreadyExists) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }
        const hashedPassword = await bcryptjs.hash(password, 10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

        // 1. Create Auth User
        const user = new User({
            email,
            password: hashedPassword,
            name,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000 //24 hours
        })

        await user.save();

        // 2. Create User Profile
        const userProfile = new UserProfile({
            userId: user._id,
            name,
            dob,
            phone,
            province,
            district,
            gender,
            email // Redundant as requested
        });

        await userProfile.save();

        //jwt 
        generateTokenAndSetCookie(res, user._id);
        await sendVerificationEmail(user.email, verificationToken);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                ...user._doc,
                password: undefined
            }
        })

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    //------
    const { code } = req.body;
    try {
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() }
        })

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code." })
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        await sendWelcomeEmail(user.email, user.name)
        res.status(200).json({
            success: true,
            message: "email verified sucessfully",
            user: {
                ...user._doc,
                password: undefined,
            }

        })
    } catch (error) {
        console.log("error in verifyEmail", error)
        res.status(500).json({ message: "Server Error" })
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ sucess: false, message: "Invalid credentials" });
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ sucess: false, message: "Invlaid credentials" });
        }

        generateTokenAndSetCookie(res, user._id);
        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({
            sucess: true,
            message: "Logged in sucessfully",
            user: {
                ...user._doc,
                password: undefined,
            }
        });

    } catch (error) {
        console.log("error in login", error)
        res.status(500).json({ message: "Server Error" });
    }
};

export const logout = async (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ sucess: true, message: "Logged out sucessfully" });
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User with this email does not exist." });
        }

        //genrate reset token
        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

        user.passwordResetToken = resetToken;
        user.passwordResetTokenExpiresAt = resetTokenExpiresAt;

        await user.save();

        //send email with reset link
        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);
        res.status(200).json({ success: true, message: "Password reset email sent successfully." });

    } catch (error) {
        console.log("error in forgotPassword", error);
        res.status(400).json({ success: false, message: "Server Error" });
    }
};


export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetTokenExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired password reset token." });
        }

        //update password

        const hashedPassword = await bcryptjs.hash(password, 10);

        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpiresAt = undefined;
        await user.save();

        await sendResetSuccessEmail(user.email);

        res.status(200).json({ success: true, message: "Password reset successfully." });

    } catch (error) {
        console.log("error in resetPassword", error);
        res.status(400).json({ success: false, message: error.message });
    }
}

export const checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ sucess: true, user })
    } catch (error) {
        console.log("error in checkAuth", error);
        res.status(400).json({ sucess: false, message: error.message });
    }
};

export const savePreferences = async (req, res) => {
    const { interests, experienceLevel, availability, budget, languagesKnown } = req.body;
    const userId = req.userId;

    try {
        const userProfile = await UserProfile.findOne({ userId });

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Update fields
        if (interests) userProfile.interests = interests; // Assuming structure matches model
        if (experienceLevel) userProfile.experienceLevel = experienceLevel.toLowerCase();
        if (availability) {
            // Mapping UI availability string to some meaningful data if needed, or just string for now?
            // The model has availabilityWindow: { startMonth, endMonth }. 
            // The UI sends "Weekends", "Flexible" etc.
            // For now let's might need to adjust the model OR just store it as a string if we change model.
            // Let's store it in a new field 'availabilityType' or map it.
            // Checking model: availabilityWindow is Object. 
            // I will add a generic 'availability' string field to model in next step to support this.
            userProfile.availability = availability;
        }
        if (budget) {
            // Model has budget: { min, max, currency }. UI sends "Low", "Medium".
            // We'll simplistic map for now or again, add a simple string field.
            userProfile.budgetLevel = budget;
        }
        if (languagesKnown) userProfile.languagesKnown = languagesKnown;

        await userProfile.save();

        res.status(200).json({ success: true, message: "Preferences saved successfully", userProfile });

    } catch (error) {
        console.log("Error inside savePreferences: ", error);
        res.status(400).json({ success: false, message: error.message });
    }
};