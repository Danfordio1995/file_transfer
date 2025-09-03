#!/bin/bash

# This script adds a MongoDB repository configured for RHEL 9
# and installs the latest stable version of MongoDB on a Red Hat system.

# Check if the user is root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root."
   exit 1
fi

# Step 1: Create the MongoDB repository file.
# We adapt the RHEL 9 repo since a specific one for RHEL 10 is not yet available.
echo "Creating /etc/yum.repos.d/mongodb-org-8.0.repo..."
cat <<EOF > /etc/yum.repos.d/mongodb-org-8.0.repo
[mongodb-org-8.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/8.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-8.0.asc
EOF

# Step 2: Install MongoDB using dnf.
# The `mongodb-org` package will install all required components.
echo "Installing MongoDB..."
dnf install -y mongodb-org

# Step 3: Start the MongoDB service.
echo "Starting MongoDB service..."
systemctl start mongod

# Step 4: Enable MongoDB to start on boot.
echo "Enabling MongoDB to start on boot..."
systemctl enable mongod

# Step 5: Check the service status.
echo "Checking MongoDB service status..."
systemctl status mongod

# Final step: Run the MongoDB shell.
echo "Installation complete. To connect, run:"
echo "mongosh"

