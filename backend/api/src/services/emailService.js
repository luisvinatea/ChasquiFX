/**
 * Email Service for ChasquiFX
 * Handles sending verification emails and other notifications
 */

import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getLogger } from "../utils/logger.js";

const logger = getLogger("email-service");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Template cache
const templateCache = {};

/**
 * Get the email transport based on environment configuration
 * @returns {Promise<nodemailer.Transporter>} - Configured email transport
 */
const getTransport = async () => {
  // Check if we have SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    logger.info(`Using SMTP transport: ${process.env.SMTP_HOST}`);

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      debug: process.env.NODE_ENV !== "production",
      logger: process.env.NODE_ENV !== "production",
    });
  }

  // Fallback to testing account
  logger.warn("No SMTP configuration found, using ethereal email for testing");

  // Create a testing account on ethereal.email and return its transport
  const testAccount = await nodemailer.createTestAccount();
  logger.info(`Created test email account: ${testAccount.user}`);
  logger.info(`Password: ${testAccount.pass}`);
  logger.info(`SMTP Host: ${testAccount.smtp.host}`);
  logger.info(`Preview URL: https://ethereal.email`);

  const transport = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    debug: true,
    logger: true,
  });

  return transport;
};

/**
 * Load a template from file or cache
 * @param {string} templateName - Template name
 * @returns {Promise<string>} - Template content
 */
async function loadTemplate(templateName) {
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }

  try {
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      `${templateName}.html`
    );
    const template = await fs.readFile(templatePath, "utf8");
    templateCache[templateName] = template;
    return template;
  } catch (error) {
    logger.error(`Failed to load template ${templateName}: ${error.message}`);
    throw error;
  }
}

/**
 * Apply template variables to HTML template
 * @param {string} template - HTML template
 * @param {Object} variables - Template variables
 * @returns {string} - Processed HTML
 */
function applyTemplate(template, variables) {
  return Object.entries(variables).reduce((html, [key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    return html.replace(regex, value);
  }, template);
}

/**
 * Send a verification email
 * @param {string} email - Recipient email address
 * @param {string} verificationToken - Token for email verification
 * @param {string} username - Username (optional)
 * @returns {Promise<object>} - Email send result
 */
export async function sendVerificationEmail(
  email,
  verificationToken,
  username = ""
) {
  try {
    const transport = await getTransport();
    const appUrl = process.env.APP_URL || "https://chasquifx-web.vercel.app";
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(
      email
    )}`;

    // Load template
    let html;
    try {
      const template = await loadTemplate("verification-email");
      html = applyTemplate(template, {
        username: username || "there",
        verificationUrl: verifyUrl,
      });
    } catch (error) {
      // Fallback to inline template if file not found
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6f8a;">Verify Your ChasquiFX Email</h2>
          <p>Hello ${username || "there"},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #4a6f8a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>Or click on this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>If you did not sign up for ChasquiFX, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">The ChasquiFX Team</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ChasquiFX" <no-reply@chasquifx.app>',
      to: email,
      subject: "Verify your ChasquiFX account",
      text: `Hello ${
        username || "there"
      },\n\nPlease verify your email by clicking the following link: ${verifyUrl}\n\nIf you did not request this email, please ignore it.\n\nThe ChasquiFX Team`,
      html,
    };

    const result = await transport.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}: ${result.messageId}`);

    // For ethereal email, get preview URL
    if (result.messageId && result.messageId.includes("ethereal")) {
      const previewUrl = nodemailer.getTestMessageUrl(result);
      logger.info(`Preview URL: ${previewUrl}`);
      return {
        success: true,
        messageId: result.messageId,
        previewUrl,
        testAccount: true,
      };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error(`Failed to send verification email: ${error.message}`);
    throw error;
  }
}

/**
 * Send a welcome email after verification
 * @param {string} email - Recipient email address
 * @param {string} username - Username (optional)
 * @returns {Promise<object>} - Email send result
 */
export async function sendWelcomeEmail(email, username = "") {
  try {
    const transport = await getTransport();
    const appUrl = process.env.APP_URL || "https://chasquifx-web.vercel.app";
    const loginUrl = `${appUrl}/login`;

    // Load template
    let html;
    try {
      const template = await loadTemplate("welcome-email");
      html = applyTemplate(template, {
        username: username || "there",
        loginUrl: loginUrl,
      });
    } catch (error) {
      // Fallback to inline template if file not found
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6f8a;">Welcome to ChasquiFX!</h2>
          <p>Hello ${username || "there"},</p>
          <p>Your email has been successfully verified. Thank you for joining ChasquiFX!</p>
          <p>You can now log in and configure your API keys to start using the application.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #4a6f8a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Log In Now</a>
          </div>
          <p>We hope you enjoy using ChasquiFX!</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">The ChasquiFX Team</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ChasquiFX" <no-reply@chasquifx.app>',
      to: email,
      subject: "Welcome to ChasquiFX!",
      text: `Hello ${
        username || "there"
      },\n\nYour email has been verified. Thank you for joining ChasquiFX!\n\nYou can now log in and configure your API keys to start using the application.\n\nThe ChasquiFX Team`,
      html,
    };

    const result = await transport.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}: ${result.messageId}`);

    // For ethereal email, get preview URL
    if (result.messageId && result.messageId.includes("ethereal")) {
      const previewUrl = nodemailer.getTestMessageUrl(result);
      logger.info(`Preview URL: ${previewUrl}`);
      return {
        success: true,
        messageId: result.messageId,
        previewUrl,
        testAccount: true,
      };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error(`Failed to send welcome email: ${error.message}`);
    throw error;
  }
}

/**
 * Send a password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Token for password reset
 * @param {string} username - Username (optional)
 * @returns {Promise<object>} - Email send result
 */
export async function sendPasswordResetEmail(
  email,
  resetToken,
  username = ""
) {
  try {
    const transport = await getTransport();
    const appUrl = process.env.APP_URL || "https://chasquifx-web.vercel.app";
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(
      email
    )}`;

    // Load template
    let html;
    try {
      const template = await loadTemplate("password-reset-email");
      html = applyTemplate(template, {
        username: username || "there",
        resetUrl: resetUrl,
      });
    } catch (error) {
      // Fallback to inline template if file not found
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6f8a;">Password Reset - ChasquiFX</h2>
          <p>Hello ${username || "there"},</p>
          <p>We received a request to reset your password for your ChasquiFX account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4a6f8a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or click on this link: <a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
          <p>This link will expire in 1 hour for your security.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">The ChasquiFX Team</p>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ChasquiFX" <no-reply@chasquifx.app>',
      to: email,
      subject: "Reset your ChasquiFX password",
      text: `Hello ${
        username || "there"
      },\n\nWe received a request to reset your password. Please use the following link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour for your security.\n\nIf you didn't request this password reset, please ignore this email.\n\nThe ChasquiFX Team`,
      html,
    };

    const result = await transport.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}: ${result.messageId}`);

    // For ethereal email, get preview URL
    if (result.messageId && result.messageId.includes("ethereal")) {
      const previewUrl = nodemailer.getTestMessageUrl(result);
      logger.info(`Preview URL: ${previewUrl}`);
      return {
        success: true,
        messageId: result.messageId,
        previewUrl,
        testAccount: true,
      };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error(`Failed to send password reset email: ${error.message}`);
    throw error;
  }
}
