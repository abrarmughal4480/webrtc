import catchAsyncError from '../middlewares/catchAsyncError.js';
import UserModel from '../models/user.js'; 
import sendResponse from '../utils/sendResponse.js';
import {sendToken} from '../utils/sendToken.js';
import ErrorHandler from '../utils/errorHandler.js';
import sendEmail from '../utils/sendEmail.js';
import crypto from 'crypto';
import fs from 'fs';
import path, {dirname} from 'path';
import {fileURLToPath} from 'url';
import { generateOTP } from '../utils/generateOTP.js';
import { sendMail } from '../services/mailService.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const __dirname = dirname(fileURLToPath(import.meta.url))

// Function to get the logo HTML for email templates
const getLogoSvg = () => {
    try {
        // Use a publicly hosted image URL instead of base64 encoding
        const logoUrl = 'https://res.cloudinary.com/dvpjxumzr/image/upload/v1748924204/logo_kawbyh.png';
        
        // Return an img tag with the URL - increased width and height
        return `<img src="${logoUrl}" alt="Videodesk Logo" style="width: 180px; height: auto;" />`;
    } catch (error) {
        console.error('Error with logo:', error);
        // Fallback to a simple text logo
        return `<div style="font-size: 28px; font-weight: bold; color: white;">VIDEODESK</div>`;
    }
}

