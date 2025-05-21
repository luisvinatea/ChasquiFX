#!/bin/bash

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChasquiFX User Authentication & API Key Storage Fix${NC}"
echo -e "${BLUE}=================================================${NC}\n"

# Change to the backend/api directory
cd /home/luisvinatea/DEVinatea/Repos/chasquifx/backend/api || {
    echo -e "${RED}❌ Failed to change directory to backend/api${NC}"
    exit 1
}

# Check auth middleware and services
echo -e "${YELLOW}Checking authentication system...${NC}"

# Check auth middleware
if [ -f "src/middleware/auth.js" ]; then
    echo -e "${GREEN}✅ Found auth middleware${NC}"
    echo -e "\n${YELLOW}Auth middleware code preview:${NC}"
    head -n 30 "src/middleware/auth.js"
    echo -e "${YELLOW}...(showing first 30 lines)${NC}"
else
    echo -e "${RED}❌ Auth middleware not found${NC}"
fi

# Check for email service
echo -e "\n${YELLOW}Checking email verification service...${NC}"
EMAIL_SERVICE_FILES=$(find src -type f -name "*email*.js")

if [ -n "$EMAIL_SERVICE_FILES" ]; then
    echo -e "${GREEN}✅ Found email-related files:${NC}"
    echo "$EMAIL_SERVICE_FILES"

    # Show content of first email service file
    FIRST_EMAIL_FILE=$(echo "$EMAIL_SERVICE_FILES" | head -n 1)
    if [ -n "$FIRST_EMAIL_FILE" ]; then
        echo -e "\n${YELLOW}Contents of $FIRST_EMAIL_FILE:${NC}"
        cat "$FIRST_EMAIL_FILE"
    fi
else
    echo -e "${RED}❌ No email service files found${NC}"
    echo -e "${YELLOW}Searching for any email-related code...${NC}"
    grep -r "email\|mail\|smtp\|sendgrid\|ses" src --include="*.js" | head -n 10
fi

# Check for authentication services
echo -e "\n${YELLOW}Checking authentication services...${NC}"
AUTH_SERVICE_FILES=$(find src -type f -name "*auth*.js")

if [ -n "$AUTH_SERVICE_FILES" ]; then
    echo -e "${GREEN}✅ Found authentication-related files:${NC}"
    echo "$AUTH_SERVICE_FILES"

    # Check Supabase integration
    if grep -q "supabase" "$(echo "$AUTH_SERVICE_FILES" | head -n 1)"; then
        echo -e "${GREEN}✅ Using Supabase for authentication${NC}"
    fi
else
    echo -e "${RED}❌ No dedicated authentication service files found${NC}"
fi

# Check user model
echo -e "\n${YELLOW}Checking user model...${NC}"
USER_MODEL_FILES=$(find src -type f -name "*user*.js")

if [ -n "$USER_MODEL_FILES" ]; then
    echo -e "${GREEN}✅ Found user-related files:${NC}"
    echo "$USER_MODEL_FILES"

    # Show content of first user model file
    FIRST_USER_FILE=$(echo "$USER_MODEL_FILES" | head -n 1)
    if [ -n "$FIRST_USER_FILE" ]; then
        echo -e "\n${YELLOW}Contents of $FIRST_USER_FILE:${NC}"
        cat "$FIRST_USER_FILE"
    fi
else
    echo -e "${RED}❌ No user model files found${NC}"
fi

# Check API key storage
echo -e "\n${YELLOW}Checking API key storage implementation...${NC}"
grep -r "apiKey\|API_KEY\|api-key\|api_key" src --include="*.js" | head -n 15
echo -e "${YELLOW}...(showing first 15 matches)${NC}"

# Check environment variables related to auth
echo -e "\n${YELLOW}Checking environment variables for authentication:${NC}"
if [ -f ".env" ]; then
    # Look for auth-related env variables without showing sensitive values
    grep -i "auth\|mail\|smtp\|email\|supabase\|jwt\|secret" .env | grep -v "=.*" | sed "s/\(.*\)=.*/\1=******/"
fi

# Summary of issues and fixes
echo -e "\n${BLUE}Authentication System Diagnosis:${NC}"
echo -e "1. Email verification system may be misconfigured"
echo -e "2. Check email provider credentials in environment variables"
echo -e "3. Ensure proper MongoDB integration for API key storage"
echo -e "4. Verify Supabase authentication configuration"

