// simple_ocr_routes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");

const router = express.Router();

// =======================
// CONFIGURATION
// =======================

const OCR_API_URL = process.env.OCR_API_URL || "http://127.0.0.1:5000";
const EXTRACTOR_API_URL = process.env.EXTRACTOR_API_URL || "http://127.0.0.1:5001";
const UPLOAD_DIR = path.join(__dirname, "../UPLOAD_FOLDER");

// MongoDB Connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cin_database";

// MongoDB Schema
const DocumentSchema = new mongoose.Schema({
    document_type: { type: String, default: 'unknown' },
    extracted_data: mongoose.Schema.Types.Mixed,
    full_text: String,
    text_lines: Array,
    raw_ocr_response: mongoose.Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Use existing model or create new one
const DocumentRecord = mongoose.models.DocumentRecord || mongoose.model('DocumentRecord', DocumentSchema);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|bmp|tiff|webp/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype);
        extOk && mimeOk ? cb(null, true) : cb(new Error("Invalid file type"));
    },
});

// =======================
// MONGODB CONNECTION FUNCTION
// =======================

// Note: MongoDB connection is now handled in server.js

// =======================
// HELPER FUNCTIONS
// =======================

function extractTextFromLines(lines) {
    if (!lines) return [];
    return lines.map(line => {
        if (typeof line === 'string') return line;
        if (line.text) return line.text;
        return String(line);
    });
}

// =======================
// SAVE TO MONGODB WITH RETRY
// =======================

async function saveToMongoDB(documentData, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Check connection
            if (mongoose.connection.readyState !== 1) {
                console.log(`Attempt ${attempt}: Reconnecting to MongoDB...`);
                await connectToMongoDB();
            }
            
            const savedDoc = new DocumentRecord(documentData);
            const result = await savedDoc.save();
            console.log(`✅ Document saved with ID: ${result._id}`);
            return { success: true, id: result._id, data: result };
            
        } catch (error) {
            console.error(`❌ Save attempt ${attempt} failed:`, error.message);
            
            if (attempt === retries) {
                return { 
                    success: false, 
                    error: error.message,
                    details: "Failed to save to database after multiple attempts"
                };
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    
    return { success: false, error: "Max retries reached" };
}

// =======================
// MAIN OCR ENDPOINT
// =======================

router.post("/upload", upload.single("file"), async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        filePath = req.file.path;
        console.log(`📄 Processing: ${req.file.originalname}`);

        // Step 1: Call OCR service
        const form = new FormData();
        const fileBuffer = fs.readFileSync(filePath);
        form.append("file", fileBuffer, { filename: req.file.originalname });

        console.log("📤 Calling OCR service...");
        const ocrResponse = await axios.post(`${OCR_API_URL}/ocr`, form, {
            headers: form.getHeaders(),
            timeout: 60000,
        });

        // Clean up temp file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        const ocrResult = ocrResponse.data;

        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: ocrResult.error || "OCR processing failed"
            });
        }

        console.log("✅ OCR completed");

        // Step 2: Call entity extractor
        console.log("📤 Calling entity extractor...");
        const extractorResponse = await axios.post(`${EXTRACTOR_API_URL}/extract`, {
            text_lines: ocrResult.text_lines,
            document_type: req.body.document_type || 'auto'
        }, {
            timeout: 30000,
        });

        const extractorResult = extractorResponse.data;

        if (!extractorResult.success) {
            return res.status(500).json({
                success: false,
                error: extractorResult.error || "Entity extraction failed"
            });
        }

        console.log("✅ Entity extraction completed");

        // Step 3: Prepare data for database
        const documentData = {
            document_type: extractorResult.document_type,
            extracted_data: extractorResult.entities,
            full_text: ocrResult.text,
            text_lines: ocrResult.text_lines,
            raw_ocr_response: {
                text: ocrResult.text,
                total_lines: ocrResult.total_lines,
                total_blocks: ocrResult.total_blocks
            }
        };

        // Step 4: Save to MongoDB (with retry)
        console.log("💾 Saving to MongoDB...");
        const dbResult = await saveToMongoDB(documentData);

        if (!dbResult.success) {
            // Still return OCR results even if DB fails
            return res.json({
                success: true,
                warning: "OCR and extraction successful but database save failed",
                db_error: dbResult.error,
                document: {
                    type: extractorResult.document_type,
                    extracted_data: extractorResult.entities,
                    text: ocrResult.text,
                    text_lines: ocrResult.text_lines,
                    total_lines: ocrResult.total_lines
                }
            });
        }

        // Return success with database info
        return res.json({
            success: true,
            document: {
                id: dbResult.id,
                type: extractorResult.document_type,
                extracted_data: extractorResult.entities,
                text: ocrResult.text,
                text_lines: ocrResult.text_lines,
                total_lines: ocrResult.total_lines
            },
            saved_to_db: true
        });

    } catch (err) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("❌ Error:", err.message);
        
        // Check if it's a timeout error
        if (err.message.includes('timeout') || err.message.includes('buffering timed out')) {
            return res.status(503).json({
                success: false,
                error: "Database timeout. Please check if MongoDB is running.",
                solution: "Make sure MongoDB is installed and running: mongod",
                mongo_status: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
            });
        }
        
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// =======================
// DATABASE QUERY ENDPOINTS
// =======================

