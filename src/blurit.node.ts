import { Blurit as BluritCommon, type AnonymizationOptions } from "./blurit.common";
import { createWriteStream } from "fs";
import { readFile } from "fs/promises";

export * from "./blurit.common";

export class Blurit extends BluritCommon {
  async createJobFromPath(filePath: string, options?: AnonymizationOptions) {
    const fileBuffer = await readFile(filePath);
    const name = filePath.split("/").pop()!;
    return this.createJobFromBuffer(fileBuffer, name, options);
  }

  async saveResultFile(filename: string, outputFilename: string) {
    const responseData = await this.getResultFile(filename, "stream");
    responseData.pipe(createWriteStream(outputFilename));
  }
}
