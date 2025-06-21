#!/bin/bash

# Test script for the /transcribe endpoint

# Check if a file was provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <audio-file>"
    exit 1
fi

AUDIO_FILE=$1

# Check if the file exists
if [ ! -f "$AUDIO_FILE" ]; then
    echo "Error: File '$AUDIO_FILE' not found"
    exit 1
fi

# Check if the file is an audio file
if ! file "$AUDIO_FILE" | grep -q "audio\|WebM\|WAVE"; then
    echo "Warning: '$AUDIO_FILE' might not be an audio file"
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Send the request
echo "Sending $AUDIO_FILE to /transcribe endpoint..."

curl -X POST http://localhost:8080/transcribe \
     -H "Content-Type: application/octet-stream" \
     --data-binary @"$AUDIO_FILE"

echo -e "\nDone!"
