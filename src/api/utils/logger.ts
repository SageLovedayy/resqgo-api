import pino from "pino";

import { LOG_LEVEL, NODE_ENV } from "../../config/keys.js";

export const logger = pino.default({
  level: LOG_LEVEL || (NODE_ENV === "development" ? "debug" : "info"),
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});
