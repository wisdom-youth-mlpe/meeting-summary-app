#!/bin/bash

# Configuration
DB_NAME="meeting_app_dev" # Update this if your database name is different
BACKUP_DIR="/tmp/mongodb_backup"
ARCHIVE_NAME="backup_${DB_NAME}_$(date +%Y-%m-%d_%H-%M-%S).tar.gz"
RCLONE_REMOTE="gdrive" # Ensure you configure this remote via `rclone config`
RCLONE_DEST_DIR="${RCLONE_REMOTE}:/DB_Backups/${DB_NAME}"

export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

echo "Starting MongoDB backup process for database: $DB_NAME"

# 1. Create a temporary directory for the dump
mkdir -p "$BACKUP_DIR"

# 2. Dump the database using mongodump (via Docker if needed)
echo "Creating database dump for $DB_NAME..."

# The MongoDB URI. If using a custom network/remote DB, update this.
MONGO_URI="mongodb://127.0.0.1:27017/${DB_NAME}"

if command -v mongodump &> /dev/null; then
  echo "Using local mongodump..."
  cd "$BACKUP_DIR" || exit 1
  mongodump --uri="$MONGO_URI" --out dump/
elif command -v docker &> /dev/null; then
  echo "Using dockerized mongodump..."
  # Use host network to easily reach localhost:27017
  docker run --rm --network host -v "${BACKUP_DIR}:/data" mongo:latest mongodump --uri="$MONGO_URI" --out /data/dump
else
  echo "Error: Neither mongodump nor docker is installed!"
  rm -rf "$BACKUP_DIR"
  exit 1
fi

if [ ! -d "$BACKUP_DIR/dump" ]; then
  echo "Error: Database backup failed or database is empty!"
  rm -rf "$BACKUP_DIR"
  exit 1
fi

# 3. Compress the dump
echo "Compressing backup to $ARCHIVE_NAME..."
cd "$BACKUP_DIR" || exit 1
tar -czf "$ARCHIVE_NAME" dump/

if [ $? -ne 0 ]; then
  echo "Error: Compression failed!"
  rm -rf "$BACKUP_DIR/dump" "$BACKUP_DIR/$ARCHIVE_NAME"
  exit 1
fi

# 4. Upload to Google Drive using Rclone (via Docker if needed)
echo "Uploading to Google Drive at $RCLONE_DEST_DIR..."

if command -v rclone &> /dev/null; then
  echo "Using local rclone..."
  rclone copy "$ARCHIVE_NAME" "$RCLONE_DEST_DIR" -v
elif command -v docker &> /dev/null; then
  echo "Using dockerized rclone..."
  # Ensure the .config/rclone directory exists so we can mount it
  mkdir -p ~/.config/rclone
  # Also mount /etc/passwd and /etc/group so user permissions map correctly
  docker run --rm -v ~/.config/rclone:/config/rclone -v "${BACKUP_DIR}:/data" rclone/rclone copy "/data/$ARCHIVE_NAME" "$RCLONE_DEST_DIR" -v
else
  echo "Error: Neither rclone nor docker is installed!"
  rm -rf "$BACKUP_DIR/dump" "$BACKUP_DIR/$ARCHIVE_NAME"
  exit 1
fi

if [ $? -ne 0 ]; then
  echo "Error: Rclone upload failed! Check your rclone configuration."
  rm -rf "$BACKUP_DIR/dump" "$BACKUP_DIR/$ARCHIVE_NAME"
  exit 1
fi

# 5. Clean up temporary local files
echo "Cleaning up local temporary files..."
rm -rf "$BACKUP_DIR/dump" "$BACKUP_DIR/$ARCHIVE_NAME"

echo "Backup and upload completed successfully!"