export const register = catchAsyncError(async (req, res) => {
	const {email, password, role} = req.body;
	const isExist = await UserModel.findOne({email});
	if(isExist) return sendResponse(false, 401, 'Email already exist',res);
	if( !email || !password || !role){
		return sendResponse(false, 401, 'All fields are required',res);
	}

	const user = await UserModel.create({
		email: email,
		password: password,
        role: role
	});
	
	const OTP = generateOTP()
	
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
	const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Welcome to Videodesk!</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Thank you for registering with Videodesk. To complete your account verification, please use the OTP code below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(to bottom, #f8f9fa, #f0f0f0); border: 2px dashed #9452FF; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9452FF; letter-spacing: 5px;">${OTP}</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.6; text-align: center; font-size: 16px;">Enter this code to verify your account</p>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">This OTP will expire in 10 minutes for security purposes.</p>
                <p style="color: #777; font-size: 14px;">If you didn't create an account with Videodesk, please ignore this email.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `Welcome to Videodesk! Your OTP verification code is: ${OTP}`;
	
	await sendMail(email,"Videodesk - Account Verification OTP", textContent, htmlContent);
	user.OTP = OTP;
	await user.save();

	res.status(200).json({
		success: true,
		message: "OTP Send to your email successfully"
	})
});

export const login = catchAsyncError(async (req, res, next) => {
	const {email, password} = req.body;
	if(!email || !password) return sendResponse(false, 401, 'All fields are required',res);
	let user = await UserModel.findOne({email});

	if (!user)
      return sendResponse(false, 401, 'Incorrect Email or Password',res);

	const isMatch = await user.comparePassword(password);
    if (!isMatch)
		return sendResponse(false, 401, 'Incorrect Email or Password',res);
	
	const OTP = generateOTP();
	
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
	const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Login Verification</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">Hello! We noticed a login attempt to your Videodesk account. Please use the OTP code below to complete your login:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background: linear-gradient(to bottom, #f8f9fa, #f0f0f0); border: 2px dashed #9452FF; padding: 20px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9452FF; letter-spacing: 5px;">${OTP}</p>
                    </div>
                </div>
                <p style="color: #555; line-height: 1.6; text-align: center; font-size: 16px;">Enter this code to access your account</p>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">This OTP will expire in 10 minutes for security purposes.</p>
                <p style="color: #777; font-size: 14px;">If you didn't attempt to login, please secure your account immediately.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `Videodesk Login Verification - Your OTP code is: ${OTP}`;
	
	await sendMail(email,"Videodesk - Login Verification OTP", textContent, htmlContent);
	user.OTP = OTP;
	await user.save();

	res.status(200).json({
		success: true,
		message: "OTP Send to your email successfully"
	})
});

export const verify = catchAsyncError(async (req, res, next) => {
	const {OTP} = req.body;
	if(!OTP) return sendResponse(false, 401, 'All fields are required',res);
	let user = await UserModel.findOne({OTP});

	if (!user)
      return sendResponse(false, 401, 'Invalid OTP or maybe expired',res);

    // Update login times
    const currentTime = new Date();
    
    // Shift current login time to previous login time
    if (user.currentLoginTime) {
        user.previousLoginTime = user.currentLoginTime;
        console.log('📅 Previous login time updated:', user.previousLoginTime);
    }
    
    // Set new current login time
    user.currentLoginTime = currentTime;
    console.log('📅 Current login time updated:', user.currentLoginTime);
    
    // Clear OTP after successful verification
    user.OTP = undefined;
    
    // Save the updated user
    await user.save();
    
    console.log('✅ Login times successfully updated for user:', user.email);
  
    sendToken(res, user, `Welcome back, ${user.email}`, 200);
});




export const loadme = catchAsyncError(async (req, res, next) => {
    const user = await UserModel.findById(req.user._id);
    
    res.status(200).json({
        success: true,
        user: user
    });
});

export const logout = catchAsyncError(async (req, res, next) => {
	res.clearCookie("token");
	res.status(200).json({
		message: "Logged Out",
	});
});

export const updateUser = catchAsyncError(async (req, res, next) => {
	const {email} = req.body;

	const user = await UserModel.findByIdAndUpdate(req.user._id,{email});
	
	sendResponse(true,200,'Update successfully',res);
});

export const changePassword = catchAsyncError(async (req, res, next) => {
	const {oldpassword, newpassword} = req.body;
	const user = await UserModel.findById(req.user._id);
	
	const isMatch = await user.comparePassword(oldpassword);
    if (!isMatch)
		return sendResponse(false, 401, 'Incorrect old password',res);
	
	user.password = newpassword;
	await user.save();
  
    sendResponse(true,200,'Password update successfully',res);
});

// forgot password 
export const forgotPassword = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
        return next(new ErrorHandler("Email is required", 400));
    }
    
    const user = await UserModel.findOne({ email });

    if (!user) return next(new ErrorHandler("User not found", 400));

    const resetToken = await user.getResetToken();
    await user.save();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Add this line to fix the "logoSvg is not defined" error
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">Password Reset Request</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px; margin-bottom: 25px;">You have requested to reset your password. Please click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; box-shadow: 0 4px 10px rgba(148,82,255,0.3); transition: all 0.3s;">Reset Password</a>
                </div>
                <p style="color: #555; line-height: 1.6; font-size: 15px;">Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #0066cc; background-color: #f5f5f5; padding: 12px 15px; border-radius: 6px; font-size: 14px;">${resetUrl}</p>
                <p style="color: #777; font-size: 14px; margin-top: 30px;">If you did not request this password reset, please ignore this email.</p>
                <p style="color: #777; font-size: 14px;">This link will expire in 10 minutes.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `You have requested to reset your password. Click on the link to reset your password: ${resetUrl}. If you have not requested this, please ignore this email.`;
    
    try {
        await sendMail(email, "Password Reset Request", textContent, htmlContent);
        sendResponse(true, 200, `Reset link has been sent to ${user.email}`, res);
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        return next(new ErrorHandler("Email could not be sent", 500));
    }
});

// reset password 
export const resetPassword = catchAsyncError(async (req, res, next) => {
    const { token } = req.params;
  
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  
    const user = await UserModel.findOne({
      resetPasswordToken,
      resetPasswordExpire: {
        $gt: Date.now(),
      },
    });
  
    if (!user)
      return next(new ErrorHandler("Token is invalid or has been expired", 401));
  
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
  
    await user.save();
	sendResponse(true,200,"Password Changed Successfully",res);
});

