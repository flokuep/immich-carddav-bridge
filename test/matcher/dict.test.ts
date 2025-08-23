import { describe, it, expect, vi } from "vitest";
import consola from "consola";
import matchPeopleToContactsByDict from "../../src/matcher/dict";

const mockImmichPeople = [
  { id: "immich1", name: "Alice", preview: "preview_alice" },
  { id: "immich2", name: "Bob", preview: "preview_bob" },
];

const mockCardDavContacts = [
  {
    uid: "carddavA",
    name: "Alice's Contact",
    email: "",
    url: "urlA",
    data: "dataA",
  },
  {
    uid: "carddavB",
    name: "Bob's Contact",
    email: "",
    url: "urlB",
    data: "dataB",
  },
];

describe("matchPeopleToContactsByDict", () => {
  it("should correctly match people to contacts based on the dictionary", () => {
    const dict = {
      immich1: "carddavA",
      immich2: "carddavB",
    };

    const result = matchPeopleToContactsByDict(
      mockImmichPeople,
      mockCardDavContacts,
      dict
    );

    expect(result).toEqual([
      {
        immich: { id: "immich1", name: "Alice", preview: "preview_alice" },
        cardDav: {
          uid: "carddavA",
          name: "Alice's Contact",
          email: "",
          url: "urlA",
          data: "dataA",
        },
      },
      {
        immich: { id: "immich2", name: "Bob", preview: "preview_bob" },
        cardDav: {
          uid: "carddavB",
          name: "Bob's Contact",
          email: "",
          url: "urlB",
          data: "dataB",
        },
      },
    ]);
  });

  it("should return a matched pair with undefined if an immich person is not found", () => {
    vi.spyOn(consola, "warn");
    const dict = { immich3: "carddavA" };

    const result = matchPeopleToContactsByDict(
      mockImmichPeople,
      mockCardDavContacts,
      dict
    );

    expect(result).toEqual([
      {
        immich: undefined,
        cardDav: {
          uid: "carddavA",
          name: "Alice's Contact",
          email: "",
          url: "urlA",
          data: "dataA",
        },
      },
    ]);
    expect(consola.warn).toHaveBeenCalledWith(
      "Cannot find immich person with id immich3 to match CardDav Contact carddavA"
    );
  });

  it("should return a matched pair with undefined if a carddav contact is not found", () => {
    vi.spyOn(consola, "warn");
    const dict = { immich1: "carddavC" };

    const result = matchPeopleToContactsByDict(
      mockImmichPeople,
      mockCardDavContacts,
      dict
    );

    expect(result).toEqual([
      {
        immich: { id: "immich1", name: "Alice", preview: "preview_alice" },
        cardDav: undefined,
      },
    ]);
    expect(consola.warn).toHaveBeenCalledWith(
      "Cannot find CardDav Contact carddavC to match immich person with id immich1"
    );
  });

  it("should return an empty array if the dictionary is empty", () => {
    const dict = {};

    const result = matchPeopleToContactsByDict(
      mockImmichPeople,
      mockCardDavContacts,
      dict
    );

    expect(result).toEqual([]);
  });
});
