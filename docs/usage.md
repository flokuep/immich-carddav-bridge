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
| `--carddav-path-template <pathTemplate>`          | `CARDDAV_PATH_TEMPLATE`  | A template for the path to your CardDAV address books. This often includes placeholders like `$CARDDAV_USERNAME`.                                                                                                                                                                                                                                    |
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
| `<config-file>` | The path to your configuration file (a JSON file) containing multiple synchronization setups. Refer to the example configuration for the expected format. |

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

```json
[
  {
    "immichUrl": "https://immich.example.com/api",
    "immichKey": "REPLACE_WITH_IMMICH_API_KEY",
    "carddavUrl": "https://carddav.example.com",
    "carddavPathTemplate": "/addressbooks/$CARDDAV_USERNAME/",
    "carddavUsername": "REPLACE_WITH_CARDDAV_USERNAME",
    "carddavPassword": "REPLACE_WITH_CARDDAV_PASSWORD_OR_TOKEN",
    "carddavAddressbooks": [
      "contacts"
    ],
    "birthdaySync": "bidirectional",
    "birthdayStateFile": "/app/.bridge-state/birthdays.json",
    "skipPhotos": false
  }
]
```

This is also available as [`config.example.json`](../config.example.json). Copy it to `config.json` before editing. The `matchingContactsFile` field is optional and can be added when manual matching is needed.

For docker usage, easily mount the config file into your container:

```yaml
volumes:
  - ./config.json:/app/config.json:ro
```

and set this file in your environment file:

```bash
    CONFIG_FILE=/app/config.json
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

## Contact photo synchronization

Existing CardDAV contact photos take priority. For each unambiguous match:

- If the contact has an embedded photo, the bridge uploads it to Immich as an additional library asset, manually assigns the entire portrait to the matched person, and selects that asset as the person's feature photo.
- If the contact has no photo, the bridge fills it with the Immich person's thumbnail.
- An unchanged thumbnail exported by this bridge is marked with `X-IMMICH-PHOTO-SHA256` and is not imported back. Older unmarked exports are recognized when their bytes match the current Immich thumbnail.

Use portraits of a single person: the manual face box covers the whole contact image. Immich generates the displayed person thumbnail asynchronously and may crop it. New contact images become ordinary photos in the library. Changed portraits create new assets; the bridge does not delete previous imports.

### Immich API permissions

The bridge needs these permissions on the API key belonging to the intended Immich user:

- `person.read`, `person.update`
- `asset.upload`, `asset.read`, `asset.update`
- `face.read`, `face.create`

This implementation targets the API contracts of the pinned Immich SDK 3.2.0. No database access or access to Immich's storage directories is required.

### Formats, conflicts and retries

Embedded base64 JPEG, PNG, GIF and WebP photos are supported (vCard 3 binary encoding and vCard 4 data URIs), up to 10 MiB per photo. Linked photos, multiple PHOTO properties and invalid photos are reported and left unchanged; remote image URLs are not fetched.

Duplicate names are excluded from automatic matching. Use a manual Immich-ID-to-CardDAV-UID mapping for these contacts. Incomplete mappings, reused targets and ambiguous UIDs are skipped.

Immich's checksum check reuses existing library assets, including after a bridge restart or a failed request. The bridge checks for an existing face assignment before creating one. If an image is assigned to another person without a matching assignment to the intended person, the import stops with a conflict.

On each run, the selected contact portrait is reapplied as the Immich feature photo. Uploads and manual face assignments are reused; feature-photo updates may regenerate thumbnails. This is a CardDAV-priority policy, not change tracking of manual Immich feature-photo selections.

If Immich is still processing an uploaded asset, a later run can retry its assignment without uploading another copy. Trashed duplicates are reported rather than restored. Failed imports leave the CardDAV photo intact, other contacts can still be processed, and the command exits with an error.

Run only one bridge job per overlapping set of accounts at a time; server checksum deduplication prevents duplicate uploads but does not make concurrent manual face creation atomic. Multiple configurations within one invocation are processed sequentially.

### Test and enable

After rebuilding the container, first inspect the plan:

```bash
docker compose build
docker compose run --rm --entrypoint node immich-carddav-bridge /app/dist/index.js multi-sync /app/config.json --dry-run
```

The dry run reads and validates contacts and reports directions; it does not upload assets, change person assignments, download thumbnails or update contacts. It does not verify write permissions.

To perform the synchronization:

```bash
docker compose run --rm --entrypoint node immich-carddav-bridge /app/dist/index.js multi-sync /app/config.json
```

No additional configuration fields or local state volume are required for image deduplication. Birthday synchronization can be enabled separately as described below.

## Birthday synchronization

Birthday synchronization is opt-in. Enable it per JSON configuration:

```json
{
  "birthdaySync": "bidirectional",
  "birthdayStateFile": "/app/.bridge-state/birthdays.json",
  "skipPhotos": true
}
```

Add these fields to the existing configuration object, keeping its connection settings. Remove `skipPhotos` or set it to `false` to synchronize both portraits and birthdays.

The example URL and `carddavPathTemplate` must be adapted to your CardDAV server; there is no universal address book path.

Supported modes:

| Mode | Behavior |
| --- | --- |
| `off` (default) | Existing portrait synchronization only. |
| `carddav-to-immich` | Import complete CardDAV birthdays; preserve independent Immich edits as conflicts. |
| `bidirectional` | Propagate changes from either side using the last confirmed common value. |

CLI options `--birthday-sync <mode>`, `--birthday-state-file <path>` and `--skip-photos` are supported by both `sync` and `multi-sync`. Explicit CLI options override JSON values. JSON values override `BIRTHDAY_SYNC`, `BIRTHDAY_STATE_FILE` and `SKIP_PHOTOS=true` environment defaults. The default state path is `.bridge-state/birthdays.json` relative to the working directory.

### Dates and conflicts

- Only complete, valid dates are synchronized. Immich receives `YYYY-MM-DD`; vCard 3 and vCard 4 values are written in their appropriate date format.
- Yearless birthdays, text values, explicit Apple omitted-year dates, non-Gregorian values, multiple BDAY properties, invalid dates and future dates are left unchanged. No replacement year is invented.
- On the first run, matching dates are recorded without writes. A complete date present only on one side fills the missing side, subject to the selected direction. Two different existing dates produce a conflict.
- On subsequent runs, a one-sided edit is propagated if the other birthday still matches the saved baseline. Different edits on both sides produce a conflict.
- Deleting a previously synchronized birthday produces a conflict; the bridge does not delete or automatically restore it. To accept a deletion, remove the birthday from both sides. To resolve a date conflict, set both sides to the intended same date and run again.
- Unsupported values are skipped with a warning. Conflicts and failed requests produce an unsuccessful command exit after processing the other contacts.
- Contacts must have a stable UID and an unambiguous match. Renamed contacts still need to match through the existing name or manual-mapping mechanism; the birthday state does not create new identity mappings.

The state contains versioned, hashed pair identifiers and the last confirmed dates, not passwords or API keys. API-key rotation creates a fresh scope and therefore applies first-run rules. Back up the state together with the configuration. Do not silently delete it to resolve conflicts: losing a baseline also loses the distinction between a later deletion and an initially missing value.

### Persistence and concurrency

Mount a writable persistent directory at `/app/.bridge-state`, for example:

```yaml
services:
  immich-carddav-bridge:
    volumes:
      - ./config.json:/app/config.json:ro
      - birthday-state:/app/.bridge-state
