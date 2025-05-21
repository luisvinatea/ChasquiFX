#!/bin/bash

# Script to test the email verification system
# This script sends a test verification email

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}Testing ChasquiFX Email Verification${NC}"
echo -e "${BLUE}=====================================${NC}"

# Navigate to the API directory
cd backend/api || {
    echo -e "${RED}Error: API directory not found${NC}"
    exit 1
}

# Create a test file for sending verification email
cat >test-email-verification.js <<'EOL'
import { getLogger, initLogger } from './src/utils/logger.js';
import { sendVerificationEmail } from './src/services/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize logger
initLogger();
const logger = getLogger('test-email');

async function runTest() {
  try {
    // Test email and verification token
    const testEmail = process.argv[2] || 'test@example.com';
    const testToken = 'test-verification-token-' + Math.random().toString(36).substring(2, 15);
    const testUsername = testEmail.split('@')[0];
    
    logger.info(`Sending test verification email to ${testEmail}`);
    
    // Send verification email
    const result = await sendVerificationEmail(testEmail, testToken, testUsername);
    
    logger.info('Email sent successfully:');
    logger.info(`Message ID: ${result.messageId}`);
    
    if (result.previewUrl) {
      logger.info(`\nTest email sent using Ethereal Email. View it at:`);
      logger.info(`${result.previewUrl}`);
      logger.info(`\nEthereal Email credentials:`);
      logger.info(`Check the console log for login details`);
    } else {
      logger.info(`\nEmail sent using configured SMTP provider`);
      logger.info(`Check ${testEmail} inbox for the verification email`);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error sending test email: ${error.message}`);
    process.exit(1);
  }
}

runTest();
EOL

echo -e "${YELLOW}Created test script${NC}"

# Prompt for email address
read -p "Enter email address to send test verification (leave empty for ethereal test): " TEST_EMAIL
TEST_EMAIL=${TEST_EMAIL:-""}

echo -e "${YELLOW}Sending test verification email...${NC}"
node --experimental-modules test-email-verification.js "$TEST_EMAIL" || {
    echo -e "${RED}Error: Failed to send test email${NC}"
    echo -e "${YELLOW}Check that nodemailer is installed: npm install nodemailer${NC}"
    exit 1
}

# Clean up test file
rm test-email-verification.js
echo -e "${GREEN}✓ Test completed${NC}"
echo
echo -e "${BLUE}If using ethereal.email:${NC}"
echo -e "1. Check the log output for the ethereal.email preview URL"
echo -e "2. Login to ethereal.email with the credentials shown in the log"
echo
echo -e "${BLUE}If using a real email address:${NC}"
echo -e "1. Check your inbox for the verification email"
echo -e "2. If you don't see it, check your spam folder"
echo -e "3. The link won't work (it's just a test) but you can verify the email template works"
