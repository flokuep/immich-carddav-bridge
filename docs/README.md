# immich-carddav-bridge

A lightweight bridge to synchronize data between your **Immich** instance and a **CardDAV** server. This project aims to enhance your self-hosted CardDAV contacts by adding preview pictures from your self-hosted Immich instance.

## ✨ Features

- Synchronizes Immich people's preview images to CardDAV contacts.

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Docker & Docker Compose (recommended for easy deployment)
- An Immich server
- A CardDAV server (e.g., Nextcloud, Radicale)

### Installation & Configuration

You can either extend your existing `docker-compose.yaml` file for your Immich server or create a separate one for `immich-carddav-bridge`. The following instructions are for integrating into an existing Docker Compose setup. The separate setup is straightforward. Please have a look at [Usage](usage.md) for more configuration options, including having multiple configurations.

Please ensure that `immich-carddav-bridge` can reach both your Immich instance and your CardDAV server via HTTP(S).

1.  **Set up your environment variables:**
    Enhance your `.env` file or environment configuration:

    ```dotenv
    IMMICH_URL=https://your-immich-instance/api
    IMMICH_KEY=YOUR_IMMICH_API_KEY
    CARDDAV_URL=https://your-carddav-server/dav/
    CARDDAV_USERNAME=your_carddav_user
    CARDDAV_PASSWORD=your_carddav_pass_or_token
    CARDDAV_PATH_TEMPLATE=/addressbooks/users/$CARDDAV_USERNAME/
    CRON_SCHEDULE=0 0 * * *
    ```

    _Adjust these variables to match your setup._ You can specify the list of addressbooks by setting a comma-seperated list of addressbook-names to CARDDAV_ADDRESSBOOKS. Otherwise all addressbooks were fetched.

2.  **Adjust your `docker-compose.yaml`:**
    Add the `immich-carddav-bridge` service to your existing `docker-compose.yaml` file:

    ```yaml
    immich-carddav-bridge:
      container_name: immich-carddav-bridge
      image: ghcr.io/flokuep/immich-carddav-bridge:latest
      restart: unless-stopped
      depends_on:
        - immich-server # Ensure this matches your Immich service name
    ```

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up -d
    ```
    This will start the bridge in the background. Check the logs with `docker-compose logs -f immich-carddav-bridge` to monitor its activity. The synchronization will run on startup, if you don't want to have this initial run, set `SKIP_INITIAL_RUN=true` in your `.env` file.

## 🤝 Compatibility

This bridge has been tested with the following CardDAV servers. Your `CARDDAV_URL` and `CARDDAV_PATH` settings will vary depending on your server configuration.

| CardDAV Server | `CARDDAV_URL` Example                        | `CARDDAV_PATH` Example                   | Notes                                            |
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
