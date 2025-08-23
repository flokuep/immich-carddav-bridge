import { describe, test, expect } from "vitest";
import { CardDavContact, ImmichPerson, MatchedContact } from "../../src/types";
import matchPeopleToContactsByName from "../../src/matcher/name";

describe("matchPeopleToContactsByName", () => {
  test("should correctly match people to contacts with exact names", () => {
    const immichPeople: ImmichPerson[] = [
      { id: "1", name: "Alice", preview: "preview_a" },
      { id: "2", name: "Bob", preview: "preview_b" },
      { id: "3", name: "Charlie", preview: "preview_c" },
    ];
    const cardDavContacts: CardDavContact[] = [
      { uid: "b", url: "url_b", etag: "etag_b", data: "data_b", name: "Bob" },
      { uid: "a", url: "url_a", etag: "etag_a", data: "data_a", name: "Alice" },
      { uid: "d", url: "url_d", etag: "etag_d", data: "data_d", name: "David" },
    ];

    const expectedMatches: MatchedContact[] = [
      { immich: immichPeople[0], cardDav: cardDavContacts[1] }, // Alice
      { immich: immichPeople[1], cardDav: cardDavContacts[0] }, // Bob
    ];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);

    expect(result).toEqual(expectedMatches);
    expect(result.length).toBe(2);
  });

  test("should return an empty array when no matches are found", () => {
    const immichPeople: ImmichPerson[] = [
      { id: "1", name: "Alice", preview: "preview_a" },
      { id: "2", name: "Bob", preview: "preview_b" },
    ];
    const cardDavContacts: CardDavContact[] = [
      {
        uid: "x",
        url: "url_x",
        etag: "etag_x",
        data: "data_x",
        name: "Xavier",
      },
      { uid: "y", url: "url_y", etag: "etag_y", data: "data_y", name: "Yara" },
    ];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  test("should return an empty array when both input arrays are empty", () => {
    const immichPeople: ImmichPerson[] = [];
    const cardDavContacts: CardDavContact[] = [];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  test("should return an empty array when immichPeople array is empty", () => {
    const immichPeople: ImmichPerson[] = [];
    const cardDavContacts: CardDavContact[] = [
      { uid: "a", url: "url_a", etag: "etag_a", data: "data_a", name: "Alice" },
    ];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    expect(result).toEqual([]);
  });

  test("should return an empty array when cardDavContacts array is empty", () => {
    const immichPeople: ImmichPerson[] = [
      { id: "1", name: "Alice", preview: "preview_a" },
    ];
    const cardDavContacts: CardDavContact[] = [];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    expect(result).toEqual([]);
  });

  test("should handle partial matches and unmatched items correctly", () => {
    const immichPeople: ImmichPerson[] = [
      { id: "1", name: "Anna", preview: "preview_a" },
      { id: "2", name: "Ben", preview: "preview_b" },
      { id: "3", name: "Clara", preview: "preview_c" },
      { id: "4", name: "Diego", preview: "preview_d" },
    ];
    const cardDavContacts: CardDavContact[] = [
      {
        uid: "b",
        url: "url_ben",
        etag: "etag_ben",
        data: "data_ben",
        name: "Ben",
      },
      {
        uid: "c",
        url: "url_clara",
        etag: "etag_clara",
        data: "data_clara",
        name: "Clara",
      },
      {
        uid: "e",
        url: "url_eve",
        etag: "etag_eve",
        data: "data_eve",
        name: "Eve",
      }, // Unique to CardDav
      {
        uid: "a",
        url: "url_anna_alt",
        etag: "etag_anna_alt",
        data: "data_anna_alt",
        name: "Anna",
      }, // Duplicate in cardDav, will only match once with current logic
    ];

    const expectedMatches: MatchedContact[] = [
      { immich: immichPeople[0], cardDav: cardDavContacts[3] }, // Anna (cardDavContacts[3] will be sorted before cardDavContacts[0])
      { immich: immichPeople[1], cardDav: cardDavContacts[0] }, // Ben
      { immich: immichPeople[2], cardDav: cardDavContacts[1] }, // Clara
    ];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    const sortedResult = result.toSorted((a, b) =>
      a.immich.name.localeCompare(b.immich.name)
    );
    const sortedExpected = expectedMatches.toSorted((a, b) =>
      a.immich.name.localeCompare(b.immich.name)
    );

    expect(sortedResult).toEqual(sortedExpected);
    expect(sortedResult.length).toBe(3);
  });

  test("should be case-sensitive", () => {
    const immichPeople: ImmichPerson[] = [
      { id: "1", name: "john", preview: "preview_j" },
    ];
    const cardDavContacts: CardDavContact[] = [
      {
        uid: "j",
        url: "url_john",
        etag: "etag_john",
        data: "data_john",
        name: "John",
      },
    ];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    expect(result).toEqual([]);
  });

  test("should handle names with special characters or numbers", () => {
    const immichPeople: ImmichPerson[] = [
      { id: "1", name: "João Silva", preview: "preview_j" },
      { id: "2", name: "User 123", preview: "preview_u" },
    ];
    const cardDavContacts: CardDavContact[] = [
      {
        uid: "j",
        url: "url_joao",
        etag: "etag_joao",
        data: "data_joao",
        name: "João Silva",
      },
      {
        uid: "u",
        url: "url_user",
        etag: "etag_user",
        data: "data_user",
        name: "User 123",
      },
    ];

    const expectedMatches: MatchedContact[] = [
      { immich: immichPeople[0], cardDav: cardDavContacts[0] },
      { immich: immichPeople[1], cardDav: cardDavContacts[1] },
    ];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    const sortedResult = result.toSorted((a, b) =>
      a.immich.name.localeCompare(b.immich.name)
    );
    const sortedExpected = expectedMatches.toSorted((a, b) =>
      a.immich.name.localeCompare(b.immich.name)
    );

    expect(sortedResult).toEqual(sortedExpected);
    expect(sortedResult.length).toBe(2);
  });

  test("should perform efficiently with large datasets", () => {
    const numItems = 10000;
    const immichPeople: ImmichPerson[] = [];
    const cardDavContacts: CardDavContact[] = [];

    for (let i = 0; i < numItems; i++) {
      immichPeople.push({
        id: `immich-${i}`,
        name: `Person ${i}`,
        preview: "preview_i",
      });
      // Create some matches and some non-matches
      if (i % 2 === 0) {
        cardDavContacts.push({
          uid: `${i}`,
          url: `dav-${i}`,
          etag: `etag-${i}`,
          data: `data-${i}`,
          name: `Person ${i}`,
        });
      } else {
        cardDavContacts.push({
          uid: `${i}`,
          url: `dav-nomatch-${i}`,
          etag: `etag-nomatch-${i}`,
          data: `data-nomatch-${i}`,
          name: `Another Person ${i}`,
        });
      }
    }

    // Shuffle one array to ensure sorting works correctly and isn't pre-sorted
    immichPeople.sort(() => Math.random() - 0.5);
    cardDavContacts.sort(() => Math.random() - 0.5);

    const startTime = process.hrtime.bigint();
    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    console.log(
      `Performance Test: Matched ${result.length} pairs in ${durationMs.toFixed(
        2
      )} ms for ${numItems} items.`
    );

    // Expect a reasonable number of matches (half of numItems)
    expect(result.length).toBe(numItems / 2);
    // Expect the duration to be within a reasonable limit (adjust based on your machine and acceptable performance)
    // This threshold might need tuning. On a typical dev machine, 10,000 items should be very fast.
    expect(durationMs).toBeLessThan(500); // Expect to complete within 500ms
  });

  test("should not trim whitespace by default for matching", () => {
    const immichPeople: ImmichPerson[] = [
      { id: "1", name: " Alice", preview: "preview_a" }, // leading space
      { id: "2", name: "Bob ", preview: "preview_b" }, // trailing space
      { id: "3", name: "Charlie", preview: "preview_c" },
    ];
    const cardDavContacts: CardDavContact[] = [
      { uid: "a", url: "url_a", etag: "etag_a", data: "data_a", name: "Alice" },
      { uid: "b", url: "url_b", etag: "etag_b", data: "data_b", name: "Bob" },
      {
        uid: "c",
        url: "url_c",
        etag: "etag_c",
        data: "data_c",
        name: " Charlie ",
      }, // both leading/trailing
    ];

    const result = matchPeopleToContactsByName(immichPeople, cardDavContacts);
    expect(result).toEqual([]);
  });
});