volumes:
  birthday-state:
```

Share the same checkpoint file between bridge jobs that can access overlapping contacts. An exclusive lock protects the read/update/checkpoint sequence. Checkpoints are atomically replaced only after the written date has been read back and confirmed on both servers. A checkpoint failure stops further birthday writes.

A crash can leave `birthdays.json.lock` behind. Stop all bridge jobs, verify that no other process uses that checkpoint, and only then remove the stale lock. The bridge never steals locks automatically. Corrupt or unsupported state files cause an error rather than being reset.

Birthday writes run after all portrait exports have settled and use freshly read vCards, preserving unrelated contact changes. CardDAV writes require a strong ETag and use `If-Match`; HTTP 412 is reported without an unconditional retry.

Immich does not provide a conditional birthday-update operation. Reading both sides immediately before writing reduces the race window, and read-back verifies the result, but it cannot fully prevent an overlapping manual Immich edit between the final read and write.

### Permissions and first run

Birthday-only synchronization requires `person.read` and `person.update` on the Immich API key, and read/write access to the selected CardDAV address books. Portrait synchronization still needs the additional permissions listed above.

Rebuild and inspect the birthday plan first:

```bash
docker compose build
docker compose run --rm --entrypoint node immich-carddav-bridge /app/dist/index.js multi-sync /app/config.json --birthday-sync bidirectional --skip-photos --dry-run
```

Remove `--dry-run` to apply the changes. A dry run reads current birthdays and the existing checkpoint but creates no directories, lock files, checkpoints or remote mutations. It reports conflicts without applying them and does not verify write permissions.

For scheduled synchronization, put `birthdaySync` and optionally `skipPhotos` in each JSON configuration or set the corresponding service environment variables, then recreate the container with `docker compose up -d`. Command-line overrides on a one-off `docker compose run` do not change the scheduled job.
