#!/bin/bash
# scripts/disk-usage.sh
# Script to show disk usage of directories

# Default values
DIR_PATH="."
MIN_SIZE=0
FORMAT="text"

# Process command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path=*)
      DIR_PATH="${1#*=}"
      ;;
    --min-size=*)
      MIN_SIZE="${1#*=}"
      ;;
    --format=*)
      FORMAT="${1#*=}"
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
  shift
done

# Validate directory path
if [[ ! -d "$DIR_PATH" ]]; then
  echo "Error: Invalid directory path: $DIR_PATH"
  exit 1
fi

# Validate format
if [[ "$FORMAT" != "text" && "$FORMAT" != "json" ]]; then
  echo "Error: Invalid format. Must be one of: text, json"
  exit 1
fi

# Get directory sizes (in MB)
DIR_SIZES=$(du -m --max-depth=1 "$DIR_PATH" 2>/dev/null | sort -rn)

# Filter by minimum size
if [[ $MIN_SIZE -gt 0 ]]; then
  DIR_SIZES=$(echo "$DIR_SIZES" | awk -v min="$MIN_SIZE" '$1 >= min')
fi

# Output based on format
case "$FORMAT" in
  "json")
    echo "{"
    echo "  \"path\": \"$DIR_PATH\","
    echo "  \"total_size_mb\": $(du -sm \"$DIR_PATH\" 2>/dev/null | cut -f1),"
    echo "  \"directories\": ["
    
    FIRST=true
    echo "$DIR_SIZES" | while read -r SIZE DIR; do
      # Skip the directory itself (which is included in du output)
      if [[ "$DIR" == "$DIR_PATH" ]]; then
        continue
      fi
      
      # Get just the directory name
      DIR_NAME=$(basename "$DIR")
      
      if [ "$FIRST" = true ]; then
        FIRST=false
      else
        echo "    ,"
      fi
      
      echo "    {"
      echo "      \"name\": \"$DIR_NAME\","
      echo "      \"path\": \"$DIR\","
      echo "      \"size_mb\": $SIZE"
      echo -n "    }"
    done
    
    echo ""
    echo "  ]"
    echo "}"
    ;;
  
  "text"|*)
    echo "========== DISK USAGE OF $DIR_PATH =========="
    echo "Directory                                Size (MB)"
    echo "---------------------------------------------------------"
    
    echo "$DIR_SIZES" | while read -r SIZE DIR; do
      # Skip the directory itself in the list
      if [[ "$DIR" == "$DIR_PATH" ]]; then
        continue
      fi
      
      # Format the output nicely
      printf "%-40s %10s MB\n" "$DIR" "$SIZE"
    done
    
    echo "---------------------------------------------------------"
    echo "Total: $(du -sm "$DIR_PATH" 2>/dev/null | cut -f1) MB"
    echo "========================================================"
    ;;
esac

exit 0