router.get("/documents", async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: "MongoDB not connected",
                status: "disconnected"
            });
        }
        
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;
        const docType = req.query.type;

        let query = {};
        if (docType) query.document_type = docType;

        const documents = await DocumentRecord.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();

        const total = await DocumentRecord.countDocuments(query);

        res.json({
            success: true,
            total: total,
            documents: documents.map(doc => ({
                ...doc,
                id: doc._id
            }))
        });
    } catch (error) {
        console.error("❌ List error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get("/documents/:id", async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: "MongoDB not connected"
            });
        }
        
        const document = await DocumentRecord.findById(req.params.id).lean().exec();
        if (!document) {
            return res.status(404).json({ success: false, error: "Document not found" });
        }
        res.json({ success: true, document: { ...document, id: document._id } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete("/documents/:id", async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: "MongoDB not connected"
            });
        }
        
        const result = await DocumentRecord.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, error: "Document not found" });
        }
        res.json({ success: true, message: "Document deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =======================
// HEALTH CHECK
// =======================

router.get("/health", async (req, res) => {
    let ocrConnected = false;
    let extractorConnected = false;
    let mongoConnected = false;
    let mongoStatus = "disconnected";

    // Check OCR
    try {
        const ocrHealth = await axios.get(`${OCR_API_URL}/health`, { timeout: 3000 });
        ocrConnected = ocrHealth.status === 200;
    } catch { ocrConnected = false; }

    // Check Entity Extractor
    try {
        const extractorHealth = await axios.get(`${EXTRACTOR_API_URL}/health`, { timeout: 3000 });
        extractorConnected = extractorHealth.status === 200;
    } catch { extractorConnected = false; }

    // Check MongoDB
    try {
        mongoConnected = mongoose.connection.readyState === 1;
        mongoStatus = mongoConnected ? "connected" : "disconnected";
        
        if (mongoConnected) {
            // Test query
            await mongoose.connection.db.admin().ping();
        }
    } catch { mongoConnected = false; }

    res.json({
        service: "OCR System",
        status: "running",
        ocr_service: ocrConnected ? "connected" : "disconnected",
        entity_extractor: extractorConnected ? "connected" : "disconnected",
        mongodb: mongoStatus,
        mongodb_ready_state: mongoose.connection.readyState,
        endpoints: {
            upload: "POST /upload - Upload and process document",
            documents: "GET /documents - List all documents",
            "documents/:id": "GET /documents/:id - Get document by ID"
        }
    });
});

module.exports = router;