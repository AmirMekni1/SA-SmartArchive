const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const { ensureStaticAdmin } = require('./services/adminSeed.service');

const cinUploadRoutes = require('./routes/cinUpload');

console.log('Environment variables loaded:');
console.log('EMAIL_ADDRESS:', process.env.EMAIL_ADDRESS ? 'SET' : 'NOT SET');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/SmartArchiveDB";

mongoose.connect(MONGODB_URI)
.then(async () => {
    console.log('✅ MongoDB connected successfully');
    await ensureStaticAdmin();
})
.catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/cin', cinUploadRoutes);

app.use('/api', uploadRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);


app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'CIN Authentication API',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Node.js server running successfully!');
    console.log('='.repeat(60));
    console.log(`📍 Server URL: http://localhost:${PORT}`);
    console.log(`📡 OCR API: http://localhost:5000`);
    console.log(`💾 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/SmartArchiveDB'}`);
    console.log('\n📚 Available endpoints:');
    console.log(`   GET  / - API info`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`   GET  /api/debug/python - Test Python API`);
    console.log(`   POST /api/documents/upload - Upload document`);
    console.log(`   GET  /api/documents - List documents`);
    console.log(`   GET  /api/documents/:id - Get document`);
    console.log(`   GET  /api/documents/search/:query - Search`);
    console.log(`   GET  /api/stats - Statistics`);
    console.log(`   DELETE /api/documents/:id - Delete document`);
    console.log('='.repeat(60));
});