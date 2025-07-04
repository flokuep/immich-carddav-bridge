export interface BaseOptions {
  immichUrl: string;
  immichKey: string;
  carddav?: {
    url?: string;
    username?: string;
    token?: string;
  };
}

export interface ImmichPerson {
  id: string;
  name: string;
  preview: string;
}
