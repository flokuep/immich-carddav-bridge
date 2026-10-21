# immich-carddav-bridge

A lightweight bridge to synchronize data between your **Immich** instance and a **CardDAV** server. This project aims to enhance your self-hosted CardDAV contacts by adding preview pictures from your self-hosted Immich instance.

## ✨ Features

- Imports existing CardDAV portraits into Immich and selects them as person feature photos.
- Fills missing CardDAV contact photos with Immich person thumbnails.
- Optionally synchronizes complete birthdays in both directions with persistent conflict detection.

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Docker & Docker Compose (recommended for easy deployment)
- An Immich server
- A CardDAV server (e.g., Nextcloud, Radicale)

### Installation & Configuration

The repository includes a complete Docker example for portrait and birthday synchronization:

- [`config.example.json`](../config.example.json) contains connection placeholders, birthday mode, checkpoint path and the portrait switch.
- [`.env.example`](../.env.example) selects the configuration file and controls startup and scheduling.
- [`docker-compose.yaml`](../docker-compose.yaml) mounts the configuration read-only and persists birthday checkpoints in a named volume.

1. **Create your local configuration files:**

   ```bash
   cp .env.example .env
   cp config.example.json config.json
   ```

   Replace the connection URLs and credential placeholders in `config.json`. Use the credentials accepted by your CardDAV server (a password, token or app password) and an Immich API key with the [required permissions](usage.md#immich-api-permissions). The default example enables bidirectional birthdays and portrait synchronization; set `skipPhotos` to `true` for birthdays only, or `birthdaySync` to `off` to disable birthday synchronization.

   The example URL and address book path are placeholders, not a universal CardDAV endpoint. Set `carddavUrl` and `carddavPathTemplate` according to your server. The address book name is its URL segment, for example `contacts`. Keep the literal `$CARDDAV_USERNAME` placeholder in the JSON path template; the bridge replaces it with `carddavUsername`.

2. **Build and inspect the plan:**

   ```bash
   docker compose build
   docker compose run --rm --entrypoint node immich-carddav-bridge /app/dist/index.js multi-sync /app/config.json --dry-run
   ```

   The bridge container must be able to reach both configured server URLs. The generic Compose example uses no installation-specific Docker network.

3. **Run once after reviewing the plan:**

   ```bash
   docker compose run --rm --entrypoint node immich-carddav-bridge /app/dist/index.js multi-sync /app/config.json
   ```

   Existing contact portraits are imported into Immich as additional photos and selected as person feature photos. Complete birthdays are reconciled conservatively; conflicts and yearless birthdays are preserved. See [birthday synchronization](usage.md#birthday-synchronization) for the rules.

4. **Enable scheduled runs when ready:**

   Set `CRON_SCHEDULE` in `.env`, for example `0 3 * * *` for daily runs at 03:00 container time, then run:

   ```bash
   docker compose up -d
   docker compose logs -f immich-carddav-bridge
   ```

   The example starts with `SKIP_INITIAL_RUN=true` and no cron schedule, so starting the container alone does not modify your data. Remove `SKIP_INITIAL_RUN` or set it to an empty value to run on startup; any non-empty value disables the initial run.

`CONFIG_FILE=/app/config.json` selects JSON mode. In that mode, connection settings come from `config.json`; single-account credentials in `.env` are not used. JSON settings override the birthday and portrait defaults in `.env`. To use environment-only connections, leave `CONFIG_FILE` empty and fill in the single-account variables.

Local `.env`, `config.json` and `.bridge-state/` are ignored by Git. Commit only the example files, never credentials or birthday checkpoints.

## 🤝 Compatibility

This bridge has been tested with the following CardDAV servers. Your `CARDDAV_URL` and `CARDDAV_PATH_TEMPLATE` settings will vary depending on your server configuration.

| CardDAV Server | `CARDDAV_URL` Example                        | `CARDDAV_PATH_TEMPLATE` Example                   | Notes                                            |
| :------------- | :------------------------------------------- | :--------------------------------------- | :----------------------------------------------- |
| **Nextcloud**  | `https://your-nextcloud.com/remote.php/dav/` | `/addressbooks/users/$CARDDAV_USERNAME/` | Ensure your user has access to the address book. |

## 🧑‍💻 Development

Want to contribute or hack on it? Awesome!

### Setup

1.  **Clone and install dependencies:**

    ```bash
    git clone [https://github.com/flokuep/immich-carddav-bridge.git](https://github.com/flokuep/immich-carddav-bridge.git)
    cd immich-carddav-bridge
    npm install
    cp .env.example .env
    ```

2.  **Configure your instances:**
    Adjust your `.env` file with the Immich and CardDAV instance details you want to use for development.

3.  **Run locally:**

    ```bash
    npm run try
    ```

    Currently, there's no hot reload. The code is built and then executed. You can easily append parameters, for example:

    ```bash
    npm run try -- -d
    ```

### Testing

Run the tests to ensure everything is working as expected:

```bash
npm test # or yarn test
```