// Reset password from dashboard (when user is logged in)
export const resetPasswordFromDashboard = catchAsyncError(async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword, recoveryWord } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        return next(new ErrorHandler("All fields are required", 400));
    }
    
    if (newPassword !== confirmPassword) {
        return next(new ErrorHandler("New passwords do not match", 400));
    }
    
    if (currentPassword === newPassword) {
        return next(new ErrorHandler("New password must be different from current password", 400));
    }
    
    if (newPassword.length < 8) {
        return next(new ErrorHandler("Password must be at least 8 characters long", 400));
    }
    
    const user = await UserModel.findById(req.user._id);
    
    // Verify current password
    const isCurrentPasswordMatch = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordMatch) {
        return next(new ErrorHandler("Current password is incorrect", 400));
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    sendResponse(true, 200, "Password updated successfully", res);
});

// Send friend link
export const sendFriendLink = catchAsyncError(async (req, res, next) => {
    const { fromName, fromEmail, toEmail, message, websiteLink } = req.body;
    
    if (!fromName || !fromEmail || !toEmail || !message) {
        return next(new ErrorHandler("All fields are required", 400));
    }
    
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #333; margin-bottom: 20px; font-weight: 600; font-size: 24px; text-align: center;">You've been invited to check out Videodesk!</h2>
                <p style="color: #555; line-height: 1.6; font-size: 16px;">Hi there,</p>
                <p style="color: #555; line-height: 1.6; font-size: 16px;"><strong>${fromName}</strong> (${fromEmail}) wanted to share Videodesk with you.</p>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #9452FF;">
                    <p style="font-style: italic; margin: 0; color: #333; font-size: 16px;">"${message}"</p>
                </div>
                <p style="color: #555; line-height: 1.6; font-size: 16px;">Videodesk is a revolutionary video calling platform that makes remote communication easier than ever.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${websiteLink}" style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; box-shadow: 0 4px 10px rgba(148,82,255,0.3); transition: all 0.3s;">Visit Videodesk</a>
                </div>
                <p style="color: #555; line-height: 1.6; font-size: 16px;">Best regards,<br>The Videodesk Team</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `${fromName} (${fromEmail}) invited you to check out Videodesk: ${message}. Visit: ${websiteLink}`;
    
    try {
        await sendMail(toEmail, `${fromName} invited you to check out Videodesk`, textContent, htmlContent);
        sendResponse(true, 200, `Link sent successfully to ${toEmail}`, res);
    } catch (error) {
        return next(new ErrorHandler("Email could not be sent", 500));
    }
});

// Send Feedback
export const sendFeedback = catchAsyncError(async (req, res, next) => {
    const { feedback } = req.body;
    
    if (!feedback || feedback.trim() === '') {
        return next(new ErrorHandler("Feedback message is required", 400));
    }
    
    const user = req.user;
    
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                <h2 style="margin: 15px 0 0 0; font-size: 20px;">📝 New Feedback Received</h2>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">User Information:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Role:</strong> ${user.role}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">Feedback Message:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; border-left: 4px solid #9452FF; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #555;">${feedback}</p>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">This feedback was sent from Videodesk platform</p>
                <p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `New Feedback from ${user.email} (${user.role}): ${feedback}`;
    
    try {
        await sendMail(process.env.FEEDBACK_EMAIL, `New Feedback from ${user.email}`, textContent, htmlContent);
        sendResponse(true, 200, "Feedback sent successfully", res);
    } catch (error) {
        return next(new ErrorHandler("Failed to send feedback", 500));
    }
});

