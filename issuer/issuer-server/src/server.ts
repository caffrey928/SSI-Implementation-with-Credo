import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { IssuerAgent } from './agent/agent';
import { StudentCredential } from './types/types';
import { UrlShortener } from './utils/urlShortener';

const app = express();
const PORT = 4001;

// CORS setup
app.use(cors());
app.use(express.json());

// Create IssuerAgent and UrlShortener instances
const issuerAgent = new IssuerAgent();
const urlShortener = new UrlShortener();

// API Routes
// Short URL redirect endpoint
app.get('/invite/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    const originalUrl = urlShortener.getOriginalUrl(shortId);
    
    if (!originalUrl) {
      return res.status(404).json({
        error: 'Short URL not found or expired',
        message: 'This invitation link is no longer valid'
      });
    }
    
    // Redirect to the original invitation URL
    res.redirect(originalUrl);
  } catch (error) {
    console.error('Error redirecting short URL:', error);
    res.status(500).json({
      error: 'Failed to redirect',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Status check endpoint
app.get('/status', async (req, res) => {
  try {
    const status = issuerAgent.getAgentStatus();
    res.json({
      agent: status
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Issue credential endpoint
app.post('/credentials/issue', async (req, res) => {
  try {
    const studentData: StudentCredential = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'studentId', 'university', 'isStudent', 'birthDate'];
    const missingFields = requiredFields.filter(field => !(field in studentData));
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Call IssuerAgent to create credential offer
    const credentialOffer = await issuerAgent.createCredentialOffer(studentData);
    
    // Create a short URL for the invitation
    const baseUrl = `http://localhost:${PORT}`;
    const shortUrl = urlShortener.shortenUrl(credentialOffer.invitationUrl, baseUrl, 1); // 1 minute expiry
    
    // Update the pending credential with the short URL
    issuerAgent.updatePendingCredentialUrl(credentialOffer.recordId, shortUrl);
    
    // Return the credential offer with short URL
    res.json({
      ...credentialOffer,
      invitationUrl: shortUrl // Replace with short URL
    });
  } catch (error) {
    console.error('Error issuing credential:', error);
    res.status(500).json({
      error: 'Failed to issue credential',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get issued credentials endpoint
app.get('/credentials/issued', async (_, res) => {
  try {
    const issuedCredentials = await issuerAgent.getIssuedCredentials();
    res.json(issuedCredentials);
  } catch (error) {
    console.error('Error fetching issued credentials:', error);
    res.status(500).json({
      error: 'Failed to fetch issued credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get pending credentials endpoint
app.get('/credentials/pending', async (_, res) => {
  try {
    const pendingCredentials = await issuerAgent.getPendingCredentials();
    res.json(pendingCredentials);
  } catch (error) {
    console.error('Error fetching pending credentials:', error);
    res.status(500).json({
      error: 'Failed to fetch pending credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy middleware - forward all other requests to Agent (port 3001)
// This should be placed last to catch all non-API requests
const proxyOptions = createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  ws: true // Support WebSocket
});

// Proxy all routes except API routes to the agent
app.use((req, res, next) => {
  if (req.path.startsWith('/status') || req.path.startsWith('/credentials') || req.path.startsWith('/invite')) {
    return next();
  }
  proxyOptions(req, res, next);
});

async function startServer() {
  try {
    // Start IssuerAgent first
    console.log('🚀 Starting Issuer Agent...');
    await issuerAgent.start();
    
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
    await issuerAgent.stop();
    urlShortener.stop();
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

export { app, issuerAgent };