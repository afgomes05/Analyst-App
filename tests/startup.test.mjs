import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test(
  "localhost health is reachable over both IPv4 and IPv6",
  { timeout: 10000 },
  async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "linha-dual-stack-"));
    const child = spawn(process.execPath, ["server/index.mjs"], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "0",
        MATCH_DATA_DIR: dataDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      const port = await new Promise((resolve, reject) => {
        let output = "";
        child.on("error", reject);
        child.once("exit", (code) =>
          reject(new Error(`Server exited before readiness: ${code}`)),
        );
        child.stdout.on("data", (data) => {
          output += data;
          const match = output.match(/listening on port (\d+)/);
          if (match) resolve(Number(match[1]));
        });
      });
      for (const host of ["127.0.0.1", "[::1]"]) {
        const response = await fetch(`http://${host}:${port}/api/health`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { status: "ok" });
      }
    } finally {
      if (child.exitCode === null) {
        const stopped = new Promise((resolve) => child.once("close", resolve));
        child.kill("SIGTERM");
        await stopped;
      }
      await rm(dataDir, { recursive: true, force: true });
    }
  },
);

test(
  "an occupied port fails startup instead of reporting a running server",
  { timeout: 10000 },
  async () => {
    const occupied = createServer();
    await new Promise((resolve) => occupied.listen(0, "0.0.0.0", resolve));
    const dataDir = await mkdtemp(join(tmpdir(), "linha-startup-"));
    let child;
    try {
      child = spawn(process.execPath, ["server/index.mjs"], {
        cwd: fileURLToPath(new URL("../", import.meta.url)),
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(occupied.address().port),
          MATCH_DATA_DIR: dataDir,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "",
        stderr = "";
      child.stdout.on("data", (data) => {
        stdout += data;
      });
      child.stderr.on("data", (data) => {
        stderr += data;
      });
      const exitCode = await new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("close", resolve);
      });
      assert.equal(exitCode, 1);
      assert.match(stderr, /EADDRINUSE/);
      assert.doesNotMatch(stdout, /listening on port/);
    } finally {
      if (child && child.exitCode === null) child.kill("SIGTERM");
      await new Promise((resolve) => occupied.close(resolve));
      await rm(dataDir, { recursive: true, force: true });
    }
  },
);
