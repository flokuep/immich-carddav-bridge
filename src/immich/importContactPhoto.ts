import { checkBulkUpload, uploadAsset, getFaces, createFace, updatePerson } from "@immich/sdk";
import { createHash } from "node:crypto";
import { readContactPhoto, photoHash } from "../carddav/photo";
import { immichRequest } from "./request";
import { MatchedContact } from "../types";

/**
 * Contact portraits are manually assigned using the entire image as the face box.
 * Server-side SHA1 deduplication reuses uploaded assets after retries and bridge restarts.
 * Existing face assignments are reused; feature-photo selection is reapplied on each import.
 * This assumes a single-person portrait and does not validate its content with face recognition.
 */
export async function importContactPhoto(
  baseUrl: string, apiKey: string, matching: MatchedContact, thumbnail?: Blob
): Promise<"imported" | "skipped"> {
  const photo = readContactPhoto(matching.cardDav.data);
  if (!photo || photo.exportedByBridge) return "skipped";
  // Also recognize unmarked thumbnails exported by older bridge versions.
  if (thumbnail && photoHash(new Uint8Array(await thumbnail.arrayBuffer())) === photo.hash) return "skipped";

  const request = () => immichRequest(baseUrl, apiKey);
  // Immich uses SHA1 for deduplication; SHA256 identifies images and provenance within the bridge.
  const checksum = createHash("sha1").update(photo.bytes).digest("hex");
  const check = await checkBulkUpload({
    assetBulkUploadCheckDto: { assets: [{ id: photo.hash, checksum }] },
  }, request());
  const result = check.results.find((entry) => entry.id === photo.hash);
  // Never implicitly restore an image that the user has moved to the Immich trash.
  if (!result || result.isTrashed) throw new Error("Upload check failed or contact image is in Immich trash.");
  if (!result.assetId && result.action !== "accept") throw new Error("Immich rejected the contact image.");

  let assetId = result.assetId;
  if (!assetId) {
    const now = new Date().toISOString();
    const filename = `carddav-${photo.hash}.${photo.extension}`;
    const uploaded = await uploadAsset({
      xImmichChecksum: checksum,
      assetMediaCreateDto: {
        assetData: new File([new Uint8Array(photo.bytes)], filename, { type: photo.mimeType }),
        filename, fileCreatedAt: now, fileModifiedAt: now,
      },
    }, request());
    assetId = uploaded.id;
    if (!assetId) throw new Error("Immich returned no asset ID.");
  }

  // Resume after a partial failure without duplicating a successful face assignment.
  const faces = await getFaces({ id: assetId }, request());
  const personId = matching.immich.id;
  if (!faces.some((face) => face.person?.id === personId)) {
    // Never steal/reassign an existing face belonging to somebody else.
    if (faces.some((face) => face.person && face.person.id !== personId)) {
      throw new Error("Contact image already has a different person assigned; resolve this in Immich.");
    }
    // A full-image manual face box avoids relying on automatic detection of small portraits.
    await createFace({
      assetFaceCreateDto: {
        assetId, personId, imageWidth: photo.width, imageHeight: photo.height,
        x: 0, y: 0, width: photo.width, height: photo.height,
      },
    }, request());
  }
  // Change only the feature photo; Immich generates the displayed thumbnail asynchronously.
  await updatePerson({ id: personId, personUpdateDto: { featureFaceAssetId: assetId } }, request());
  return "imported";
}
