import nodemailer from 'nodemailer';

export class EmailService {
    private getTransporter(): nodemailer.Transporter {
        const user = process.env.SMTP_USER || process.env.EMAIL_USER;
        let pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
        if (pass) pass = pass.replace(/\s+/g, ''); // Google App Passwords should not contain spaces
        return nodemailer.createTransport({
            service: 'gmail',
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: false,
            auth: { user, pass },
        });
    }

    async sendAccountCreationEmail(options: {
        email: string;
        name: string;
        cpId: string;
        role: string;
        designationOrSubject?: string;
        passwordPlain: string;
    }): Promise<boolean> {
        const { email, name, cpId, role, designationOrSubject, passwordPlain } = options;
        
        const user = process.env.SMTP_USER || process.env.EMAIL_USER;
        const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
        if (!user || !pass) {
            console.warn('[EmailService] SMTP credentials not set in process.env. Skipping email sending.');
            return false;
        }

        const roleTitle = role === 'TEACHER' ? 'Faculty / Teacher' : role === 'ASSISTANT' ? 'Assistant Coordinator' : role;
        const subLabel = role === 'TEACHER' ? 'Subject' : 'Designation';

        const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #f8f9fa; border-radius: 16px; border: 1px solid #e9ecef;">
            <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0;">
                <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 800;">New Career Point</h2>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Learning Portal & Admin System</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
                <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Welcome aboard, ${name}!</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    An account has been created for you as a <strong>${roleTitle}</strong> at New Career Point. You can now access the admin/faculty portal using your login credentials below.
                </p>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin: 24px 0; border: 1px solid #e2e8f0; border-left: 5px solid #2563eb;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Name:</td>
                            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">CP ID (Username):</td>
                            <td style="padding: 6px 0;"><span style="font-family: monospace; background: #eff6ff; color: #1d4ed8; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 15px; border: 1px solid #bfdbfe;">${cpId}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email:</td>
                            <td style="padding: 6px 0; color: #0f172a;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Role:</td>
                            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${roleTitle}</td>
                        </tr>
                        ${designationOrSubject ? `
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">${subLabel}:</td>
                            <td style="padding: 6px 0; color: #0f172a;">${designationOrSubject}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 12px 0 6px 0; color: #64748b; font-weight: 600;">Password:</td>
                            <td style="padding: 12px 0 6px 0;"><span style="font-family: monospace; background: #fef2f2; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 15px; border: 1px solid #fecaca;">${passwordPlain}</span></td>
                        </tr>
                    </table>
                </div>
                
                <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 20px; background: #f1f5f9; padding: 12px; border-radius: 8px;">
                    🔒 <strong>Security Notice:</strong> Please keep your login credentials secure. You can log in using either your CP ID or Email address. We recommend changing your password after your first login.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} New Career Point Institute. All rights reserved.</p>
                <p style="margin: 4px 0 0 0; font-size: 11px;">This is an automated notification from the New Career Point Administration System.</p>
            </div>
        </div>
        `;

        try {
            console.log(`[EmailService] Sending welcome email to ${name} (${email})...`);
            const transporter = this.getTransporter();
            await transporter.sendMail({
                from: process.env.SMTP_FROM || user || 'New Career Point <no-reply@newcareerpoint.com>',
                to: email,
                subject: 'Welcome to New Career Point — Your Account Credentials',
                html: htmlContent,
            });
            console.log(`[EmailService] Welcome email sent successfully to ${email}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to send email to ${email}:`, error);
            return false;
        }
    }

    async sendPasswordResetEmail(options: {
        email: string;
        name: string;
        otpCode: string;
    }): Promise<boolean> {
        const { email, name, otpCode } = options;
        const user = process.env.SMTP_USER || process.env.EMAIL_USER;
        const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
        
        if (!user || !pass) {
            console.warn('[EmailService] SMTP credentials not set in process.env. Skipping password reset email.');
            return false;
        }

        const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #f8f9fa; border-radius: 16px; border: 1px solid #e9ecef;">
            <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0;">
                <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 800;">New Career Point</h2>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Learning Portal & Admin System</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
                <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Password Reset Request</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    Hi <strong>${name}</strong>,<br>We received a request to reset your password for the New Career Point Portal. Use the verification code below to complete your password reset:
                </p>
                
                <div style="text-align: center; background-color: #f8fafc; padding: 24px; border-radius: 10px; margin: 24px 0; border: 1px solid #e2e8f0;">
                    <span style="font-family: monospace; background: #eff6ff; color: #2563eb; padding: 12px 24px; border-radius: 8px; font-weight: 800; font-size: 28px; letter-spacing: 6px; border: 1px solid #bfdbfe; display: inline-block;">${otpCode}</span>
                    <p style="color: #64748b; font-size: 12px; margin-top: 12px; margin-bottom: 0;">This code is valid for 10 minutes.</p>
                </div>
                
                <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 20px; background: #fef2f2; color: #991b1b; padding: 12px; border-radius: 8px; border: 1px solid #fecaca;">
                    ⚠️ <strong>Did not request this?</strong> If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} New Career Point Institute. All rights reserved.</p>
            </div>
        </div>
        `;

        try {
            console.log(`[EmailService] Sending password reset OTP to ${name} (${email})...`);
            const transporter = this.getTransporter();
            await transporter.sendMail({
                from: process.env.SMTP_FROM || user || 'New Career Point <no-reply@newcareerpoint.com>',
                to: email,
                subject: 'Password Reset Verification Code — New Career Point',
                html: htmlContent,
            });
            console.log(`[EmailService] Password reset email sent successfully to ${email}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to send password reset email to ${email}:`, error);
            return false;
        }
    }
}

export const emailService = new EmailService();
