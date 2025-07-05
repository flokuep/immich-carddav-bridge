import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { DAVAddressBook, DAVClient, DAVObject } from "tsdav";
import { parseVCards } from "vcard4-ts";
import { BaseOptions } from "../../src/types"; // Pfad anpassen
import {
  fetchAndParseVCards,
  getPrimaryCardDavAddressBook,
} from "../../src/carddav/fetchContacts";
import consola from "consola";

const mockFetchAddressBooks = vi.fn();
const mockFetchVCards = vi.fn();

vi.mock("tsdav", () => {
  return {
    DAVClient: vi.fn(() => ({
      login: vi.fn().mockResolvedValue(undefined), // Mock login if it's called
      fetchAddressBooks: mockFetchAddressBooks,
      fetchVCards: mockFetchVCards,
    })),
    DAVAddressBook: vi.fn(),
    DAVObject: vi.fn(),
  };
});

vi.mock("vcard4-ts", () => {
  return {
    parseVCards: vi.fn(),
  };
});

describe("CardDAV Client Operations", () => {
  let mockClient: DAVClient;
  let defaultOptions: BaseOptions;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset mocks before each test to ensure isolation
    mockFetchAddressBooks.mockReset();
    mockFetchVCards.mockReset();
    vi.mocked(parseVCards).mockReset();

    // Create a new mock client instance for each test
    // DAVClient is mocked to return the same mock functions each time
    mockClient = new DAVClient({
      serverUrl: "any",
      credentials: { username: "a", password: "b" },
    });

    defaultOptions = {
      carddavUrl: "https://test.cloud.com/remote.php/dav",
      carddavPath: "/addressbooks/users/testuser/kontakte/",
      carddavUsername: "testuser",
      carddavPassword: "testpassword",
      immichUrl: "testurl",
      immichKey: "testkey",
    };

    consoleWarnSpy = vi.spyOn(consola, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(consola, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(consola, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("getPrimaryCardDavAddressBook", () => {
    test("should return the first address book if found", async () => {
      const mockAddressBook: DAVAddressBook = {
        url: "https://test.cloud.com/dav/addressbooks/user/test/",
        displayName: "Test Contacts",
        description: "My contacts",
      };
      mockFetchAddressBooks.mockResolvedValueOnce([mockAddressBook]);

      const result = await getPrimaryCardDavAddressBook(
        mockClient,
        defaultOptions
      );

      expect(result).toEqual(mockAddressBook);
      expect(mockFetchAddressBooks).toHaveBeenCalledTimes(1);
      expect(mockFetchAddressBooks).toHaveBeenCalledWith({
        account: expect.objectContaining({
          accountType: "carddav",
          serverUrl: "https://test.cloud.com/remote.php/dav",
          credentials: {
            username: "testuser",
            password: "testpassword",
          },
          homeUrl:
            "https://test.cloud.com/remote.php/dav/addressbooks/users/testuser/kontakte/",
          rootUrl:
            "https://test.cloud.com/remote.php/dav/addressbooks/users/testuser/kontakte/",
        }),
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Connecting to CardDAV address book")
      );
    });

    test("should throw an error if no address books are found", async () => {
      mockFetchAddressBooks.mockResolvedValueOnce([]);

      await expect(
        getPrimaryCardDavAddressBook(mockClient, defaultOptions)
      ).rejects.toThrow("No CardDAV address books found.");
      expect(mockFetchAddressBooks).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled(); // No log message if no address book found
    });

    test("should throw an error if fetchAddressBooks fails", async () => {
      const mockError = new Error("Network error");
      mockFetchAddressBooks.mockRejectedValueOnce(mockError); // Simulate network error

      await expect(
        getPrimaryCardDavAddressBook(mockClient, defaultOptions)
      ).rejects.toThrow(mockError);
      expect(mockFetchAddressBooks).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("fetchAndParseVCards", () => {
    const mockAddressBook: DAVAddressBook = {
      url: "https://test.cloud.com/dav/addressbooks/user/test/",
      displayName: "Test Contacts",
      description: "My contacts",
    };

    test("should fetch and parse vCards correctly", async () => {
      const vCardData1 =
        "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:John Doe\r\nEND:VCARD";
      const vCardData2 =
        "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Jane Smith\r\nEND:VCARD";

      mockFetchVCards.mockResolvedValueOnce([
        { url: "url1", etag: "etag1", data: vCardData1 } as DAVObject,
        { url: "url2", etag: "etag2", data: vCardData2 } as DAVObject,
      ]);

      vi.mocked(parseVCards).mockImplementation((data: string) => {
        if (data === vCardData1) {
          return { vCards: [{ FN: [{ value: "John Doe" }] }] } as any;
        }
        if (data === vCardData2) {
          return { vCards: [{ FN: [{ value: "Jane Smith" }] }] } as any;
        }
        return { vCards: [] } as any;
      });

      const result = await fetchAndParseVCards(mockClient, mockAddressBook);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        url: "url1",
        etag: "etag1",
        data: vCardData1,
        name: "John Doe",
      });
      expect(result[1]).toEqual({
        url: "url2",
        etag: "etag2",
        data: vCardData2,
        name: "Jane Smith",
      });
      expect(mockFetchVCards).toHaveBeenCalledTimes(1);
      expect(mockFetchVCards).toHaveBeenCalledWith({
        addressBook: mockAddressBook,
      });
      expect(vi.mocked(parseVCards)).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test("should handle DAVObjects with no data", async () => {
      const vCardData1 =
        "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Valid Contact\r\nEND:VCARD";

      mockFetchVCards.mockResolvedValueOnce([
        {
          url: "url_no_data",
          etag: "etag_no_data",
          data: undefined,
        } as DAVObject, // No data
        { url: "url_valid", etag: "etag_valid", data: vCardData1 } as DAVObject,
      ]);

      vi.mocked(parseVCards).mockImplementation((data: string) => {
        if (data === vCardData1) {
          return { vCards: [{ FN: [{ value: "Valid Contact" }] }] } as any;
        }
        return { vCards: [] } as any;
      });

      const result = await fetchAndParseVCards(mockClient, mockAddressBook);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Valid Contact");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("contains no data")
      );
      expect(vi.mocked(parseVCards)).toHaveBeenCalledTimes(1); // Only called for the valid vCard
    });

    test("should handle DAVObjects with invalid or no vCards", async () => {
      const vCardDataValid =
        "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Valid Contact\r\nEND:VCARD";
      const vCardDataInvalid = "Invalid vCard data"; // Will result in no parsed vCards

      mockFetchVCards.mockResolvedValueOnce([
        {
          url: "url_invalid_vcard",
          etag: "etag_invalid",
          data: vCardDataInvalid,
        } as DAVObject,
        {
          url: "url_empty_vcard",
          etag: "etag_empty",
          data: "BEGIN:VCARD\r\nEND:VCARD",
        } as DAVObject, // No FN field
        {
          url: "url_valid",
          etag: "etag_valid",
          data: vCardDataValid,
        } as DAVObject,
      ]);

      vi.mocked(parseVCards).mockImplementation((data: string) => {
        if (data === vCardDataValid) {
          return { vCards: [{ FN: [{ value: "Valid Contact" }] }] } as any;
        }
        // Simulate parseVCards returning empty array or null for invalid data / no FN
        if (data === "BEGIN:VCARD\r\nEND:VCARD") {
          return { vCards: [{}] } as any; // Empty vCard object, no FN
        }
        return { vCards: [] } as any; // No valid vCards parsed
      });

      const result = await fetchAndParseVCards(mockClient, mockAddressBook);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Valid Contact");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("No valid vCards found")
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("has no FN (Full Name) field")
      );
      expect(vi.mocked(parseVCards)).toHaveBeenCalledTimes(3); // Called for all three DAVObjects
    });
  });
});
