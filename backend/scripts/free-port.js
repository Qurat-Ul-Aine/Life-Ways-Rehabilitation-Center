"use strict";

const { execSync } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const port = Number(process.env.PORT || 5001);

function freePortOnWindows(targetPort) {
  try {
    const output = execSync("netstat -ano", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const pids = new Set();

    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes("LISTENING")) continue;

      const parts = trimmed.split(/\s+/);
      const localAddress = parts[1] ?? "";
      const pid = parts[parts.length - 1];

      if (!localAddress.endsWith(`:${targetPort}`)) continue;
      if (!/^\d+$/.test(pid) || Number(pid) <= 0) continue;

      pids.add(pid);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`[dev] Freed port ${targetPort} (stopped PID ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // No listeners on this port.
  }
}

function freePortOnUnix(targetPort) {
  try {
    execSync(`lsof -ti tcp:${targetPort} | xargs -r kill -9`, {
      stdio: "ignore",
      shell: true,
    });
    console.log(`[dev] Freed port ${targetPort}`);
  } catch {
    // No listeners on this port.
  }
}

if (process.platform === "win32") {
  freePortOnWindows(port);
} else {
  freePortOnUnix(port);
}