# Create a comprehensive fix for the authentication system
echo -e "\n${YELLOW}Would you like to implement fixes for the authentication system?${NC}"
read -p "Choose an option (1-4):
1. Fix Email Verification
2. Implement API Key Storage with MongoDB
3. Create Basic Email Template
4. Exit without changes
Option: " auth_fix_option

case $auth_fix_option in
1)
    echo -e "\n${BLUE}Implementing Email Verification Fix...${NC}"

    # Create or update email service
    mkdir -p src/services

    # Create email service
    cat >src/services/emailService.js <<'EOL'
/**
 * Email Service for ChasquiFX
 * Handles sending verification emails and other notifications
 */

import nodemailer from 'nodemailer';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('email-service');

// Configure transport based on environment variables
const getTransport = () => {
  // Check if we have SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    logger.info(`Using SMTP transport: ${process.env.SMTP_HOST}`);
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // Debug options
      debug: process.env.NODE_ENV !== 'production',
      logger: true // Log transport activity to console
    });
  } 
  
  // Fallback to testing account
  logger.warn('No SMTP configuration found, using ethereal email for testing');
  
  // Create a testing account on ethereal.email and return its transport
  return new Promise((resolve, reject) => {
    nodemailer.createTestAccount((err, account) => {
      if (err) {
        logger.error(`Failed to create test email account: ${err.message}`);
        reject(err);
        return;
      }
      
      logger.info(`Created test email account: ${account.user}`);
      logger.info(`Password: ${account.pass}`);
      logger.info(`SMTP Host: ${account.smtp.host}`);
      logger.info(`Preview URL: https://ethereal.email/login`);
      
      const transport = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
        debug: true,
        logger: true
      });
      
      resolve(transport);
    });
  });
};

/**
 * Send a verification email
 * @param {string} email - Recipient email address
 * @param {string} verificationToken - Token for email verification
 * @param {string} username - Username (optional)
 * @returns {Promise<object>} - Email send result
 */
