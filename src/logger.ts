import { Print } from "@docgeni/toolkit";

export class Logger extends Print {
  success(message: string) {
    this.succuss(message);
  }
}

export const logger = new Logger({
  prefix: "RELEASE",
});
