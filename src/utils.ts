import consola from "consola";
import { readFileSync } from "fs";
import path from "path";

/**
 * Folds a long line according to vCard specification (CRLF + space for indentation).
 * This improves the readability of generated vCard data.
 * @param line - The line to be folded.
 * @param length - The maximum length of a line before folding (excluding CRLF + space).
 * @returns The folded line.
 */
export function foldLine(line: string, length: number): string {
  if (line.length <= length) {
    return line;
  }

  let result = "";
  let currentPos = 0;

  result += line.substring(currentPos, Math.min(line.length, length));
  currentPos += length;

  while (currentPos < line.length) {
    result += "\r\n ";
    result += line.substring(
      currentPos,
      Math.min(line.length, currentPos + length - 1)
    );
    currentPos += length - 1;
  }

  return result;
}

/**
 * Reads a file
 * @param filePath - The path to the file.
 * @returns {string} File content as string.
 * @throws {Error} If the file cannot be read, parsed, or is invalid.
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    const resolvedFilePath = path.resolve(filePath);
    const fileContent = readFileSync(resolvedFilePath, "utf8");

    if (!fileContent.trim()) {
      consola.warn(`Configuration file '${filePath}' is empty.`);
      return "";
    }

    return fileContent;
  } catch (error: any) {
    throw error;
  }
}
