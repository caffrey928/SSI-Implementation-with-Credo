// Simple CORS proxy for cheqd API calls
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3030;

// Enable CORS for all origins
app.use(cors());

// Serve static files
app.use(express.static(__dirname));

// Proxy for cheqd RPC (port 26657)
app.use('/rpc', createProxyMiddleware({
    target: 'http://localhost:26657',
    changeOrigin: true,
    pathRewrite: {
        '^/rpc': '', // remove /rpc prefix
    },
}));

// Proxy for cheqd REST API (port 1317)
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:1317',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // remove /api prefix
    },
}));

// Serve the dashboard at root
app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, 'ssi-explorer.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 CORS Proxy Server 啟動成功!`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 RPC Proxy: http://localhost:${PORT}/rpc/*`);
    console.log(`🔌 REST Proxy: http://localhost:${PORT}/api/*`);
    console.log('');
    console.log('現在可以在瀏覽器中訪問 http://localhost:3030 查看數據！');
});