import { getPerson, updatePerson } from "@immich/sdk";
import { parseVCards } from "vcard4-ts";
import { BaseOptions, CardDavContact } from "../types";
import { immichRequest } from "../immich/request";
import { writeCardBirthday } from "../carddav/birthday";

function cardRequest(options: BaseOptions, contact: CardDavContact) {
  const url = new URL(contact.url, options.carddavUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.origin !== new URL(options.carddavUrl).origin ||
      url.username || url.password) throw new Error("Refusing CardDAV credentials on a different origin.");
  return {
    url: url.href,
    headers: { Authorization: "Basic " + Buffer.from(options.carddavUsername + ":" + options.carddavPassword).toString("base64") },
  };
}

/** Read the current vCard rather than overwriting a snapshot taken before photo synchronization. */
export async function readBirthdayContact(options: BaseOptions, contact: CardDavContact): Promise<CardDavContact> {
  const request = cardRequest(options, contact);
  const response = await fetch(request.url, { headers: request.headers, redirect: "error", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error("CardDAV read failed: HTTP " + response.status);
  const data = await response.text();
  const cards = parseVCards(data).vCards;
  if (cards?.length !== 1 || !contact.uid || cards[0].UID?.value !== contact.uid) {
    throw new Error("Contact UID changed or is missing; resolve the match before syncing birthdays.");
  }
  return { ...contact, data, etag: response.headers.get("etag") ?? undefined };
}

export async function writeBirthdayContact(options: BaseOptions, contact: CardDavContact, value: string): Promise<void> {
  if (!contact.etag || /^W\//i.test(contact.etag)) throw new Error("A strong CardDAV ETag is required for birthday updates.");
  const request = cardRequest(options, contact);
  const response = await fetch(request.url, {
    method: "PUT", headers: { ...request.headers, "Content-Type": "text/vcard; charset=utf-8", "If-Match": contact.etag },
    body: writeCardBirthday(contact.data, value), redirect: "error", signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error("CardDAV birthday write failed: HTTP " + response.status + " (no unconditional retry).");
}

export async function readImmichBirthday(options: BaseOptions, id: string): Promise<unknown> {
  return (await getPerson({ id }, immichRequest(options.immichUrl, options.immichKey))).birthDate;
}

export async function writeImmichBirthday(options: BaseOptions, id: string, value: string): Promise<void> {
  await updatePerson({ id, personUpdateDto: { birthDate: value } }, immichRequest(options.immichUrl, options.immichKey));
}
