import bcryptjs from "bcryptjs";
import crypto from "crypto";

import { User } from "../models/user.model.js";
import { UserProfile } from "../models/userProfile.model.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from "../nodemailer/emails.js";
import { stat } from "fs";

export const signup = async (req, res) => {
    const { email, password, name, dob, phone, province, district, gender } = req.body;

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
                ...userProfile._doc,
                _id: user._id,
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

        const userProfile = await UserProfile.findOne({ userId: user._id });

        await sendWelcomeEmail(user.email, user.name)
        res.status(200).json({
            success: true,
            message: "email verified sucessfully",
            user: {
                ...user._doc,
                ...(userProfile ? userProfile._doc : {}),
                _id: user._id,
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

        const userProfile = await UserProfile.findOne({ userId: user._id });

        res.status(200).json({
            sucess: true,
            message: "Logged in sucessfully",
            user: {
                ...user._doc,
                ...userProfile?._doc,
                _id: user._id,
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
        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`, user.name);
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

        await sendResetSuccessEmail(user.email, user.name);

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

        const userProfile = await UserProfile.findOne({ userId: req.userId });

        res.status(200).json({
            sucess: true,
            user: {
                ...user._doc,
                ...(userProfile ? userProfile._doc : {}),
                _id: user._id,
                password: undefined,
            }
        })
    } catch (error) {
        console.log("error in checkAuth", error);
        res.status(400).json({ sucess: false, message: error.message });
    }
};

export const savePreferences = async (req, res) => {
    const { interests, experienceLevel, availability, budget, languagesKnown } = req.body;
    const userId = req.userId;

    try {
        const user = await User.findById(userId); // Need user for merging
        const userProfile = await UserProfile.findOne({ userId });

        if (!userProfile) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        // Update fields
        if (interests) userProfile.interests = interests;
        if (experienceLevel) userProfile.experienceLevel = experienceLevel.toLowerCase();
        if (availability) userProfile.availability = availability;
        if (budget) userProfile.budgetLevel = budget;
        if (languagesKnown) userProfile.languagesKnown = languagesKnown;

        await userProfile.save();

        res.status(200).json({
            success: true,
            message: "Preferences saved successfully",
            user: {
                ...user._doc,
                ...userProfile._doc,
                _id: user._id,
                password: undefined
            }
        });

    } catch (error) {
        console.log("Error inside savePreferences: ", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateProfile = async (req, res) => {
    const { name, bio, gender, phone, province, district, languagesKnown } = req.body;
    const userId = req.userId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userProfile = await UserProfile.findOne({ userId });

        if (name) user.name = name;
        await user.save();

        if (userProfile) {
            if (name) userProfile.name = name;
            if (gender) userProfile.gender = gender;
            if (phone) userProfile.phone = phone;
            if (province) userProfile.province = province;
            if (district) userProfile.district = district;
            if (bio !== undefined) userProfile.bio = bio;
            if (languagesKnown !== undefined) userProfile.languagesKnown = languagesKnown;

            await userProfile.save();
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                ...user._doc,
                ...(userProfile ? userProfile._doc : {}),
                _id: user._id,
                password: undefined,
            }
        });

    } catch (error) {
        console.log("Error in updateProfile: ", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};