export async function sendVerificationEmail(email, verificationToken, username = '') {
  try {
    const transport = await getTransport();
    
    const verifyUrl = `${process.env.APP_URL || 'https://chasquifx-web.vercel.app'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ChasquiFX" <no-reply@chasquifx.app>',
      to: email,
      subject: 'Verify your ChasquiFX account',
      text: `Hello ${username || 'there'},\n\nPlease verify your email by clicking the following link: ${verifyUrl}\n\nIf you did not request this email, please ignore it.\n\nThe ChasquiFX Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6f8a;">Welcome to ChasquiFX!</h2>
          <p>Hello ${username || 'there'},</p>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #4a6f8a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>Or click on this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>If you did not sign up for ChasquiFX, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">The ChasquiFX Team</p>
        </div>
      `
    };
    
    const result = await transport.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}: ${result.messageId}`);
    
    // For ethereal email, log the preview URL
    if (result.ethereal) {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(result)}`);
      return { 
        success: true, 
        messageId: result.messageId, 
        previewUrl: nodemailer.getTestMessageUrl(result),
        testAccount: true
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
export async function sendWelcomeEmail(email, username = '') {
  try {
    const transport = await getTransport();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ChasquiFX" <no-reply@chasquifx.app>',
      to: email,
      subject: 'Welcome to ChasquiFX!',
      text: `Hello ${username || 'there'},\n\nYour email has been verified. Thank you for joining ChasquiFX!\n\nYou can now log in and configure your API keys to start using the application.\n\nThe ChasquiFX Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6f8a;">Welcome to ChasquiFX!</h2>
          <p>Hello ${username || 'there'},</p>
          <p>Your email has been successfully verified. Thank you for joining ChasquiFX!</p>
          <p>You can now log in and configure your API keys to start using the application.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'https://chasquifx-web.vercel.app'}/login" style="background-color: #4a6f8a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Log In Now</a>
          </div>
          <p>We hope you enjoy using ChasquiFX!</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">The ChasquiFX Team</p>
        </div>
      `
    };
    
    const result = await transport.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error(`Failed to send welcome email: ${error.message}`);
    throw error;
  }
}
EOL
    echo -e "${GREEN}✅ Created email service${NC}"

    # Update package.json to add nodemailer dependency
    if ! grep -q '"nodemailer"' package.json; then
        echo -e "${YELLOW}Adding nodemailer dependency...${NC}"
        sed -i '/"dependencies": {/a \    "nodemailer": "^6.9.9",' package.json
        echo -e "${GREEN}✅ Added nodemailer dependency${NC}"
    fi

    # Add required environment variables to .env
    if [ -f ".env" ]; then
        if ! grep -q "SMTP_HOST" .env; then
            # shellcheck disable=SC2129
            echo -e "\n# Email Configuration" >>.env
            echo "SMTP_HOST=smtp.example.com" >>.env
            echo "SMTP_PORT=587" >>.env
            echo "SMTP_SECURE=false" >>.env
            echo "SMTP_USER=username" >>.env
            echo "SMTP_PASSWORD=password" >>.env
            echo "EMAIL_FROM=\"ChasquiFX <no-reply@chasquifx.app>\"" >>.env
            echo "APP_URL=https://chasquifx-web.vercel.app" >>.env
            echo -e "${GREEN}✅ Added email configuration to .env${NC}"
        fi
    fi

    echo -e "\n${GREEN}✅ Email verification system has been implemented${NC}"
    echo -e "${YELLOW}To complete setup:${NC}"
    echo -e "1. Update SMTP settings in .env with your email provider credentials"
    echo -e "2. Install nodemailer: npm install nodemailer"
    echo -e "3. For testing, the implementation will use ethereal.email if SMTP is not configured"
    echo -e "4. Check the logs for ethereal.email test account credentials"
    ;;
2)
    echo -e "\n${BLUE}Implementing API Key Storage with MongoDB...${NC}"

    # Create API key storage service
    mkdir -p src/services

    cat >src/services/apiKeyService.js <<'EOL'
/**
 * API Key Management Service
 * Handles storage and retrieval of user API keys securely in MongoDB
 */

import { getLogger } from '../utils/logger.js';
import { connectToDatabase } from '../db/mongodb-vercel.js';
import crypto from 'crypto';

const logger = getLogger('api-key-service');
const COLLECTION_NAME = 'api_keys';

/**
 * Encrypt sensitive data using environment variable as encryption key
 * @param {string} data - Data to encrypt
 * @returns {string} - Encrypted data
 */
function encrypt(data) {
  try {
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32)), iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    logger.error(`Encryption failed: ${error.message}`);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Data to decrypt
 * @returns {string} - Decrypted data
 */
function decrypt(encryptedData) {
  try {
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    logger.error(`Decryption failed: ${error.message}`);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Store an API key for a user
 * @param {string} userId - User ID 
 * @param {string} keyType - Type of API key (e.g., 'serpapi', 'exchangerate')
 * @param {string} apiKey - The API key to store
 * @returns {Promise<Object>} - Result of the operation
 */
export async function storeApiKey(userId, keyType, apiKey) {
  try {
    logger.info(`Storing ${keyType} API key for user ${userId}`);
    
    // Connect to the database
    const { db, client } = await connectToDatabase();
    
    // Encrypt the API key
    const encryptedApiKey = encrypt(apiKey);
    
    // Create or update API key document
    const result = await db.collection(COLLECTION_NAME).updateOne(
      { userId, keyType },
      { 
        $set: { 
          userId,
          keyType,
          apiKey: encryptedApiKey,
          updatedAt: new Date() 
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );
    
    logger.info(`API key ${result.upsertedId ? 'created' : 'updated'} for user ${userId}`);
    
    return { success: true };
  } catch (error) {
    logger.error(`Failed to store API key: ${error.message}`);
    throw new Error(`Failed to store API key: ${error.message}`);
  }
}

/**
 * Get an API key for a user
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key
 * @returns {Promise<string|null>} - The API key or null if not found
 */
export async function getApiKey(userId, keyType) {
  try {
    logger.info(`Getting ${keyType} API key for user ${userId}`);
    
    // Connect to the database
    const { db, client } = await connectToDatabase();
    
    // Find the API key document
    const apiKeyDoc = await db.collection(COLLECTION_NAME).findOne({ userId, keyType });
    
    if (!apiKeyDoc) {
      logger.info(`No ${keyType} API key found for user ${userId}`);
      return null;
    }
    
    // Decrypt the API key
    const decryptedApiKey = decrypt(apiKeyDoc.apiKey);
    
    return decryptedApiKey;
  } catch (error) {
    logger.error(`Failed to get API key: ${error.message}`);
    throw new Error(`Failed to get API key: ${error.message}`);
  }
}

/**
 * Delete an API key for a user
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key
 * @returns {Promise<Object>} - Result of the operation
 */
export async function deleteApiKey(userId, keyType) {
  try {
    logger.info(`Deleting ${keyType} API key for user ${userId}`);
    
    // Connect to the database
    const { db, client } = await connectToDatabase();
    
    // Delete the API key document
    const result = await db.collection(COLLECTION_NAME).deleteOne({ userId, keyType });
    
    logger.info(`API key deletion result: ${result.deletedCount} document(s) deleted`);
    
    return { success: result.deletedCount > 0 };
  } catch (error) {
    logger.error(`Failed to delete API key: ${error.message}`);
    throw new Error(`Failed to delete API key: ${error.message}`);
  }
}

/**
 * List all API keys for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of API key types (without the actual keys)
 */
export async function listApiKeys(userId) {
  try {
    logger.info(`Listing API keys for user ${userId}`);
    
    // Connect to the database
    const { db, client } = await connectToDatabase();
    
    // Find all API key documents for this user
    const apiKeyDocs = await db.collection(COLLECTION_NAME)
      .find({ userId })
      .project({ userId: 1, keyType: 1, updatedAt: 1 })
      .toArray();
    
    return apiKeyDocs.map(doc => ({
      keyType: doc.keyType,
      updatedAt: doc.updatedAt
    }));
  } catch (error) {
    logger.error(`Failed to list API keys: ${error.message}`);
    throw new Error(`Failed to list API keys: ${error.message}`);
  }
}

/**
 * Check if an API key exists and can be retrieved
 * @param {string} userId - User ID
 * @param {string} keyType - Type of API key
 * @returns {Promise<boolean>} - True if API key exists and can be retrieved
 */
export async function checkApiKeyExists(userId, keyType) {
  try {
    const key = await getApiKey(userId, keyType);
    return key !== null;
  } catch (error) {
    logger.error(`Failed to check API key: ${error.message}`);
    return false;
  }
}

export default {
  storeApiKey,
  getApiKey,
  deleteApiKey,
  listApiKeys,
  checkApiKeyExists
};
EOL
    echo -e "${GREEN}✅ Created API key storage service${NC}"

    # Add required environment variables to .env
    if [ -f ".env" ]; then
        if ! grep -q "ENCRYPTION_KEY" .env; then
            echo -e "\n# API Key Encryption" >>.env
            echo "ENCRYPTION_KEY=$(openssl rand -hex 16)" >>.env
            echo -e "${GREEN}✅ Added encryption key to .env${NC}"
        fi
    fi

    # Create API controller endpoints
    cat >src/controllers/apiKeyController.js <<'EOL'
/**
 * API Key Controller
 * Handles API key management routes
 */
 
import { getLogger } from '../utils/logger.js';
import {
  storeApiKey,
  getApiKey,
  deleteApiKey,
  listApiKeys
} from '../services/apiKeyService.js';

const logger = getLogger('api-key-controller');

/**
 * Store an API key
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleStoreApiKey(req, res) {
  try {
    const { user } = req;
    const { keyType, apiKey } = req.body;
    
    if (!user || !user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    if (!keyType || !apiKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Key type and API key are required'
      });
    }
    
    await storeApiKey(user.id, keyType, apiKey);
    
    return res.json({
      status: 'success',
      message: 'API key stored successfully'
    });
  } catch (error) {
    logger.error(`Error storing API key: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to store API key',
      error: error.message
    });
  }
}