// Raise Support Ticket
export const raiseSupportTicket = catchAsyncError(async (req, res, next) => {
    const { query } = req.body;
    
    if (!query || query.trim() === '') {
        return next(new ErrorHandler("Support query is required", 400));
    }
    
    const user = req.user;
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Get the logo SVG
    const logoSvg = getLogoSvg();
    
    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #9452FF 0%, #8a42fc 100%); color: white; padding: 30px 20px; text-align: center;">
                <div style="margin-bottom: 15px;">
                    ${logoSvg}
                </div>
                <p style="margin: 5px auto; display: inline-block; background-color: white; color: #9452FF; padding: 5px 15px; border-radius: 50px; font-size: 16px; letter-spacing: 1px; font-weight: 500;">videodesk.co.uk</p>
                <h2 style="margin: 15px 0 0 0; font-size: 22px;">🎫 New Support Ticket</h2>
                <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">${ticketId}</p>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">Customer Information:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> ${user.email}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Role:</strong> ${user.role}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Ticket Created:</strong> ${new Date().toLocaleString()}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>Priority:</strong> <span style="color: #F59E0B; font-weight: bold;">Normal</span></p>
                </div>
                
                <h3 style="color: #333; margin-bottom: 15px; font-weight: 600;">Support Query:</h3>
                <div style="background-color: #f7f4ff; padding: 20px; border-radius: 12px; border-left: 4px solid #9452FF; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 25px;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; color: #555;">${query}</p>
                </div>
                
                <div style="margin-top: 25px; padding: 20px; background-color: #f0f7ff; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <h4 style="color: #3b82f6; margin: 0 0 15px 0; font-weight: 600;">Next Steps:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #555;">
                        <li style="margin-bottom: 8px;">Our support team will review this ticket within 24 hours</li>
                        <li style="margin-bottom: 8px;">You will receive a response at ${user.email}</li>
                        <li>Ticket Reference: ${ticketId}</li>
                    </ul>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
                <p style="margin: 0; color: #777; font-size: 13px;">This support ticket was generated from Videodesk platform</p>
                <p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">© 2024 Videodesk. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const textContent = `New Support Ticket ${ticketId} from ${user.email} (${user.role}): ${query}`;
    
    try {
        await sendMail(process.env.SUPPORT_TICKET_EMAIL, `Support Ticket ${ticketId} - ${user.email}`, textContent, htmlContent);
        sendResponse(true, 200, `Support ticket ${ticketId} created successfully`, res);
    } catch (error) {
        return next(new ErrorHandler("Failed to create support ticket", 500));
    }
});

// Update user logo
export const updateUserLogo = catchAsyncError(async (req, res, next) => {
    const { logoData } = req.body;
    
    if (!logoData) {
        return next(new ErrorHandler("Logo data is required", 400));
    }
    
    try {
        // Get user's current logo URL to delete old one
        const currentUser = await UserModel.findById(req.user._id);
        const oldLogoUrl = currentUser.logo;
        
        // If user has an existing logo, delete it from Cloudinary
        if (oldLogoUrl) {
            try {
                // Extract public_id from the URL
                const urlParts = oldLogoUrl.split('/');
                const fileNameWithExtension = urlParts[urlParts.length - 1];
                const publicId = `videodesk_logos/${fileNameWithExtension.split('.')[0]}`;
                
                console.log('🗑️  Attempting to delete old logo from Cloudinary...');
                console.log('Old logo URL:', oldLogoUrl);
                console.log('Extracted public_id:', publicId);
                
                const deleteResult = await cloudinary.uploader.destroy(publicId);
                
                if (deleteResult.result === 'ok') {
                    console.log('✅ Old logo deleted successfully from Cloudinary');
                } else {
                    console.log('⚠️  Old logo deletion result:', deleteResult);
                }
            } catch (deleteError) {
                console.error('❌ Error deleting old logo from Cloudinary:', deleteError);
                // Continue with upload even if deletion fails
            }
        } else {
            console.log('ℹ️  No existing logo found to delete');
        }
        
        console.log('📤 Uploading new logo to Cloudinary...');
        
        // Upload new logo to cloudinary
        const uploadResult = await cloudinary.uploader.upload(logoData, {
            folder: 'videodesk_logos',
            public_id: `logo_${req.user._id}_${Date.now()}`,
            overwrite: true,
            resource_type: 'auto'
        });
        
        console.log('✅ New logo uploaded successfully to Cloudinary');
        console.log('New logo URL:', uploadResult.secure_url);
        
        // Update user with new logo URL
        const user = await UserModel.findByIdAndUpdate(
            req.user._id, 
            { logo: uploadResult.secure_url },
            { new: true }
        );
        
        console.log('✅ User logo URL updated in database');
        
        res.status(200).json({
            success: true,
            message: "Logo updated successfully",
            logoUrl: uploadResult.secure_url,
            user
        });
        
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        return next(new ErrorHandler("Failed to upload logo", 500));
    }
});

