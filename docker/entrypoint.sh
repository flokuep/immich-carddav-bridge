#!/bin/sh

# Check if CONFIG_FILE is empty for single or multi-sync mode
if [ -z "${CONFIG_FILE}" ]; then
  echo "Cron job configured for sync ${IMMICH_URL} to ${CARDDAV_USERNAME}@${CARDDAV_URL}."
  # Create the run.sh script for single sync mode
  echo "
  #!/bin/sh
  /usr/local/bin/node /app/dist/index.js sync \
      --immich-url ${IMMICH_URL} \
      --immich-key ${IMMICH_KEY} \
      --carddav-url ${CARDDAV_URL} \
      --carddav-username ${CARDDAV_USERNAME} \
      --carddav-password ${CARDDAV_PASSWORD} \
      --carddav-path-template ${CARDDAV_PATH_TEMPLATE} \
      --carddav-addressbooks ${CARDDAV_ADDRESSBOOKS} >> /var/log/cron.log 2>&1" > /app/run.sh
else
  echo "Cron job configured for multi-sync with config file '${CONFIG_FILE}'."
  # Create the run.sh script for multi-sync mode
  echo "
  #!/bin/sh
  /usr/local/bin/node /app/dist/index.js multi-sync ${CONFIG_FILE} >> /var/log/cron.log 2>&1" > /app/run.sh
fi

# Make the run.sh script executable
chmod +x /app/run.sh

# ---
# Configure cron schedule
# ---

# Check if CRON_SCHEDULE is set
if [ -z "${CRON_SCHEDULE}" ]; then
  echo "CRON_SCHEDULE is not set. The cron job will not be configured."
  # Remove existing cron job entry if it exists
  if [ -f "/etc/cron.d/immich-carddav-bridge" ]; then
    rm /etc/cron.d/immich-carddav-bridge
    echo "Existing cron job entry in /etc/cron.d/immich-carddav-bridge has been removed."
  fi
else
  # If CRON_SCHEDULE is set, create the cron job configuration file
  echo "${CRON_SCHEDULE} root /app/run.sh" > /etc/cron.d/immich-carddav-bridge

  # Set the correct permissions for the cron job file
  chmod 0644 /etc/cron.d/immich-carddav-bridge
  echo "Cron job configured with schedule: ${CRON_SCHEDULE}"
fi

# Ensure the cron log file exists
touch /var/log/cron.log

# ---
# Initial run and daemon startup
# ---

# Perform an initial run if SKIP_INITIAL_RUN is not set
if [ -z "${SKIP_INITIAL_RUN}" ]; then
  echo "Running initial sync, after which cron will be started."
  /app/run.sh
fi

# Start the cron daemon in the background
crond -f &

# Tail the cron log file to keep the container running and show logs
tail -f /var/log/cron.log