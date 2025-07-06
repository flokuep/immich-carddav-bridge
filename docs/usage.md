# Usage

## Global Options

The following options are **required** for `immich-carddav-bridge` to function correctly. You can provide these options directly on the command line or set them as environment variables. Environment variables are checked first, providing a convenient way to manage your credentials without exposing them in your shell history.

| **Option**                               | **Environment Variable** | **Description**                                                                                                                    |
| :--------------------------------------- | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| `--immich-url <url>`                     | `IMMICH_URL`             | The base URL of your Immich server.                                                                                                |
| `--immich-key <key>`                     | `IMMICH_KEY`             | Your Immich API key. You can generate this in your Immich user settings.                                                           |
| `--carddav-url <url>`                    | `CARDDAV_URL`            | The base URL of your CardDAV server (e.g., `https://carddav.example.com`).                                                         |
| `--carddav-path-template <pathTemplate>` | `CARDDAV_PATH_TEMPLATE`  | A template for the path to your CardDAV address books. This often includes placeholders like `${CARDDAV_USERNAME}`.                |
| `--carddav-username <username>`          | `CARDDAV_USERNAME`       | The username for authenticating with your CardDAV server.                                                                          |
| `--carddav-password <password>`          | `CARDDAV_PASSWORD`       | The password or token for your CardDAV user.                                                                                       |
| `--carddav-addressbooks <addressbooks>`  | `CARDDAV_ADDRESSBOOKS`   | A comma-separated list of CardDAV address book names to synchronize. If left empty, all available address books will be processed. |

**Example Usage with Options:**

```
immich-carddav-bridge \
  --immich-url https://immich.example.com \
  --immich-key YOUR_IMMICH_API_KEY \
  --carddav-url https://carddav.example.com \
  --carddav-path-template "/dav/${CARDDAV_USERNAME}/addressbooks/" \
  --carddav-username your_carddav_user \
  --carddav-password your_carddav_password \
  --carddav-addressbooks personal,family

```

**Example Usage with Environment Variables:**

```
export IMMICH_URL=https://immich.example.com
export IMMICH_KEY=YOUR_IMMICH_API_KEY
export CARDDAV_URL=https://carddav.example.com
export CARDDAV_PATH_TEMPLATE="/dav/${CARDDAV_USERNAME}/addressbooks/"
export CARDDAV_USERNAME=your_carddav_user
export CARDDAV_PASSWORD=your_carddav_password
export CARDDAV_ADDRESSBOOKS="personal,family"

immich-carddav-bridge sync

```

## Commands

### `sync`

The `sync` command initiates the synchronization process. It connects to your Immich and CardDAV servers, identifies recognized people in Immich, matches them with your CardDAV contacts, and updates their profile pictures.

**Description:** Run synchronization.

#### Options for `sync` command

| **Option**      | **Description**                                                                                                                                                                                                                                                                                                                                        |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-d, --dry-run` | Performs a "dry run" of the synchronization. This means the tool will read people from Immich and attempt to match them with your CardDAV contacts, but **no pictures will actually be transferred or updated** on your CardDAV server. This is useful for testing your configuration and seeing what changes would be made before committing to them. |

**Example Usage:**

To run a full synchronization:

```
immich-carddav-bridge sync

```

To perform a dry run to see what would happen:

```
immich-carddav-bridge sync --dry-run
# Or
immich-carddav-bridge sync -d

```

## Getting Help

For the version of the CLI:

```
immich-carddav-bridge --version

```

For general help:

```
immich-carddav-bridge --help

```

For help on a specific command (e.g., `sync`):

```
immich-carddav-bridge sync --help

```
