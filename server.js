/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

let envFile = path.join(__dirname, ".env");
if (process.env.NODE_ENV === "production") {
  const productionEnvFile = path.join(__dirname, ".env.production");
  envFile = fs.existsSync(productionEnvFile) ? productionEnvFile : envFile;
}

const result = dotenv.config({ path: envFile });
console.log(
  "Loaded env file:",
  envFile,
  "DB=", !!process.env.DATABASE_URL,
  "BETTER_AUTH_URL=", !!process.env.BETTER_AUTH_URL,
  "AUTH_SECRET=", !!process.env.AUTH_SECRET,
  "BETTER_AUTH_SECRET=", !!process.env.BETTER_AUTH_SECRET
);
if (result.error) {
  console.warn("Could not load env file:", envFile, result.error.message);
}

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

try {
  require(standaloneServer);
} catch (error) {
  console.error("Failed to start the Next.js standalone server.");
  console.error(`Expected to find: ${standaloneServer}`);
  console.error(error);
  process.exit(1);
}
