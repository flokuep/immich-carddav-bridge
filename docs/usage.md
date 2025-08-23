# Usage

## Commands

### `sync`

The `sync` command initiates the synchronization process. It connects to your Immich and CardDAV servers, identifies recognized people in Immich, matches them with your CardDAV contacts, and updates their profile pictures.

**Description:** Run synchronization.

#### Options for `sync` command

The following options are **required** for the `sync` command to function correctly. You can provide these options directly on the command line or set them as environment variables. Environment variables are checked first, providing a convenient way to manage your credentials without exposing them in your shell history.

| **Option**                                        | **Environment Variable** | **Description**                                                                                                                                                                                                                                                                                                                                        |
| :------------------------------------------------ | :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--immich-url <url>`                              | `IMMICH_URL`             | The base URL of your Immich server.                                                                                                                                                                                                                                                                                                                    |
| `--immich-key <key>`                              | `IMMICH_KEY`             | Your Immich API key. You can generate this in your Immich user settings.                                                                                                                                                                                                                                                                               |
| `--carddav-url <url>`                             | `CARDDAV_URL`            | The base URL of your CardDAV server (e.g., `https://carddav.example.com`).                                                                                                                                                                                                                                                                             |
| `--carddav-path-template <pathTemplate>`          | `CARDDAV_PATH_TEMPLATE`  | A template for the path to your CardDAV address books. This often includes placeholders like `${CARDDAV_USERNAME}`.                                                                                                                                                                                                                                    |
| `--carddav-username <username>`                   | `CARDDAV_USERNAME`       | The username for authenticating with your CardDAV server.                                                                                                                                                                                                                                                                                              |
| `--carddav-password <password>`                   | `CARDDAV_PASSWORD`       | The password or token for your CardDAV user.                                                                                                                                                                                                                                                                                                           |
| `--carddav-addressbooks <addressbooks>`           | `CARDDAV_ADDRESSBOOKS`   | A comma-separated list of CardDAV address book names to synchronize. If left empty, all available address books will be processed.                                                                                                                                                                                                                     |
| `-d, --dry-run`                                   |                          | Performs a "dry run" of the synchronization. This means the tool will read people from Immich and attempt to match them with your CardDAV contacts, but **no pictures will actually be transferred or updated** on your CardDAV server. This is useful for testing your configuration and seeing what changes would be made before committing to them. |
| `--matching-contacts-file <matchingContactsFile>` | `MATCHING_CONTACTS_FILE` | Path to a JSON file for manual matching of Immich people and CardDAV contacts. See "Manual Contact Matching" section for details.                                                                                                                                                                                                                      |

**Example Usage for `sync`:**

To run a full synchronization:

```bash
immich-carddav-sync sync \
  --immich-url https://immich.example.com \
  --immich-key YOUR_IMMICH_API_KEY \
  --carddav-url https://carddav.example.com \
  --carddav-path-template "/dav/${CARDDAV_USERNAME}/addressbooks/" \
  --carddav-username your_carddav_user \
  --carddav-password your_carddav_password \
  --carddav-addressbooks personal,family
```

To perform a dry run to see what would happen:

```bash
immich-carddav-sync sync --dry-run
# Or
immich-carddav-sync sync -d
```

You can also use environment variables for the `sync` command:

```bash
export IMMICH_URL=https://immich.example.com
export IMMICH_KEY=YOUR_IMMICH_API_KEY
export CARDDAV_URL=https://carddav.example.com
export CARDDAV_PATH_TEMPLATE="/dav/${CARDDAV_USERNAME}/addressbooks/"
export CARDDAV_USERNAME=your_carddav_user
export CARDDAV_PASSWORD=your_carddav_password
export CARDDAV_ADDRESSBOOKS="personal,family"

immich-carddav-sync sync
```

---

### `multi-sync`

The `multi-sync` command allows you to run synchronization for multiple configurations defined in a single configuration file. This is useful when you manage multiple Immich instances or CardDAV servers.

**Description:** Run synchronization on multiple configurations.

#### Options for `multi-sync` command

| **Option**      | **Description**                                                                                                                                                                                       |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-d, --dry-run` | Performs a "dry run" of the synchronization across all configurations. No pictures will actually be transferred or updated. This is useful for testing your configurations before committing to them. |

#### Arguments for `multi-sync` command

| **Argument**    | **Description**                                                                                                                                                         |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<config-file>` | The path to your configuration file (e.g., a JSON or YAML file) containing multiple synchronization setups. Refer to the example configuration for the expected format. |

**Example Usage for `multi-sync`:**

To run synchronization using a configuration file named `my-config.json`:

```bash
immich-carddav-sync multi-sync my-config.json
```

To perform a dry run for all configurations in `my-config.json`:

```bash
immich-carddav-sync multi-sync my-config.json --dry-run
# Or
immich-carddav-sync multi-sync my-config.json -d
```

Here's an example of a `my-config.json` file. Each object in the array represents a separate synchronization task with its own set of Immich and CardDAV credentials.

```js
[
  {
    immichUrl: "https://immich.example.com",
    immichKey: "YOUR_IMMICH_API_KEY_1",
    carddavUrl: "https://carddav.example.com",
    carddavPathTemplate: "/dav/${CARDDAV_USERNAME}/addressbooks/",
    carddavUsername: "your_carddav_user_1",
    carddavPassword: "your_carddav_password_1",
    carddavAddressbooks: ["personal", "family"],
    matchingContactsFile: "./manual-matches-1.json",
  },
  {
    immichUrl: "https://immich.example.com",
    immichKey: "YOUR_IMMICH_API_KEY_2",
    carddavUrl: "https://carddav.example.com",
    carddavPathTemplate: "/dav/${CARDDAV_USERNAME}/addressbooks/",
    carddavUsername: "your_carddav_user_2",
    carddavPassword: "your_carddav_password_2",
    matchingContactsFile: "./manual-matches-2.json",
    carddavAddressbooks: ["work"],
  },
];
```

The usage of `matchinContactsFile` is optional.

For docker usage, easily mount the config file into your container:

```yaml
volumes:
  - ./config.json:/app/config.json:ro
```

and set this file in your environment file:

```bash
    CONFIG_FILE=/app.config.json
```

---

## Manual Contact Matching

You can provide a JSON file that maps Immich person UUIDs to CardDAV UIDs for manual contact matching. This may be necessary if you have different naming schemes and the automatic matching isn't working correctly. You'll find the necessary configuration options in the preceding chapters. The following is a simple example of the file structure.

```js
{
  "immich-person-id-1": "carddav-contact-uid-1",
  "immich-person-id-2": "carddav-contact-uid-2",
  "immich-person-id-3": "carddav-contact-uid-3"
}
```

## Getting Help

For the version of the CLI:

```bash
immich-carddav-sync --version
```

For general help:

```bash
immich-carddav-sync --help
```

For help on a specific command (e.g., `sync`):

```bash
immich-carddav-sync sync --help
```
