const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3031;

// Enable CORS for React app
app.use(cors({
  origin: 'http://localhost:3030',
  credentials: true
}));

app.use(express.json());

// Proxy RPC requests
app.all('/api/rpc/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/rpc', '');
    const url = `http://localhost:27157${path}`;
    
    console.log(`Proxying RPC: ${req.method} ${url}`);
    
    const response = await axios({
      method: req.method.toLowerCase(),
      url: url,
      data: req.body,
      params: req.query,
      timeout: 10000
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('RPC proxy error:', error.message);
    res.status(500).json({ error: 'RPC request failed', details: error.message });
  }
});

// Proxy REST requests
app.all('/api/rest/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/rest', '');
    const url = `http://localhost:1817${path}`;
    
    console.log(`Proxying REST: ${req.method} ${url}`);
    
    const response = await axios({
      method: req.method.toLowerCase(),
      url: url,
      data: req.body,
      params: req.query,
      timeout: 10000
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('REST proxy error:', error.message);
    res.status(500).json({ error: 'REST request failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('RPC: http://localhost:3031/api/rpc/* -> http://localhost:27157/*');
  console.log('REST: http://localhost:3031/api/rest/* -> http://localhost:1817/*');
});