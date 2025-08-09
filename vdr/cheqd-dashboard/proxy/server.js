require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

// Configuration from environment variables
const PORT = process.env.PROXY_PORT || 3031;
const CHEQD_RPC_URL = process.env.NEXT_PUBLIC_CHEQD_RPC_URL;
const FRONTEND_URL = `http://localhost:${process.env.PORT}`;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT) || 15000;

// Validate required configuration
if (!CHEQD_RPC_URL) {
  console.error(
    "❌ Error: NEXT_PUBLIC_CHEQD_RPC_URL environment variable is required"
  );
  process.exit(1);
}

// Dynamic CORS configuration
const corsOrigins = [];
if (FRONTEND_URL) corsOrigins.push(FRONTEND_URL);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    config: {
      rpcUrl: CHEQD_RPC_URL,
      restUrl: CHEQD_REST_URL,
      allowedOrigins: corsOrigins.length > 0 ? corsOrigins : ["*"],
      timeout: REQUEST_TIMEOUT,
    },
  });
});

// Enhanced error handling
const handleProxyError = (error, req, res, serviceType) => {
  console.error(`${serviceType} proxy error for ${req.path}:`, {
    message: error.message,
    code: error.code,
    status: error.response?.status,
  });

  const statusCode = error.response?.status || 500;
  const errorMessage =
    error.response?.data?.error ||
    error.message ||
    "Service temporarily unavailable";

  res.status(statusCode).json({
    error: `${serviceType} request failed`,
    details: errorMessage,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
};

// RPC proxy
app.use("/api/rpc", async (req, res) => {
  try {
    const path = req.path.replace("/api/rpc", "");
    const url = `${CHEQD_RPC_URL}${path}`;

    console.log(`[RPC] ${req.method} ${url}`);

    const config = {
      method: req.method.toLowerCase(),
      url: url,
      timeout: REQUEST_TIMEOUT,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET" && req.body) {
      config.data = req.body;
    }

    if (Object.keys(req.query || {}).length > 0) {
      config.params = req.query;
    }

    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    handleProxyError(error, req, res, "RPC");
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    availableRoutes: ["/health", "/api/rpc*"],
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`RPC: /api/rpc* → ${CHEQD_RPC_URL}/*`);
  console.log(
    `CORS origins: ${
      corsOrigins.length > 0 ? corsOrigins.join(", ") : "All origins"
    }`
  );
});

// Graceful shutdown
["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});
