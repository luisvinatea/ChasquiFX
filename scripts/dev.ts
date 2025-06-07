// @ts-nocheck - Suppressing TypeScript errors due to package installation issues
import { createServer } from "vite";
import { spawn, ChildProcess } from "child_process";
import type { ViteDevServer } from "vite";

let viteServer: ViteDevServer | undefined;
let nextServer: ChildProcess | undefined;

async function startDev() {
  console.log("Starting development environment...");

  // Start Next.js API server in the background for API routes
  console.log("Starting Next.js API server...");
  nextServer = spawn("npx", ["next", "dev", "--port", "3001"], {
    stdio: "pipe",
    shell: true,
  });

  nextServer.stdout?.on("data", (data) => {
    const output = data.toString();
    if (output.includes("Ready")) {
      console.log("✓ Next.js API server ready on port 3001");
    }
  });

  nextServer.stderr?.on("data", (data) => {
    console.error("Next.js API server error:", data.toString());
  });

  // Wait a moment for Next.js to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Start Vite dev server for the frontend
  console.log("Starting Vite dev server...");
  viteServer = await createServer({
    configFile: "./vite.config.js",
  });

  await viteServer.listen();
  console.log(
    `✓ Vite dev server running on port ${viteServer.config.server.port}`
  );
  console.log("\n🚀 Development environment ready!");
  console.log(`Frontend: http://localhost:${viteServer.config.server.port}`);
  console.log("API: http://localhost:3001/api");
}

// Handle process cleanup
process.on("SIGINT", async () => {
  console.log("\nShutting down development environment...");

  if (viteServer) {
    await viteServer.close();
    console.log("✓ Vite server closed");
  }

  if (nextServer) {
    nextServer.kill();
    console.log("✓ Next.js server closed");
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (viteServer) await viteServer.close();
  if (nextServer) nextServer.kill();
  process.exit(0);
});

startDev().catch(console.error);
