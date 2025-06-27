import { Blurit as BluritCommon } from "./blurit.common";

export * from "./blurit.common";

export class Blurit extends BluritCommon {
  async createJobFromPath() {
    throw new Error("createJobFromPath is only available in Node.js");
  }
  async saveResultFile() {
    throw new Error("saveResultFile is only available in Node.js");
  }
}
