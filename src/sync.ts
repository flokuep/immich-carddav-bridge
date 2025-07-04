import getImmichPeople from "./immich";

export default async function sync() {
  try {
    await getImmichPeople("", "");
  } catch (error) {
    console.log(error);
  }
}