/**
 * Verify an API key exists (without returning the key)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleVerifyApiKey(req, res) {
  try {
    const { user } = req;
    const { keyType } = req.params;
    
    if (!user || !user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    if (!keyType) {
      return res.status(400).json({
        status: 'error',
        message: 'Key type is required'
      });
    }
    
    const apiKey = await getApiKey(user.id, keyType);
    
    return res.json({
      status: 'success',
      exists: apiKey !== null,
      keyType
    });
  } catch (error) {
    logger.error(`Error verifying API key: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify API key',
      error: error.message
    });
  }
}

/**
 * Delete an API key
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleDeleteApiKey(req, res) {
  try {
    const { user } = req;
    const { keyType } = req.params;
    
    if (!user || !user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    if (!keyType) {
      return res.status(400).json({
        status: 'error',
        message: 'Key type is required'
      });
    }
    
    const result = await deleteApiKey(user.id, keyType);
    
    return res.json({
      status: 'success',
      message: 'API key deleted successfully',
      ...result
    });
  } catch (error) {
    logger.error(`Error deleting API key: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete API key',
      error: error.message
    });
  }
}

/**
 * List all API keys for a user
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleListApiKeys(req, res) {
  try {
    const { user } = req;
    
    if (!user || !user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    const apiKeys = await listApiKeys(user.id);
    
    return res.json({
      status: 'success',
      data: apiKeys
    });
  } catch (error) {
    logger.error(`Error listing API keys: ${error.message}`);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to list API keys',
      error: error.message
    });
  }
}

export default {
  handleStoreApiKey,
  handleVerifyApiKey,
  handleDeleteApiKey,
  handleListApiKeys
};
EOL
    echo -e "${GREEN}✅ Created API key controller${NC}"

    # Create API key routes
    cat >src/routes/api-key-routes.js <<'EOL'
/**
 * API Key Routes
 */
 