// Update landlord information
export const updateLandlordInfo = catchAsyncError(async (req, res, next) => {
    const { type, logoData, imageData, landlordName, landlordLogo, officerImage, useLandlordLogoAsProfile, profileShape, redirectUrlDefault, redirectUrlTailored } = req.body;
    
    const user = await UserModel.findById(req.user._id);
    
    if (type === 'landlordLogo') {
        console.log('📤 Processing landlord logo upload...');
        
        try {
            // Delete old landlord logo from Cloudinary if exists
            if (user.landlordInfo?.landlordLogo) {
                const oldPublicId = user.landlordInfo.landlordLogo.split('/').pop().split('.')[0];
                console.log('🗑️ Deleting old landlord logo:', oldPublicId);
                await cloudinary.uploader.destroy(`landlord_logos/${oldPublicId}`);
            }
            
            // Upload new logo
            const result = await cloudinary.uploader.upload(logoData, {
                folder: 'landlord_logos',
                public_id: `landlord_logo_${user._id}_${Date.now()}`,
                transformation: [
                    { width: 500, height: 200, crop: 'limit' },
                    { quality: 'auto:good' }
                ]
            });
            
            console.log('✅ New landlord logo uploaded:', result.secure_url);
            
            res.status(200).json({
                success: true,
                message: 'Landlord logo uploaded successfully',
                logoUrl: result.secure_url
            });
        } catch (error) {
            console.error('❌ Error uploading landlord logo:', error);
            return next(new ErrorHandler(error.message, 500));
        }
    }
    else if (type === 'officerImage') {
        console.log('📤 Processing officer image upload...');
        
        try {
            // Delete old officer image from Cloudinary if exists
            if (user.landlordInfo?.officerImage) {
                const oldPublicId = user.landlordInfo.officerImage.split('/').pop().split('.')[0];
                console.log('🗑️ Deleting old officer image:', oldPublicId);
                await cloudinary.uploader.destroy(`officer_images/${oldPublicId}`);
            }
            
            // Upload new image
            const result = await cloudinary.uploader.upload(imageData, {
                folder: 'officer_images',
                public_id: `officer_image_${user._id}_${Date.now()}`,
                transformation: [
                    { width: 400, height: 400, crop: 'limit' },
                    { quality: 'auto:good' }
                ]
            });
            
            console.log('✅ New officer image uploaded:', result.secure_url);
            
            res.status(200).json({
                success: true,
                message: 'Officer image uploaded successfully',
                imageUrl: result.secure_url
            });
        } catch (error) {
            console.error('❌ Error uploading officer image:', error);
            return next(new ErrorHandler(error.message, 500));
        }
    }
    else if (type === 'deleteLandlordLogo') {
        if (user.landlordInfo?.landlordLogo) {
            try {
                const publicId = user.landlordInfo.landlordLogo.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`landlord_logos/${publicId}`);
                
                // Update database
                user.landlordInfo.landlordLogo = undefined;
                if (user.landlordInfo.useLandlordLogoAsProfile) {
                    user.landlordInfo.useLandlordLogoAsProfile = false;
                }
                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "Landlord logo deleted successfully",
                    user: user
                });
            } catch (error) {
                console.log('Error deleting landlord logo:', error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete landlord logo"
                });
            }
        }
    }

    if (type === 'deleteOfficerImage') {
        if (user.landlordInfo?.officerImage) {
            try {
                const publicId = user.landlordInfo.officerImage.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`officer_images/${publicId}`);
                
                // Update database
                user.landlordInfo.officerImage = undefined;
                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "Officer image deleted successfully",
                    user: user
                });
            } catch (error) {
                console.log('Error deleting officer image:', error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete officer image"
                });
            }
        }
    }

    // Handle saving landlord info
    if (type === 'saveLandlordInfo') {
        // Update landlord info
        user.landlordInfo = {
            ...user.landlordInfo,
            landlordName,
            landlordLogo,
            officerImage,
            useLandlordLogoAsProfile,
            profileShape,
            redirectUrlDefault,
            redirectUrlTailored
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Landlord information saved successfully",
            user: user
        });
    }

    return res.status(400).json({
        success: false,
        message: "Invalid request type"
    });

});