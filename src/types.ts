export interface BaseOptions {
  immichUrl: string;
  immichKey: string;
  carddavUrl: string;
  carddavPathTemplate: string;
  carddavUsername: string;
  carddavPassword: string;
  carddavAddressbooks: string[];
  matchingContactsFile?: string;
}

export interface ImmichPerson {
  id: string;
  name: string;
  preview: string;
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
