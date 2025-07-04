import getImmichPeople from "../immich";
import { BaseOptions } from "../utils";

export default async function sync(options: BaseOptions) {
  try {
    await getImmichPeople(options.immichUrl, options.immichKey);
  } catch (error) {
    console.log(error);
  }
}
