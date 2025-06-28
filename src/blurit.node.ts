import { Blurit as BluritCommon, type AnonymizationOptions } from "./blurit.common";
import { createWriteStream } from "fs";
import { readFile } from "fs/promises";

export * from "./blurit.common";

export class Blurit extends BluritCommon {
  /**
   * Create a new job from a file path.
   * @param filePath - The path of the file.
   * @param options - The anonymization options.
   * @returns The create job response.
   */
  async createJobFromPath(filePath: string, options?: AnonymizationOptions) {
    const fileBuffer = await readFile(filePath);
    const name = filePath.split("/").pop()!;
    return this.createJobFromBuffer(fileBuffer, name, options);
  }

  /**
   * Save the result file to a file.
   * @param filename - The filename of the result file.
   * @param outputFilename - The path of the output file.
   */
  async saveResultFile(filename: string, outputFilename: string) {
    const responseData = await this.getResultFile(filename, "stream");
    responseData.pipe(createWriteStream(outputFilename));
  }
}
