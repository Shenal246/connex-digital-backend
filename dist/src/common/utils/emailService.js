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
    async sendWelcomeEmail(to, tempPassword) {
        await this.sendEmail(to, 'Welcome to HR Platform', `Your account has been created.\nYour temporary password is: ${tempPassword}\nPlease login to change it.`, `<p>Your account has been created.</p><p>Your temporary password is: <strong>${tempPassword}</strong></p><p>Please login to change it.</p>`);
    },
    async sendOtpEmail(to, otp) {
        await this.sendEmail(to, 'Your Login OTP', `Your one-time password is: ${otp}\nIt will expire in 5 minutes.`, `<p>Your one-time password is: <strong>${otp}</strong></p><p>It will expire in 5 minutes.</p>`);
    },
    async sendPasswordResetEmail(to, resetLink) {
        await this.sendEmail(to, 'Password Reset Request', `Click the link to reset your password: ${resetLink}\nThis link will expire in 15 minutes.`, `<p>Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link will expire in 15 minutes.</p>`);
    }
};
