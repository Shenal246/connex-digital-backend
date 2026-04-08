"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("./logger");
const env_1 = require("../config/env");
const transporter = nodemailer_1.default.createTransport({
    host: env_1.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(env_1.env.SMTP_PORT || '587'),
    secure: env_1.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: env_1.env.SMTP_USER,
        pass: env_1.env.SMTP_PASS,
    },
});
exports.emailService = {
    async sendEmail(to, subject, text, html) {
        if (!env_1.env.SMTP_USER || !env_1.env.SMTP_PASS) {
            // Mock email sender fallback
            logger_1.logger.warn(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
            logger_1.logger.warn(`[MOCK EMAIL BODY]\n${text}`);
            return;
        }
        try {
            const info = await transporter.sendMail({
                from: env_1.env.SMTP_FROM || `"HR Platform" <${env_1.env.SMTP_USER}>`,
                to,
                subject,
                text,
                html,
            });
            logger_1.logger.info(`[EMAIL_SERVICE] Email sent to ${to} (ID: ${info.messageId})`);
        }
        catch (error) {
            logger_1.logger.error(error, `[EMAIL_SERVICE] Failed to send email to ${to}`);
        }
    },
    async sendWelcomeEmail(to, name, tempPassword) {
        const logoUrl = 'https://api.dicebear.com/7.x/initials/svg?seed=CD'; // Placeholder for industrial logo
        const loginUrl = env_1.env.FRONTEND_URL || 'http://localhost:3000';
        const html = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="background: #4f46e5; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-weight: bold; font-size: 20px;">CD</span>
                    </div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0;">Welcome to Connex Digital</h1>
                    <p style="color: #6b7280; margin-top: 8px;">Your account is ready for use</p>
                </div>

                <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #f3f4f6;">
                    <p style="margin-top: 0; font-size: 16px;">Hello <strong>${name}</strong>,</p>
                    <p style="line-height: 1.6; color: #4b5563;">Your administrative account has been created on the Connex Digital Platform. Below are your temporary login credentials.</p>
                    
                    <div style="background: white; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e5e7eb;">
                        <div style="margin-bottom: 12px;">
                            <span style="display: block; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Username / Email</span>
                            <span style="font-family: monospace; font-size: 15px; color: #111827;">${to}</span>
                        </div>
                        <div>
                            <span style="display: block; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">Temporary Password</span>
                            <span style="font-family: monospace; font-size: 15px; color: #111827; font-weight: bold;">${tempPassword}</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; transition: background-color 0.2s;">
                            Login to Dashboard
                        </a>
                    </div>
                </div>

                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
                    <p style="font-size: 13px; color: #9ca3af; line-height: 1.6;">
                        <strong>Security Note:</strong> You will be required to change your password upon your first login.<br/>
                        If you didn't expect this email, please contact your administrator.
                    </p>
                    <p style="font-size: 12px; color: #d1d5db; margin-top: 16px;">
                        &copy; ${new Date().getFullYear()} Connex Digital Platform. All rights reserved.
                    </p>
                </div>
            </div>
        `;
        await this.sendEmail(to, 'Your Connex Digital Platform Credentials', `Welcome ${name},\n\nYour account has been created.\n\nUsername: ${to}\nTemporary Password: ${tempPassword}\n\nPlease login at ${loginUrl} to change it.`, html);
    },
    async sendOtpEmail(to, otp) {
        const loginUrl = env_1.env.FRONTEND_URL || 'http://localhost:3000';
        const html = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1f2937;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="background: #4f46e5; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <span style="color: white; font-weight: bold; font-size: 20px;">CD</span>
                    </div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0;">Verification Code</h1>
                    <p style="color: #6b7280; margin-top: 8px;">Use the code below to complete your login</p>
                </div>

                <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #f3f4f6; text-align: center;">
                    <p style="margin-top: 0; font-size: 16px; color: #4b5563;">Your one-time password (OTP) is:</p>
                    
                    <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #4f46e5; display: inline-block;">
                        <span style="font-family: 'Courier New', monospace; font-size: 36px; color: #4f46e5; font-weight: 800; letter-spacing: 0.2em;">${otp}</span>
                    </div>

                    <p style="font-size: 14px; color: #9ca3af; margin-bottom: 0;">This code will expire in <strong>5 minutes</strong>.</p>
                </div>

                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
                    <p style="font-size: 13px; color: #9ca3af; line-height: 1.6;">
                        If you did not request this code, someone may be trying to access your account. Please contact your administrator immediately.
                    </p>
                    <p style="font-size: 12px; color: #d1d5db; margin-top: 16px;">
                        &copy; ${new Date().getFullYear()} Connex Digital Platform. All rights reserved.
                    </p>
                </div>
            </div>
        `;
        await this.sendEmail(to, 'Your Login Verification Code', `Your one-time password is: ${otp}\nIt will expire in 5 minutes.`, html);
    },
    async sendPasswordResetEmail(to, resetLink) {
        await this.sendEmail(to, 'Password Reset Request', `Click the link to reset your password: ${resetLink}\nThis link will expire in 15 minutes.`, `<p>Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link will expire in 15 minutes.</p>`);
    }
};
