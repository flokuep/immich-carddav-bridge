#!/bin/sh
if [ -z "${CRON_SCHEDULE}" ]; then
  echo "CRON_SCHEDULE is not set. The cron job will not be configured."
  if [ -f "/etc/cron.d/immich-carddav-bridge" ]; then
    rm /etc/cron.d/immich-carddav-bridge
    echo "Existing cron job entry in /etc/cron.d/immich-carddav-bridge has been removed."
  fi
else
  # Wenn CRON_SCHEDULE gesetzt ist, erstelle die Cronjob-Konfigurationsdatei
  # Der Cronjob wird den Node.js-Befehl ausführen und die Ausgabe in die Logdatei umleiten
  echo "${CRON_SCHEDULE} root /usr/local/bin/node /app/dist/index.js sync --immich-url ${IMMICH_URL} --immich-key ${IMMICH_KEY} --carddav-url ${CARDDAV_URL} --carddav-username ${CARDDAV_USERNAME} --carddav-password ${CARDDAV_PASSWORD} --carddav-path ${CARDDAV_PATH} >> /var/log/cron.log 2>&1" > /etc/cron.d/immich-carddav-bridge

  # Setze die korrekten Berechtigungen für die Cronjob-Datei
  chmod 0644 /etc/cron.d/immich-carddav-bridge
  echo "Cron job configured with schedule: ${CRON_SCHEDULE}"
fi
touch /var/log/cron.log

crond &
tail -f /var/log/cron.log

wait