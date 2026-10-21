import { describe, it, expect, vi } from "vitest";
import { updateContacts } from "../../src/carddav/carddav";
import { processSingleContactUpdate } from "../../src/carddav/updateContacts";
vi.mock("../../src/carddav/client", () => ({ createDavClient: vi.fn().mockResolvedValue({}) }));
vi.mock("../../src/carddav/updateContacts", () => ({ processSingleContactUpdate: vi.fn() }));
describe("photo completion before birthday writes", () => {
  it("waits for outstanding writes even when an earlier write fails", async () => {
    let complete!: () => void;
    const pending = new Promise<void>((resolve) => { complete = resolve; });
    vi.mocked(processSingleContactUpdate).mockRejectedValueOnce(new Error("412")).mockReturnValueOnce(pending);
    let finished = false;
    const operation = updateContacts("url", "user", "pass", [{}, {}] as never, {})
      .catch((error) => { finished = true; return error; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(finished).toBe(false);
    complete();
    expect(await operation).toBeInstanceOf(AggregateError);
    expect(finished).toBe(true);
  });
});
