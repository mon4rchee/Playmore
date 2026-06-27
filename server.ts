import express from "express";
import path from "path";
import app from "./app.js";

const PORT = 3000;



async function startServer() {
  if (process.env.VERCEL === "1" || process.env.NOW_BUILDER) {
    // Vercel handles serving static files and routing. Do not boot Vite or serve files here.
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== "1" && !process.env.NOW_BUILDER) {
  startServer();
}

export default app;
