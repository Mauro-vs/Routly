import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import morgan from "morgan";

const isProduction = process.env.NODE_ENV === "production";

const logsDir = fileURLToPath(new URL("../../logs", import.meta.url));
fs.mkdirSync(logsDir, { recursive: true });

const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), { flags: "a" });
const errorLogStream = fs.createWriteStream(path.join(logsDir, "error.log"), { flags: "a" });

// Formato "combined" de Apache + tiempo de respuesta
morgan.format(
  "file",
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'
);

const skipHealth = (req) => isProduction && req.url === "/health";

export const morganMiddleware = [
  morgan(isProduction ? "combined" : "dev", { skip: skipHealth }),
  morgan("file", { stream: accessLogStream, skip: skipHealth }),
  morgan("file", { stream: errorLogStream, skip: (req, res) => res.statusCode < 400 }),
];