import { Router } from 'express';
import { 
  handleStoreApiKey, 
  handleVerifyApiKey, 
  handleDeleteApiKey, 
  handleListApiKeys 
} from '../controllers/apiKeyController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All API key routes require authentication
router.use(authMiddleware);

/**
 * @route POST /api/v2/api-keys
 * @description Store an API key for the authenticated user
 * @access Private
 */
router.post('/', handleStoreApiKey);

/**
 * @route GET /api/v2/api-keys
 * @description List all API keys for the authenticated user
 * @access Private
 */
router.get('/', handleListApiKeys);

/**
 * @route GET /api/v2/api-keys/:keyType
 * @description Verify if an API key exists for the authenticated user
 * @access Private
 */
router.get('/:keyType', handleVerifyApiKey);

/**
 * @route DELETE /api/v2/api-keys/:keyType
 * @description Delete an API key for the authenticated user
 * @access Private
 */
router.delete('/:keyType', handleDeleteApiKey);

export const apiKeyRoutes = router;
EOL
    echo -e "${GREEN}✅ Created API key routes${NC}"

    # Update route setup
    if [ -f "src/routes/route-setup.js" ]; then
        echo -e "\n${YELLOW}Adding API key routes to route setup...${NC}"

        # First check if it's already imported
        if ! grep -q "apiKeyRoutes" src/routes/route-setup.js; then
            # Add import
            sed -i '/import.*from.*routes/a import { apiKeyRoutes } from "./api-key-routes.js";' src/routes/route-setup.js

            # Add route mount
            sed -i '/apiRouterV2.use.*recommendations/a \ \ apiRouterV2.use("/api-keys", apiKeyRoutes);' src/routes/route-setup.js

            echo -e "${GREEN}✅ Updated route setup${NC}"
        else
            echo -e "${YELLOW}API key routes already configured${NC}"
        fi
    else
        echo -e "${RED}❌ Route setup file not found${NC}"
    fi

    echo -e "\n${GREEN}✅ API Key storage system has been implemented${NC}"
    echo -e "${YELLOW}The implementation includes:${NC}"
    echo -e "1. Secure API key storage with encryption"
    echo -e "2. MongoDB integration for persistence"
    echo -e "3. REST API endpoints for key management"
    echo -e "4. Authentication to protect API keys"
    echo -e "\n${BLUE}Complete API Key Management API:${NC}"
    echo -e "- POST /api/v2/api-keys - Store an API key"
    echo -e "- GET /api/v2/api-keys - List all API keys"
    echo -e "- GET /api/v2/api-keys/:keyType - Check if an API key exists"
    echo -e "- DELETE /api/v2/api-keys/:keyType - Delete an API key"
    ;;
