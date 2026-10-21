export interface BaseOptions {
  immichUrl: string;
  immichKey: string;
  carddavUrl: string;
  carddavPathTemplate: string;
  carddavUsername: string;
  carddavPassword: string;
  carddavAddressbooks: string[];
  matchingContactsFile?: string;
  /** Opt-in reconciliation; defaults to off for existing installations. */
  birthdaySync?: "off" | "bidirectional" | "carddav-to-immich";
  birthdayStateFile?: string;
  skipPhotos?: boolean;
}

export interface ImmichPerson {
  id: string;
  name: string;
  preview: string;
  birthDate?: string | null;
}

export interface CardDavContact {
  uid: string;
  url: string;
  etag?: string;
  data: string;
  name: string;
}

export interface MatchedContact {
  immich: ImmichPerson;
  cardDav: CardDavContact;
}
