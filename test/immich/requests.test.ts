import { afterEach, describe, expect, it, vi } from "vitest";
import { getImmichPeople } from "../../src/immich";
import { importContactPhoto } from "../../src/immich/importContactPhoto";
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=";
afterEach(() => vi.unstubAllGlobals());
describe("real SDK request contracts", () => {
  it("keeps concurrent account URLs and keys separate", async () => {
    const calls: { url: string; key: string | null }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      calls.push({ url: String(url), key: new Headers(options.headers).get("x-api-key") });
      return Response.json({ people: [], total: 0, hasNextPage: false });
    }));
    await Promise.all([getImmichPeople("https://one/api", "one"), getImmichPeople("https://two/api", "two")]);
    expect(calls).toEqual(expect.arrayContaining([
      { url: expect.stringContaining("https://one/api/people"), key: "one" },
      { url: expect.stringContaining("https://two/api/people"), key: "two" },
    ]));
  });
  it("sends a named multipart image and then creates and selects the manual face", async () => {
    const calls: { url: string; options: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/bulk-upload-check")) {
        const body = JSON.parse(options.body as string);
        return Response.json({ results: [{ id: body.assets[0].id, action: "accept" }] });
      }
      if (String(url).endsWith("/assets")) {
        const body = options.body as FormData;
        const file = body.get("assetData") as File;
        expect(file.name).toMatch(/^carddav-[a-f0-9]{64}\.png$/);
        expect(file.type).toBe("image/png");
        expect(Buffer.from(await file.arrayBuffer()).toString("base64")).toBe(png);
        expect(new Headers(options.headers).get("x-immich-checksum")).toMatch(/^[a-f0-9]{40}$/);
        return Response.json({ id: "asset", status: "created" }, { status: 201 });
      }
      if (String(url).includes("/faces?")) return Response.json([]);
      if (String(url).endsWith("/faces")) return new Response(null, { status: 201 });
      if (String(url).endsWith("/people/person")) return Response.json({ id: "person" });
      throw new Error("Unexpected request " + url);
    }));
    await importContactPhoto("https://immich/api", "key", {
      immich: { id: "person", name: "Alice", preview: "" },
      cardDav: { uid: "c", name: "Alice", url: "url", data: `PHOTO;ENCODING=b:${png}\r\n` },
    });
    expect(calls).toHaveLength(5);
    for (const call of calls) {
      expect(new Headers(call.options.headers).get("x-api-key")).toBe("key");
    }
    expect(JSON.parse(calls[3].options.body as string)).toMatchObject({ personId: "person", assetId: "asset" });
    expect(JSON.parse(calls[4].options.body as string)).toEqual({ featureFaceAssetId: "asset" });
  });
});
