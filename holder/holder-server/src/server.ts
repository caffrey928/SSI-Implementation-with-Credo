import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { HolderAgent } from './agent/agent';

const app = express();
const PORT = 4002;

// CORS setup
app.use(cors());
app.use(express.json());

// Create HolderAgent instance
const holderAgent = new HolderAgent();

// API Routes

// Status check endpoint
app.get('/status', async (req, res) => {
  try {
    const status = holderAgent.getStatus();
    const storedCredentials = await holderAgent.getStoredCredentials();
    res.json({
      initialized: status.initialized,
      credentials: storedCredentials.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get stored credentials endpoint
app.get('/credentials', async (req, res) => {
  try {
    const storedCredentials = await holderAgent.getStoredCredentials();
    res.json(storedCredentials);
  } catch (error) {
    console.error('Error fetching stored credentials:', error);
    res.status(500).json({
      error: 'Failed to fetch stored credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Receive invitation endpoint
app.post('/receive-invitation', async (req, res) => {
  try {
    const { invitationUrl } = req.body;
    
    if (!invitationUrl) {
      return res.status(400).json({
        error: 'Missing required field: invitationUrl'
      });
    }

    // Call HolderAgent to receive invitation
    await holderAgent.receiveInvitation(invitationUrl);
    
    res.json({
      success: true,
      message: 'Invitation received successfully'
    });
  } catch (error) {
    console.error('Error receiving invitation:', error);
    res.status(500).json({
      error: 'Failed to receive invitation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy middleware - forward all other requests to Agent (port 3002)
// This should be placed last to catch all non-API requests
const proxyOptions = createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  ws: true // Support WebSocket
});

// Proxy all routes except API routes to the agent
app.use((req, res, next) => {
  if (req.path.startsWith('/status') || req.path.startsWith('/credentials') || req.path.startsWith('/receive-invitation')) {
    return next();
  }
  proxyOptions(req, res, next);
});

async function startServer() {
  try {
    // Start HolderAgent first
    console.log('🚀 Starting Holder Agent...');
    await holderAgent.start();
    
    // Then start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Express server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await holderAgent.stop();
    console.log('✅ Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start service
if (require.main === module) {
  startServer();
}

export { app, holderAgent };