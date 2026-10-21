import { beforeEach, describe, expect, it, vi } from "vitest";
import multiSync from "../../src/commands/multiSync";
import sync from "../../src/commands/sync";
import { readFile } from "../../src/utils";
vi.mock("../../src/commands/sync", () => ({ default: vi.fn() }));
vi.mock("../../src/utils", () => ({ readFile: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
describe("multi-sync", () => {
  it("awaits configurations in order and continues after reporting an error", async () => {
    const options = [{ immichUrl: "first" }, { immichUrl: "second" }];
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(options));
    const finished: string[] = [];
    vi.mocked(sync).mockImplementation(async (option) => {
      await Promise.resolve();
      finished.push(option.immichUrl);
      if (option.immichUrl === "first") throw new Error("failed");
    });
    await expect(multiSync("config.json")).rejects.toThrow("One or more");
    expect(finished).toEqual(["first", "second"]);
  });
it("preserves JSON birthday options unless an explicit override was supplied", async () => {
  vi.mocked(readFile).mockResolvedValue(JSON.stringify([{ immichUrl: "first", birthdaySync: "carddav-to-immich", skipPhotos: true }]));
  await multiSync("config.json", true, { birthdaySync: undefined });
  expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ birthdaySync: "carddav-to-immich", skipPhotos: true }), true);
  await multiSync("config.json", true, { birthdaySync: "bidirectional", skipPhotos: false });
  expect(sync).toHaveBeenLastCalledWith(expect.objectContaining({ birthdaySync: "bidirectional", skipPhotos: false }), true);
});

});
