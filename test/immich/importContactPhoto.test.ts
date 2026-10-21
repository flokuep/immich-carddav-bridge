import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkBulkUpload, uploadAsset, getFaces, createFace, updatePerson } from "@immich/sdk";
import { importContactPhoto } from "../../src/immich/importContactPhoto";
import { markExportedPhoto } from "../../src/carddav/photo";
vi.mock("@immich/sdk", () => ({
  checkBulkUpload: vi.fn(), uploadAsset: vi.fn(), getFaces: vi.fn(),
  createFace: vi.fn(), updatePerson: vi.fn(),
}));
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=";
const match = {
  immich: { id: "person", name: "Alice", preview: "" },
  cardDav: { uid: "contact", url: "https://cloud/contact.vcf", name: "Alice",
    data: `BEGIN:VCARD\r\nPHOTO;ENCODING=b:${png}\r\nEND:VCARD\r\n` },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(checkBulkUpload).mockImplementation(async ({ assetBulkUploadCheckDto }) => ({
    results: [{ id: assetBulkUploadCheckDto.assets[0].id, action: "accept" as never }],
  }));
  vi.mocked(uploadAsset).mockResolvedValue({ id: "asset", status: "created" as never });
  vi.mocked(getFaces).mockResolvedValue([]);
});
describe("CardDAV to Immich", () => {
  it("uploads, assigns the full portrait and sets the feature photo with scoped credentials", async () => {
    expect(await importContactPhoto("https://immich/api", "key", match)).toBe("imported");
    const upload = vi.mocked(uploadAsset).mock.calls[0][0];
    expect(upload.xImmichChecksum).toMatch(/^[a-f0-9]{40}$/);
    expect(upload.assetMediaCreateDto.assetData).toBeInstanceOf(File);
    expect(createFace).toHaveBeenCalledWith({ assetFaceCreateDto: {
      assetId: "asset", personId: "person", imageWidth: 1, imageHeight: 1, x: 0, y: 0, width: 1, height: 1,
    } }, expect.objectContaining({ baseUrl: "https://immich/api", headers: { "x-api-key": "key" } }));
    expect(updatePerson).toHaveBeenCalledWith({ id: "person", personUpdateDto: { featureFaceAssetId: "asset" } }, expect.anything());
  });
  it("reuses uploads and faces on a later run", async () => {
    await importContactPhoto("https://a/api", "a", match);
    vi.mocked(checkBulkUpload).mockImplementation(async ({ assetBulkUploadCheckDto }) => ({
      results: [{ id: assetBulkUploadCheckDto.assets[0].id, action: "reject" as never, assetId: "asset" }],
    }));
    vi.mocked(getFaces).mockResolvedValue([{ person: { id: "person" } }] as never);
    await importContactPhoto("https://b/api", "b", match);
    expect(uploadAsset).toHaveBeenCalledTimes(1);
    expect(createFace).toHaveBeenCalledTimes(1);
    expect(updatePerson).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ baseUrl: "https://b/api", headers: { "x-api-key": "b" } }));
  });
  it("does not feed exported thumbnails back", async () => {
    const marked = { ...match, cardDav: { ...match.cardDav, data: markExportedPhoto(match.cardDav.data, Buffer.from(png, "base64")) } };
    expect(await importContactPhoto("https://a/api", "key", marked)).toBe("skipped");
    expect(await importContactPhoto("https://a/api", "key", match, new Blob([Buffer.from(png, "base64")]))).toBe("skipped");
    expect(checkBulkUpload).not.toHaveBeenCalled();
  });
  it("does not steal faces or restore images from trash", async () => {
    vi.mocked(getFaces).mockResolvedValue([{ person: { id: "somebody-else" } }] as never);
    await expect(importContactPhoto("https://a/api", "key", match)).rejects.toThrow("different person");
    expect(createFace).not.toHaveBeenCalled();
    expect(updatePerson).not.toHaveBeenCalled();
    vi.mocked(checkBulkUpload).mockImplementation(async ({ assetBulkUploadCheckDto }) => ({
      results: [{ id: assetBulkUploadCheckDto.assets[0].id, action: "reject" as never, assetId: "asset", isTrashed: true }],
    }));
    await expect(importContactPhoto("https://a/api", "key", match)).rejects.toThrow("trash");
  });
  it("retries a failed feature update without duplicating the upload or manual face", async () => {
    vi.mocked(updatePerson).mockRejectedValueOnce(new Error("processing"));
    await expect(importContactPhoto("https://a/api", "key", match)).rejects.toThrow("processing");
    vi.mocked(checkBulkUpload).mockImplementation(async ({ assetBulkUploadCheckDto }) => ({
      results: [{ id: assetBulkUploadCheckDto.assets[0].id, action: "reject" as never, assetId: "asset" }],
    }));
    vi.mocked(getFaces).mockResolvedValue([{ person: { id: "person" } }] as never);
    await importContactPhoto("https://a/api", "key", match);
    expect(uploadAsset).toHaveBeenCalledTimes(1);
    expect(createFace).toHaveBeenCalledTimes(1);
  });
  it("propagates permission failures", async () => {
    vi.mocked(checkBulkUpload).mockRejectedValue(new Error("403"));
    await expect(importContactPhoto("https://a/api", "key", match)).rejects.toThrow("403");
    expect(uploadAsset).not.toHaveBeenCalled();
  });
});
