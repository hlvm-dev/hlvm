#!/bin/bash

# Start HLVM in background
./hlvm &
HLVM_PID=$!

# Animated loading message
printf "\033[36m⏳ Loading HLVM\033[0m"

# Animation loop
i=0
while kill -0 $HLVM_PID 2>/dev/null; do
    # Rotating dots animation
    case $((i % 4)) in
        0) printf "\r\033[36m⏳ Loading HLVM\033[0m   ";;
        1) printf "\r\033[36m⏳ Loading HLVM\033[0m.  ";;
        2) printf "\r\033[36m⏳ Loading HLVM\033[0m.. ";;
        3) printf "\r\033[36m⏳ Loading HLVM\033[0m...";;
    esac
    sleep 0.3
    ((i++))
done

# Clear the loading line
printf "\r\033[K"

# Wait for HLVM to finish
wait $HLVM_PID