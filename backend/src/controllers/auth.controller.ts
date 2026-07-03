import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Student } from '../models/Student.model';
import { Otp } from '../models/Otp.model';
import { Session } from '../models/Session.model';
import { authService } from '../services/auth.service';
import { whatsAppService } from '../services/whatsapp.service';
import { emailService } from '../services/email.service';

export class AuthController {

    // ─────────────────────────────────────────────────────────────
    // Step 1: Initialize Login — detect user type, send OTP or ask password
    // ─────────────────────────────────────────────────────────────
    async loginInit(req: Request, res: Response): Promise<void> {
        try {
            const { identifier } = req.body;
            if (!identifier) {
                res.status(400).json({ error: 'Identifier (CP ID or Email) is required' });
                return;
            }

            const cleanId = identifier.trim().toUpperCase();

            // ── Student flow (CP... but not CPT or CPA) ──
            if (cleanId.startsWith('CP') && !cleanId.startsWith('CPT') && !cleanId.startsWith('CPA')) {

                const student = await Student.findOne({ admissionNumber: cleanId });
                if (!student) {
                    res.status(404).json({ error: 'Student not found. Please check your CP ID.' });
                    return;
                }
                if (student.status !== 'ACTIVE') {
                    res.status(403).json({ error: 'Your account is not active. Contact the institute.' });
                    return;
                }
                if (!student.whatsappNumber || !student.cetBucket || !['PCM', 'PCB'].includes(student.cetBucket)) {
                    res.status(403).json({ error: 'Your account is not registered for the CET course or is missing WhatsApp details on the portal.' });
                    return;
                }

                // Check if student is currently locked inside an active exam session
                const lockedSession = await Session.findOne({ userId: cleanId, isExamLocked: true });
                if (lockedSession) {
                    res.status(403).json({
                        error: 'Access Denied: You are currently active inside an ongoing exam hall. OTP login is locked until the test concludes.'
                    });
                    return;
                }

                const whatsappNumber = student.whatsappNumber;

                // OTP Rate Limiting — check existing OTP record
                const existingOtp = await Otp.findOne({ identifier: cleanId }).sort({ createdAt: -1 });
                const rateCheck = authService.checkOtpRateLimit(
                    existingOtp?.lastSentAt ?? null,
                    existingOtp?.resendCount ?? 0
                );

                if (!rateCheck.canSend) {
                    if (existingOtp && existingOtp.expiresAt > new Date()) {
                        res.json({
                            nextStep: 'OTP',
                            message: `An active OTP was already sent to your WhatsApp (${rateCheck.waitLabel} remaining). Please enter it below.`,
                            name: `${student.firstName} ${student.lastName}`,
                            role: 'STUDENT',
                            alreadySent: true
                        });
                        return;
                    }
                    res.status(429).json({
                        error: `OTP already sent. Please wait ${rateCheck.waitLabel} before requesting again.`,
                        waitMs: rateCheck.waitMs
                    });
                    return;
                }

                const otpCode = authService.generateOtp();
                const expiresAt = new Date(Date.now() + 5 * 60_000); // 5 minutes
                const newResendCount = existingOtp ? existingOtp.resendCount + 1 : 0;

                // Delete any old OTPs and create fresh one
                await Otp.deleteMany({ identifier: cleanId });
                await Otp.create({
                    identifier: cleanId,
                    otp: otpCode,
                    expiresAt,
                    lastSentAt: new Date(),
                    resendCount: newResendCount,
                });

                await whatsAppService.sendOtp(whatsappNumber, otpCode);

                const maskedNumber = whatsappNumber.slice(0, 4) + 'XXXXXX';
                res.json({
                    nextStep: 'OTP',
                    message: `OTP sent to your WhatsApp ending in ${whatsappNumber.slice(-4)}.`,
                    name: `${student.firstName} ${student.lastName}`,
                    role: 'STUDENT'
                });
                return;
            }

            // ── Teacher / Admin flow (password) ──
            let user;
            if (identifier.includes('@')) {
                user = await User.findOne({ email: identifier.trim().toLowerCase() });
            } else {
                user = await User.findOne({ cpId: cleanId });
            }

            if (!user) {
                res.status(404).json({ error: 'User not found. Please check your ID or Email.' });
                return;
            }
            if (!user.isActive) {
                res.status(403).json({ error: 'Your account has been deactivated. Contact the admin.' });
                return;
            }

            res.json({
                nextStep: 'PASSWORD',
                message: 'Please enter your password.',
                name: user.name,
                role: user.role
            });

        } catch (error: any) {
            console.error('Login Init Error:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Step 2: Verify — validate OTP or password, return tokens
    // ─────────────────────────────────────────────────────────────
    async loginVerify(req: Request, res: Response): Promise<void> {
        try {
            const { identifier, otp, password } = req.body;
            if (!identifier) {
                res.status(400).json({ error: 'Identifier is required' });
                return;
            }

            const cleanId = identifier.trim().toUpperCase();

            // ── Student OTP flow ──
            if (cleanId.startsWith('CP') && !cleanId.startsWith('CPT') && !cleanId.startsWith('CPA')) {
                if (!otp) {
                    res.status(400).json({ error: 'OTP is required' });
                    return;
                }

                const otpRecord = await Otp.findOne({
                    identifier: cleanId,
                    otp: otp.trim(),
                    expiresAt: { $gt: new Date() }
                });

                if (!otpRecord) {
                    res.status(401).json({ error: 'Invalid or expired OTP. Please try again.' });
                    return;
                }

                // Consume OTP
                await Otp.deleteOne({ _id: otpRecord._id });

                const student = await Student.findOne({ admissionNumber: cleanId });
                if (!student) {
                    res.status(404).json({ error: 'Student not found' });
                    return;
                }
                if (!student.whatsappNumber || !student.cetBucket || !['PCM', 'PCB'].includes(student.cetBucket)) {
                    res.status(403).json({ error: 'Your account is not registered for the CET course or is missing WhatsApp details on the portal.' });
                    return;
                }

                const sessionId = authService.generateSessionId();
                const accessToken = authService.generateAccessToken({ userId: cleanId, role: 'STUDENT', sessionId });
                const refreshToken = authService.generateRefreshToken({ userId: cleanId, role: 'STUDENT' });

                // Single session: delete old, create new
                await Session.deleteMany({ userId: cleanId });
                await Session.create({ userId: cleanId, role: 'STUDENT', sessionId, lastSeen: new Date() });

                res.json({
                    message: 'Login successful',
                    accessToken,
                    refreshToken,
                    user: {
                        cpId: cleanId,
                        name: `${student.firstName} ${student.lastName}`,
                        role: 'STUDENT'
                    }
                });
                return;
            }

            // ── Teacher / Admin password flow ──
            if (!password) {
                res.status(400).json({ error: 'Password is required' });
                return;
            }

            let user;
            if (identifier.includes('@')) {
                user = await User.findOne({ email: identifier.trim().toLowerCase() });
            } else {
                user = await User.findOne({ cpId: cleanId });
            }

            if (!user || !user.password) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            if (!authService.verifyPassword(password, user.password)) {
                res.status(401).json({ error: 'Incorrect password' });
                return;
            }

            const sessionId = authService.generateSessionId();
            const accessToken = authService.generateAccessToken({ userId: user.cpId, role: user.role, sessionId });
            const refreshToken = authService.generateRefreshToken({ userId: user.cpId, role: user.role });
            const hashedRefresh = authService.hashToken(refreshToken);

            // Single session: delete old, create new
            await Session.deleteMany({ userId: user.cpId });
            await Session.create({ userId: user.cpId, role: user.role, sessionId, lastSeen: new Date() });

            // Store hashed refresh token
            await User.updateOne({ cpId: user.cpId }, { refreshToken: hashedRefresh });

            res.json({
                message: 'Login successful',
                accessToken,
                refreshToken,
                user: {
                    cpId: user.cpId,
                    name: user.name,
                    role: user.role,
                    email: user.email,
                    subject: user.subject
                }
            });

        } catch (error: any) {
            console.error('Login Verify Error:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Refresh — silently renew access token (no OTP needed)
    // ─────────────────────────────────────────────────────────────
    async refresh(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                res.status(400).json({ error: 'Refresh token is required' });
                return;
            }

            let payload: { userId: string; role: string };
            try {
                payload = authService.verifyRefreshToken(refreshToken);
            } catch {
                res.status(401).json({ error: 'Invalid or expired refresh token. Please log in again.' });
                return;
            }

            // For teachers/admins: validate stored refresh token
            if (payload.role !== 'STUDENT') {
                const user = await User.findOne({ cpId: payload.userId });
                if (!user || !user.refreshToken) {
                    res.status(401).json({ error: 'Session not found. Please log in again.' });
                    return;
                }
                const hashedIncoming = authService.hashToken(refreshToken);
                if (hashedIncoming !== user.refreshToken) {
                    res.status(401).json({ error: 'Token mismatch. Please log in again.' });
                    return;
                }
            }

            // Validate session still exists
            const session = await Session.findOne({ userId: payload.userId });
            if (!session) {
                res.status(401).json({ error: 'Session expired. Please log in again.' });
                return;
            }

            // Issue new access token with existing sessionId
            const newAccessToken = authService.generateAccessToken({
                userId: payload.userId,
                role: payload.role,
                sessionId: session.sessionId
            });

            // Update lastSeen
            await Session.updateOne({ userId: payload.userId }, { lastSeen: new Date() });

            res.json({ accessToken: newAccessToken });

        } catch (error: any) {
            console.error('Refresh Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Logout — invalidate session and refresh token
    // ─────────────────────────────────────────────────────────────
    async logout(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            if (userId) {
                await Session.deleteMany({ userId });
                await User.updateOne({ cpId: userId }, { $unset: { refreshToken: 1 } });
            }
            res.json({ message: 'Logged out successfully' });
        } catch (error: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Forgot Password Step 1: Request OTP / Verification Code via Email
    // ─────────────────────────────────────────────────────────────
    async forgotPasswordInit(req: Request, res: Response): Promise<void> {
        try {
            const { identifier } = req.body;
            if (!identifier) {
                res.status(400).json({ error: 'Identifier (CP ID or Email) is required' });
                return;
            }

            const cleanId = identifier.trim();
            let user;
            if (cleanId.includes('@')) {
                user = await User.findOne({ email: cleanId.toLowerCase() });
            } else {
                user = await User.findOne({ cpId: cleanId.toUpperCase() });
            }

            if (!user || !user.email) {
                res.status(404).json({ error: 'No active account found with that ID or email.' });
                return;
            }
            if (!user.isActive) {
                res.status(403).json({ error: 'Your account has been deactivated. Contact the admin.' });
                return;
            }

            // Generate 6-digit verification code
            const otpCode = authService.generateOtp();
            const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 minutes

            await Otp.deleteMany({ identifier: user.cpId });
            await Otp.create({
                identifier: user.cpId,
                otp: otpCode,
                expiresAt,
                lastSentAt: new Date(),
                resendCount: 0,
            });

            const emailSent = await emailService.sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                otpCode,
            });

            if (!emailSent) {
                res.status(500).json({ error: 'Failed to send verification code email. Please try again or check SMTP configuration.' });
                return;
            }

            // Mask email for display
            const parts = user.email.split('@');
            const maskedEmail = parts[0].slice(0, 2) + '****@' + parts[1];

            res.json({
                nextStep: 'RESET_PASSWORD',
                message: `A 6-digit verification code has been sent to your registered email (${maskedEmail}).`,
                cpId: user.cpId,
                email: maskedEmail,
            });
        } catch (error: any) {
            console.error('Forgot Password Init Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Forgot Password Step 2: Verify OTP and Reset Password
    // ─────────────────────────────────────────────────────────────
    async forgotPasswordVerify(req: Request, res: Response): Promise<void> {
        try {
            const { cpId, otp, newPassword } = req.body;
            if (!cpId || !otp || !newPassword) {
                res.status(400).json({ error: 'CP ID, OTP code, and new password are required' });
                return;
            }

            if (newPassword.length < 6) {
                res.status(400).json({ error: 'Password must be at least 6 characters long' });
                return;
            }

            const otpRecord = await Otp.findOne({
                identifier: cpId.trim().toUpperCase(),
                otp: otp.trim(),
                expiresAt: { $gt: new Date() }
            });

            if (!otpRecord) {
                res.status(401).json({ error: 'Invalid or expired verification code. Please check and try again.' });
                return;
            }

            // Consume OTP
            await Otp.deleteOne({ _id: otpRecord._id });

            const hashedPassword = authService.hashPassword(newPassword);
            await User.findOneAndUpdate(
                { cpId: cpId.trim().toUpperCase() },
                { $set: { password: hashedPassword }, $unset: { refreshToken: 1 } }
            );

            // Also invalidate any existing active sessions
            await Session.deleteMany({ userId: cpId.trim().toUpperCase() });

            res.json({
                message: 'Password reset successfully! You can now log in with your new password.'
            });
        } catch (error: any) {
            console.error('Forgot Password Verify Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const authController = new AuthController();
