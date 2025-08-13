import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { VerifierAgent } from "./agent/agent";
import { UrlShortener } from "./utils/urlShortener";
import { VerificationRequestType } from "./types/types";

const app = express();
const PORT = 4003;

// CORS setup
app.use(cors());
app.use(express.json());

// Create VerifierAgent and UrlShortener instances
const verifierAgent = new VerifierAgent();
const urlShortener = new UrlShortener();

// Store SSE connections
const sseClients = new Set();

// SSE endpoint for verification results
app.get("/events", (req, res) => {
  // Check if request is from localhost:5003
  const origin = req.get('Origin') || req.get('Referer');
  
  if (!origin || !origin.includes('localhost:5003')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "http://localhost:5003",
    "Access-Control-Allow-Headers": "Cache-Control"
  });

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// Function to broadcast verification results
function broadcastVerificationResult(result: any) {
  const data = `data: ${JSON.stringify(result)}\n\n`;
  sseClients.forEach((client: any) => {
    try {
      client.write(data);
    } catch (error) {
      sseClients.delete(client);
    }
  });
}

// API Routes
// Short URL redirect endpoint
app.get("/verify/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    const originalUrl = urlShortener.getOriginalUrl(shortId);

    if (!originalUrl) {
      return res.status(404).json({
        error: "Short URL not found or expired",
        message: "This verification link is no longer valid",
      });
    }

    // Redirect to the original invitation URL
    res.redirect(originalUrl);
  } catch (error) {
    console.error("Error redirecting short URL:", error);
    res.status(500).json({
      error: "Failed to redirect",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Status check endpoint
app.get("/status", async (_, res) => {
  try {
    const status = verifierAgent.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create age verification request
app.post("/proof-requests/age-verification", async (_, res) => {
  try {

    const result = await verifierAgent.createProofRequest('age' as VerificationRequestType);

    // Create a short URL for the invitation
    const baseUrl = `http://localhost:${PORT}`;
    const shortUrl = urlShortener.shortenUrl(result.invitationUrl, baseUrl, 1); // 1 minute expiry

    res.json({
      invitationUrl: shortUrl, // Replace with short URL
    });
  } catch (error) {
    console.error("Error creating age verification request:", error);
    res.status(500).json({
      error: "Failed to create age verification request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create student verification request
app.post("/proof-requests/student-verification", async (_, res) => {
  try {

    const result = await verifierAgent.createProofRequest('student' as VerificationRequestType);

    // Create a short URL for the invitation
    const baseUrl = `http://localhost:${PORT}`;
    const shortUrl = urlShortener.shortenUrl(result.invitationUrl, baseUrl, 1); // 1 minute expiry

    res.json({
      invitationUrl: shortUrl, // Replace with short URL
    });
  } catch (error) {
    console.error("Error creating student verification request:", error);
    res.status(500).json({
      error: "Failed to create student verification request",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Proxy middleware - forward all other requests to Agent (port 3003)
const proxyOptions = createProxyMiddleware({
  target: "http://localhost:3003",
  changeOrigin: true,
  ws: true, // Support WebSocket
});

// Proxy all routes except API routes to the agent
app.use((req, res, next) => {
  if (
    req.path.startsWith("/status") ||
    req.path.startsWith("/proof-requests") ||
    req.path.startsWith("/verify")
  ) {
    return next();
  }
  proxyOptions(req, res, next);
});

async function startServer() {
  try {
    // Set verification callback
    verifierAgent.setVerificationCallback(broadcastVerificationResult);
    
    // Start VerifierAgent first
    console.log("🚀 Starting Verifier Agent...");
    await verifierAgent.start();

    // Then start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Verifier server started on port ${PORT}`);
      console.log(`📡 Dashboard URL: http://localhost:5003`);
      console.log(`🔗 API available at: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle process exit
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  try {
    await verifierAgent.stop();
    urlShortener.stop();
    console.log("✅ Server shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down server...");
  try {
    await verifierAgent.stop();
    urlShortener.stop();
    console.log("✅ Server shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

// Start service
if (require.main === module) {
  startServer();
}

export { app, verifierAgent };
