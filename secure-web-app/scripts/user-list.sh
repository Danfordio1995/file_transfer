#!/bin/bash
# scripts/user-list.sh
# Script to list system users

# Default values
SORT_BY="name"

# Process command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sortBy=*)
      SORT_BY="${1#*=}"
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
  shift
done

# Validate sort field
if [[ "$SORT_BY" != "name" && "$SORT_BY" != "uid" && "$SORT_BY" != "gid" ]]; then
  echo "Error: Invalid sort field. Must be one of: name, uid, gid"
  exit 1
fi

# Get user information, filtering out system users with UID < 1000
# and excluding nologin/false shells
USERS=$(awk -F: '$3 >= 1000 && $7 != "/usr/sbin/nologin" && $7 != "/bin/false" {print $1":"$3":"$4":"$7}' /etc/passwd)

# Sort the output
case "$SORT_BY" in
  "name")
    USERS=$(echo "$USERS" | sort)
    ;;
  "uid")
    USERS=$(echo "$USERS" | sort -t: -k2,2n)
    ;;
  "gid")
    USERS=$(echo "$USERS" | sort -t: -k3,3n)
    ;;
esac

# Create JSON array
echo "{"
echo "  \"users\": ["

# Parse and output users as JSON objects
FIRST=true
echo "$USERS" | while IFS=: read -r NAME UID GID SHELL; do
  # Get user's home directory
  HOME_DIR=$(grep "^$NAME:" /etc/passwd | cut -d: -f6)
  
  # Get user's groups
  GROUPS=$(id -Gn "$NAME" 2>/dev/null | tr ' ' ',')
  
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "    ,"
  fi
  
  echo "    {"
  echo "      \"username\": \"$NAME\","
  echo "      \"uid\": $UID,"
  echo "      \"gid\": $GID,"
  echo "      \"home\": \"$HOME_DIR\","
  echo "      \"shell\": \"$SHELL\","
  echo "      \"groups\": \"$GROUPS\""
  echo -n "    }"
done

echo ""
echo "  ],"

# System info
echo "  \"system\": {"
echo "    \"totalUsers\": $(echo \"$USERS\" | wc -l),"
echo "    \"sortedBy\": \"$SORT_BY\""
echo "  }"
echo "}"

exit 0
