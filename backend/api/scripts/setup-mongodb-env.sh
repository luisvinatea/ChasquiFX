#!/bin/bash
#
# MongoDB environment setup script
#
# This script helps set up environment variables for MongoDB connection
# and creates a .env file for the application to use.
#

# Change to the script directory and navigate to the api root
cd "$(dirname "$0")" || exit
cd ..

echo "MongoDB Environment Setup for ChasquiFX"
echo "========================================"
echo
echo "This script will help you set up MongoDB connection details."
echo "The information will be saved to a .env file."
echo

# Check if .env already exists
if [ -f ".env" ]; then
  echo "A .env file already exists. Do you want to overwrite it? (y/n)"
  read -r overwrite
  if [[ "$overwrite" != "y" && "$overwrite" != "Y" ]]; then
    echo "Setup canceled. Your .env file was not modified."
    exit 0
  fi
fi

# Get MongoDB connection details
echo
echo "Please provide your MongoDB connection details:"
echo

# Get username with default
read -p "MongoDB Username [chasquifx_user]: " MONGODB_USER
MONGODB_USER=${MONGODB_USER:-chasquifx_user}

# Get password (hidden input)
read -s -p "MongoDB Password: " MONGODB_PASSWORD
echo

# Get host with default
read -p "MongoDB Host [chasquifx.ymxb5bs.mongodb.net]: " MONGODB_HOST
MONGODB_HOST=${MONGODB_HOST:-chasquifx.ymxb5bs.mongodb.net}

# Get database name with default
read -p "MongoDB Database Name [chasquifx]: " MONGODB_DBNAME
MONGODB_DBNAME=${MONGODB_DBNAME:-chasquifx}

# Additional environment variables for the application
echo
echo "Do you want to configure additional environment variables? (y/n)"
read -r additional
ADDITIONAL_ENV=""

if [[ "$additional" == "y" || "$additional" == "Y" ]]; then
  echo
  echo "Enter additional environment variables (KEY=VALUE format, empty line to finish):"
  while true; do
    read -r line
    if [ -z "$line" ]; then
      break
    fi
    ADDITIONAL_ENV="${ADDITIONAL_ENV}${line}\n"
  done
fi

# Create .env file
echo
echo "Creating .env file..."
cat > .env << EOF
# MongoDB Connection
MONGODB_USER=${MONGODB_USER}
MONGODB_PASSWORD=${MONGODB_PASSWORD}
MONGODB_HOST=${MONGODB_HOST}
MONGODB_DBNAME=${MONGODB_DBNAME}

# Connection URI (constructed from above values)
MONGODB_URI=mongodb+srv://\${MONGODB_USER}:\${MONGODB_PASSWORD}@\${MONGODB_HOST}/\${MONGODB_DBNAME}?retryWrites=true&w=majority&appName=ChasquiFX

# Application settings
NODE_ENV=development

$(echo -e "$ADDITIONAL_ENV")
EOF

echo "Environment file created successfully!"
echo
echo "You can now run MongoDB tools:"
echo "  cd scripts"
echo "  ./verify-mongodb.sh --report"
echo
echo "Or test the connection with:"
echo "  cd scripts"
echo "  ./mongodb-manager.sh test-connection"
echo
