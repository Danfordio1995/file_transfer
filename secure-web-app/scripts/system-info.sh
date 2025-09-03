#!/bin/bash
# scripts/system-info.sh
# Script to display system information

# Default values
FORMAT="text"
DETAIL="normal"

# Process command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --format=*)
      FORMAT="${1#*=}"
      ;;
    --detail=*)
      DETAIL="${1#*=}"
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
  shift
done

# Validate format
if [[ "$FORMAT" != "text" && "$FORMAT" != "json" && "$FORMAT" != "csv" ]]; then
  echo "Error: Invalid format. Must be one of: text, json, csv"
  exit 1
fi

# Validate detail level
if [[ "$DETAIL" != "minimal" && "$DETAIL" != "normal" && "$DETAIL" != "detailed" ]]; then
  echo "Error: Invalid detail level. Must be one of: minimal, normal, detailed"
  exit 1
fi

# Get system info
HOSTNAME=$(hostname)
OS_INFO=$(cat /etc/os-release 2>/dev/null | grep "PRETTY_NAME" | cut -d'"' -f2)
KERNEL=$(uname -r)
UPTIME=$(uptime -p)
CPU_INFO=$(grep "model name" /proc/cpuinfo 2>/dev/null | head -1 | cut -d':' -f2 | sed 's/^[ \t]*//')
CPU_CORES=$(grep -c "processor" /proc/cpuinfo 2>/dev/null)
MEM_TOTAL=$(free -h | grep "Mem:" | awk '{print $2}')
MEM_USED=$(free -h | grep "Mem:" | awk '{print $3}')
MEM_FREE=$(free -h | grep "Mem:" | awk '{print $4}')
DISK_USAGE=$(df -h / | tail -1)
DISK_TOTAL=$(echo "$DISK_USAGE" | awk '{print $2}')
DISK_USED=$(echo "$DISK_USAGE" | awk '{print $3}')
DISK_FREE=$(echo "$DISK_USAGE" | awk '{print $4}')
DISK_PERCENT=$(echo "$DISK_USAGE" | awk '{print $5}')

# Additional detailed info
if [[ "$DETAIL" == "detailed" ]]; then
  LOAD_AVG=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
  USERS_LOGGED=$(who | wc -l)
  PROCESSES=$(ps aux | wc -l)
  NETWORK_INFO=$(ip -4 addr show | grep inet | awk '{print $NF, $2}' | sed 's/\/[0-9]*//g')
fi

# Output based on format
case "$FORMAT" in
  "json")
    echo "{"
    echo "  \"hostname\": \"$HOSTNAME\","
    echo "  \"os\": \"$OS_INFO\","
    echo "  \"kernel\": \"$KERNEL\","
    echo "  \"uptime\": \"$UPTIME\","
    echo "  \"cpu\": {"
    echo "    \"model\": \"$CPU_INFO\","
    echo "    \"cores\": $CPU_CORES"
    echo "  },"
    echo "  \"memory\": {"
    echo "    \"total\": \"$MEM_TOTAL\","
    echo "    \"used\": \"$MEM_USED\","
    echo "    \"free\": \"$MEM_FREE\""
    echo "  },"
    echo "  \"disk\": {"
    echo "    \"total\": \"$DISK_TOTAL\","
    echo "    \"used\": \"$DISK_USED\","
    echo "    \"free\": \"$DISK_FREE\","
    echo "    \"usage_percent\": \"$DISK_PERCENT\""
    echo "  }"
    
    if [[ "$DETAIL" == "detailed" ]]; then
      echo "  ,\"loadAverage\": \"$LOAD_AVG\","
      echo "  \"usersLoggedIn\": $USERS_LOGGED,"
      echo "  \"processes\": $PROCESSES,"
      echo "  \"network\": ["
      echo "$NETWORK_INFO" | while IFS= read -r line; do
        IFACE=$(echo "$line" | awk '{print $1}')
        IP=$(echo "$line" | awk '{print $2}')
        echo "    {\"interface\": \"$IFACE\", \"ip\": \"$IP\"},"
      done | sed '$s/,$//'
      echo "  ]"
    fi
    
    echo "}"
    ;;
  
  "csv")
    # Headers
    if [[ "$DETAIL" == "minimal" ]]; then
      echo "hostname,os,uptime,cpu_cores,mem_total,mem_used,disk_total,disk_used"
      echo "$HOSTNAME,\"$OS_INFO\",$UPTIME,$CPU_CORES,$MEM_TOTAL,$MEM_USED,$DISK_TOTAL,$DISK_USED"
    elif [[ "$DETAIL" == "normal" ]]; then
      echo "hostname,os,kernel,uptime,cpu_model,cpu_cores,mem_total,mem_used,mem_free,disk_total,disk_used,disk_free,disk_percent"
      echo "$HOSTNAME,\"$OS_INFO\",$KERNEL,$UPTIME,\"$CPU_INFO\",$CPU_CORES,$MEM_TOTAL,$MEM_USED,$MEM_FREE,$DISK_TOTAL,$DISK_USED,$DISK_FREE,$DISK_PERCENT"
    else
      echo "hostname,os,kernel,uptime,cpu_model,cpu_cores,mem_total,mem_used,mem_free,disk_total,disk_used,disk_free,disk_percent,load_avg,users_logged,processes"
      echo "$HOSTNAME,\"$OS_INFO\",$KERNEL,$UPTIME,\"$CPU_INFO\",$CPU_CORES,$MEM_TOTAL,$MEM_USED,$MEM_FREE,$DISK_TOTAL,$DISK_USED,$DISK_FREE,$DISK_PERCENT,\"$LOAD_AVG\",$USERS_LOGGED,$PROCESSES"
    fi
    ;;
  
  "text"|*)
    echo "========== SYSTEM INFORMATION =========="
    echo "Hostname: $HOSTNAME"
    echo "Operating System: $OS_INFO"
    echo "Kernel: $KERNEL"
    echo "Uptime: $UPTIME"
    echo ""
    echo "CPU: $CPU_INFO"
    echo "CPU Cores: $CPU_CORES"
    echo ""
    echo "Memory Total: $MEM_TOTAL"
    echo "Memory Used: $MEM_USED"
    echo "Memory Free: $MEM_FREE"
    echo ""
    echo "Disk Total: $DISK_TOTAL"
    echo "Disk Used: $DISK_USED"
    echo "Disk Free: $DISK_FREE"
    echo "Disk Usage: $DISK_PERCENT"
    
    if [[ "$DETAIL" == "detailed" ]]; then
      echo ""
      echo "Load Average: $LOAD_AVG"
      echo "Users Logged In: $USERS_LOGGED"
      echo "Running Processes: $PROCESSES"
      echo ""
      echo "Network Interfaces:"
      echo "$NETWORK_INFO" | while IFS= read -r line; do
        IFACE=$(echo "$line" | awk '{print $1}')
        IP=$(echo "$line" | awk '{print $2}')
        echo "  $IFACE: $IP"
      done
    fi
    echo "========================================"
    ;;
esac

exit 0