3)
    echo -e "\n${BLUE}Creating Basic Email Template...${NC}"

    # Create email templates directory
    mkdir -p src/templates

    # Create verification email template
    cat >src/templates/verification-email.html <<'EOL'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification - ChasquiFX</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .email-header {
      background-color: #4a6f8a;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .email-content {
      padding: 20px;
    }
    .email-button {
      display: inline-block;
      background-color: #4a6f8a;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
    }
    .email-button:hover {
      background-color: #3a5d78;
    }
    .email-footer {
      background-color: #f8f8f8;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>ChasquiFX</h1>
    </div>
    <div class="email-content">
      <h2>Email Verification</h2>
      <p>Hello {{username}},</p>
      <p>Thank you for signing up with ChasquiFX. Please verify your email address to activate your account.</p>
      
      <div style="text-align: center;">
        <a href="{{verificationUrl}}" class="email-button">Verify Email Address</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
      
      <p>If you didn't sign up for ChasquiFX, you can safely ignore this email.</p>
      
      <p>Best regards,<br>The ChasquiFX Team</p>
    </div>
    <div class="email-footer">
      <p>&copy; 2025 ChasquiFX. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
EOL
    echo -e "${GREEN}✅ Created verification email template${NC}"

    # Create welcome email template
    cat >src/templates/welcome-email.html <<'EOL'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ChasquiFX</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .email-header {
      background-color: #4a6f8a;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .email-content {
      padding: 20px;
    }
    .feature {
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      background-color: #f9f9f9;
    }
    .feature-title {
      font-weight: bold;
      color: #4a6f8a;
    }
    .email-button {
      display: inline-block;
      background-color: #4a6f8a;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
    }
    .email-button:hover {
      background-color: #3a5d78;
    }
    .email-footer {
      background-color: #f8f8f8;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>ChasquiFX</h1>
    </div>
    <div class="email-content">
      <h2>Welcome to ChasquiFX!</h2>
      <p>Hello {{username}},</p>
      <p>Thank you for verifying your email address. Your account is now fully activated.</p>
      
      <h3>Getting Started:</h3>
      
      <div class="feature">
        <span class="feature-title">1. Configure Your API Keys</span>
        <p>Add your API keys in the account settings to enable all features.</p>
      </div>
      
      <div class="feature">
        <span class="feature-title">2. Explore Currency Exchange Rates</span>
        <p>Find destinations with favorable exchange rates for your base currency.</p>
      </div>
      
      <div class="feature">
        <span class="feature-title">3. Discover Flight Routes</span>
        <p>Plan your journey with our integrated flight route information.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="{{loginUrl}}" class="email-button">Login to ChasquiFX</a>
      </div>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
      
      <p>Best regards,<br>The ChasquiFX Team</p>
    </div>
    <div class="email-footer">
      <p>&copy; 2025 ChasquiFX. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
EOL
    echo -e "${GREEN}✅ Created welcome email template${NC}"

    # Create password reset email template
    cat >src/templates/password-reset-email.html <<'EOL'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - ChasquiFX</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .email-header {
      background-color: #4a6f8a;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .email-content {
      padding: 20px;
    }
    .email-button {
      display: inline-block;
      background-color: #4a6f8a;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
    }
    .email-button:hover {
      background-color: #3a5d78;
    }
    .email-footer {
      background-color: #f8f8f8;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
    }
    .security-note {
      background-color: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>ChasquiFX</h1>
    </div>
    <div class="email-content">
      <h2>Password Reset Request</h2>
      <p>Hello {{username}},</p>
      <p>We received a request to reset your password for your ChasquiFX account.</p>
      
      <div style="text-align: center;">
        <a href="{{resetUrl}}" class="email-button">Reset Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="{{resetUrl}}">{{resetUrl}}</a></p>
      
      <div class="security-note">
        <p><strong>Security Note:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
      </div>
      
      <p>Best regards,<br>The ChasquiFX Team</p>
    </div>
    <div class="email-footer">
      <p>&copy; 2025 ChasquiFX. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
EOL
    echo -e "${GREEN}✅ Created password reset email template${NC}"

    echo -e "\n${GREEN}✅ Email templates have been created${NC}"
    echo -e "${YELLOW}Templates created:${NC}"
    echo -e "1. Verification email template"
    echo -e "2. Welcome email template"
    echo -e "3. Password reset email template"
    echo -e "\n${YELLOW}To use these templates:${NC}"
    echo -e "1. Implement an email template engine (e.g., handlebars, ejs)"
    echo -e "2. Update the email service to use these templates"
    echo -e "3. Pass required variables to templates (username, verification URL, etc.)"
    ;;
*)
    echo -e "\n${BLUE}Exiting without making changes...${NC}"
    ;;
esac

echo -e "\n${BLUE}User Authentication & API Key Storage Diagnosis Complete!${NC}"
echo -e "${GREEN}If you've implemented fixes, remember to deploy the changes to Vercel${NC}"
echo -e "${YELLOW}Note: You may need to wait for Vercel deployment quota to reset${NC}"
