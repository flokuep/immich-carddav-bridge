import { DAVClient } from "tsdav";
import { MatchedContact } from "../types";
import { foldLine } from "../utils";
import consola from "consola";
import { hasContactPhoto, markExportedPhoto } from "./photo";

/**
 * Fill a missing photo from the supplied Immich thumbnail and upload the amended vCard.
 * @param client - The initialized DAVClient.
 * @param matching - The matching object containing Immich person and CardDav contact.
 * @param thumbnails - Map of Immich IDs to Blob thumbnails.
 * @returns Resolves after a successful write or when a photo update is skipped.
 * @throws If photo conversion, the DAV request, or its HTTP response indicates failure.
 */
export async function processSingleContactUpdate(
  client: DAVClient,
  matching: MatchedContact,
  thumbnails: { [key: string]: Blob }
): Promise<void> {
  const { immich, cardDav } = matching;
  
  // Protect existing photos even when this function is called without export pre-filtering.
  if (hasContactPhoto(cardDav.data)) return;

  const blob = thumbnails[immich.id];

  if (!blob) {
    consola.warn(
      `No thumbnail found for Immich person "${immich.name}" (ID: ${immich.id}). Skipping update.`
    );
    return;
  }

  try {
    const photoValue = createPhotoVCardValue(
      await blob.arrayBuffer(),
      blob.type
    );
    const updatedVCardData = updateVCardPhotoField(
      cardDav.data,
      photoValue,
      immich.name
    );

    // Mark the exported bytes to prevent re-import; preserve the original URL, ETag and other fields.
    const newVCard = { ...cardDav, data: markExportedPhoto(updatedVCardData, new Uint8Array(await blob.arrayBuffer())) };

    // DAV HTTP errors may be returned as responses instead of rejected promises.
    const response = await client.updateVCard({
      vCard: newVCard,
    });
    if (!response.ok) throw new Error("CardDAV update failed: HTTP " + response.status);
    if (!response.ok) throw new Error("CardDAV update failed: HTTP " + response.status);
  } catch (error) {
    consola.error(
      `Error updating thumbnail for ${immich.name} (${immich.id}):`,
      error
    );
    // Let the command report the failed write instead of claiming full success.
    throw error;
  }
}

/**
 * Creates the PHOTO field value in vCard format from an image buffer and mime type.
 * @param imageBuffer - The ArrayBuffer of the image.
 * @param mimeType - The MIME type of the image (e.g., "image/jpeg").
 * @returns The formatted PHOTO field value.
 * @throws {Error} If the MIME type is invalid.
 */
function createPhotoVCardValue(
  imageBuffer: ArrayBuffer,
  mimeType: string
): string {
  const buffer = Buffer.from(imageBuffer);
  const base64Image = buffer.toString("base64");

  const mimeParts = mimeType.split("/");
  if (mimeParts.length < 2) {
    throw new Error(`Invalid MIME type: ${mimeType}`);
  }
  const typeParam = mimeParts[1].toUpperCase();

  return `PHOTO;ENCODING=b;TYPE=${typeParam}:${base64Image}`;
}

/**
 * Updates the PHOTO field within a vCard string with a new photo value.
 * Handles existing PHOTO fields by replacing them, or adds a new one.
 * @param originalVCardData - The original vCard as a string.
 * @param photoValue - The new PHOTO field value (e.g., "PHOTO;ENCODING=b;TYPE=JPEG:base64data").
 * @param contactName - The contact's name for logging purposes.
 * @returns The updated vCard string.
 */
function updateVCardPhotoField(
  originalVCardData: string,
  photoValue: string,
  contactName: string
): string {
  let cardDavLines = originalVCardData.split("\r\n");
  const foldedPhoto = foldLine(photoValue, 75);

  const photoFirstLineIndex = cardDavLines.findIndex((entry) =>
    entry.startsWith("PHOTO")
  );

  if (photoFirstLineIndex !== -1) {
    let photoLastLineIndex = photoFirstLineIndex;
    while (
      photoLastLineIndex + 1 < cardDavLines.length &&
      cardDavLines[photoLastLineIndex + 1].startsWith(" ")
    ) {
      photoLastLineIndex++;
    }

    cardDavLines.splice(
      photoFirstLineIndex,
      photoLastLineIndex - photoFirstLineIndex + 1,
      ...foldedPhoto.split("\r\n")
    );
  } else {
    const endVCardIndex = cardDavLines.indexOf("END:VCARD");
    if (endVCardIndex !== -1) {
      consola.info(
        `${contactName}: No existing photo found. Adding new photo.`
      );
      cardDavLines.splice(endVCardIndex, 0, ...foldedPhoto.split("\r\n"));
    } else {
      consola.warn(
        `Warning: "END:VCARD" not found for ${contactName}. Appending photo at the end.`
      );
      cardDavLines.push(...foldedPhoto.split("\r\n"));
      cardDavLines.push("END:VCARD");
    }
  }

  return cardDavLines.join("\r\n");
}
