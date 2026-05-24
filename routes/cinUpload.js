const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const User = require('../models/User');
const Admin = require('../models/Admin');
const DocumentRecord = require('../models/DocumentRecord');



const router = express.Router();


const OCR_API_URL = process.env.OCR_API_URL || "http://127.0.0.1:5003";
const AUTH_API_URL = process.env.AUTH_API_URL || "http://127.0.0.1:5007"
const UPLOAD_DIR = './uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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


function displayAllData(data, prefix = "") {
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            console.log(`${prefix}📁 ${key}:`);
            displayAllData(value, prefix + "  ");
        } else if (Array.isArray(value) && value.length > 0) {
            console.log(`${prefix}📋 ${key}: [${value.length} items]`);
            if (value.length <= 5) {
                value.forEach(item => console.log(`${prefix}     - ${item}`));
            } else {
                console.log(`${prefix}     First 5: ${value.slice(0, 5).join(', ')}...`);
            }
        } else if (value) {
            console.log(`${prefix}🔹 ${key}: ${String(value).substring(0, 100)}`);
        }
    }
}


function isValidCIN(cinNumber) {
    if (!cinNumber) return false;
    const cinStr = String(cinNumber);
    return /^\d{8}$/.test(cinStr);
}


function generateAutoPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}


function extractCINNumber(extractedData) {
    if (extractedData.cin_number && isValidCIN(extractedData.cin_number)) {
        return extractedData.cin_number;
    }
    
    if (extractedData.card_number && isValidCIN(extractedData.card_number)) {
        return extractedData.card_number;
    }
    
    if (extractedData.all_numbers && Array.isArray(extractedData.all_numbers)) {
        const eightDigitNumber = extractedData.all_numbers.find(n => isValidCIN(n));
        if (eightDigitNumber) return eightDigitNumber;
    }
    
    if (extractedData.full_text) {
        const match = extractedData.full_text.match(/\b\d{8}\b/);
        if (match) return match[0];
    }
    
    return null;
}


router.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err && err.code === "LIMIT_PART_COUNT") {
      return res.status(400).json({ success: false, error: "Too many form fields" });
    }
    if (err && err.message === "Unexpected field") {
      return res.status(400).json({
        success: false,
        error: "Invalid form field. Expected 'file' field.",
        details: err.message
      });
    }
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}, async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        filePath = req.file.path;
        console.log(`\n📄 Processing: ${req.file.originalname}`);
        console.log("=".repeat(70));

        const form = new FormData();
        const fileBuffer = fs.readFileSync(filePath);
        form.append("file", fileBuffer, { filename: req.file.originalname });

        console.log(`🔄 Calling OCR API at: ${OCR_API_URL}/process`);
        
        const response = await axios.post(`${OCR_API_URL}/process`, form, {
            headers: form.getHeaders(),
            timeout: 120000,
        });

        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch(e) { console.log("Cleanup error:", e.message); }
        }

        const pythonResult = response.data;

        if (!pythonResult.success) {
            return res.status(500).json({
                success: false,
                error: pythonResult.error || "OCR processing failed"
            });
        }

        const extractedData = pythonResult.extracted_data || {};
        const method = pythonResult.method || "Unknown";

        const cinNumber = extractCINNumber(extractedData);
        const isValid = isValidCIN(cinNumber);
        
        const extractedFirstName =
            extractedData.first_name || extractedData.firstname || extractedData.given_name || extractedData.firstName || null;
        const extractedLastName =
            extractedData.last_name || extractedData.lastname || extractedData.family_name || extractedData.lastName || null;
        const extractedFullName =
            extractedData.full_name || extractedData.fullName || extractedData.name || `${extractedFirstName || ''} ${extractedLastName || ''}`.trim() || null;
        const existingUser = await User.findOne({ cin_number: cinNumber });
        const existingAdmin = await Admin.findOne({ cin_number: cinNumber, role: 'admin' });
        const accountExists = !!existingUser || !!existingAdmin;
        const isNewUser = !!cinNumber && !accountExists;
        const storedRecord = isValid
            ? await DocumentRecord.findOneAndUpdate(
                {
                    cin_number: cinNumber,
                    document_type: 'cin'
                },
                {
                    $set: {
                        filename: req.file.originalname || '',
                        original_filename: req.file.originalname || '',
                        stored_filename: req.file.filename || '',
                        type: 'cin',
                        status: 'processed',
                        verification_status: 'pending_review',
                        username: existingUser?.username || existingAdmin?.username || extractedFullName || '',
                        user_id: String(existingUser?._id || existingAdmin?._id || ''),
                        cin_number: cinNumber,
                        file_size: req.file.size || 0,
                        mime_type: req.file.mimetype || '',
                        document_type: 'cin',
                        detected_language: extractedData.detected_language || 'unknown',
                        classification_source: 'cin-upload',
                        quality_score: isValid ? 100 : 0,
                        requires_admin_review: true,
                        extracted_data: extractedData,
                        full_text: extractedData.full_text || '',
                        text_lines: Array.isArray(extractedData.text_lines) ? extractedData.text_lines : [],
                        updated_at: new Date(),
                    },
                    $setOnInsert: {
                        created_at: new Date(),
                    }
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                }
            )
            : null;

        return res.json({
            success: true,
            extracted_data: extractedData,
            cin_number: cinNumber || null,
            first_name: extractedFirstName,
            last_name: extractedLastName,
            full_name: extractedFullName,
            user_exists: !!existingUser,
            admin_exists: !!existingAdmin,
            user_verified: existingUser?.is_verified || false,
            email: existingUser?.email || existingAdmin?.email || null,
            is_new_user: isNewUser,
            message: !isValid
                ? "No valid CIN number found (must be 8 digits)"
                : (existingAdmin
                    ? "existing admin user"
                    : (isNewUser
                        ? "new user"
                        : (existingUser?.is_verified ? "existing verified user" : "existing unverified user"))),
            cin_validation: {
                found: !!cinNumber,
                cin_number: cinNumber || null,
                isValid: isValid,
                message: isValid ? "Valid CIN number" : "No valid CIN number found (must be 8 digits)"
            },
            metadata: {
                total_fields: Object.keys(extractedData).filter(k => !k.startsWith('_')).length,
                has_full_text: !!extractedData.full_text,
                total_lines: extractedData.total_lines || extractedData.text_lines?.length || 0
            },
            saved_record_id: storedRecord?._id || null,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch(e) { console.log("Cleanup error:", e.message); }
        }
        console.error("❌ Error:", err.message);
        if (err.response) {
            console.error("Response data:", err.response.data);
        }
        return res.status(500).json({
            success: false,
            error: err.message,
            details: err.response?.data || null
        });
    }
});


router.get("/records", async (req, res) => {
    try {
        const records = await DocumentRecord.find({ 
            cin_number: { $exists: true, $ne: null, $ne: '' },
            document_type: 'cin'
        }).sort({ created_at: -1 }).limit(50);
        
        res.json({
            success: true,
            count: records.length,
            records: records.map(r => ({
                id: r._id,
                cin_number: r.cin_number,
                method: r.classification_source || 'cin-upload',
                extracted_data_summary: {
                    fields: Object.keys(r.extracted_data || {}).filter(k => !k.startsWith('_')).length,
                    has_full_text: !!r.full_text
                },
                created_at: r.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


router.get("/record/:id", async (req, res) => {
    try {
        const record = await DocumentRecord.findOne({ _id: req.params.id, document_type: 'cin' });
        if (!record) {
            return res.status(404).json({ success: false, error: "Record not found" });
        }
        
        const isValid = isValidCIN(record.cin_number);
        
        res.json({
            success: true,
            record: {
                id: record._id,
                cin_number: record.cin_number,
                is_valid_cin: isValid,
                method: record.classification_source || 'cin-upload',
                extracted_data: record.extracted_data || {},
                full_text: record.full_text,
                created_at: record.created_at,
                updated_at: record.updated_at
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


router.post("/check-cin", async (req, res) => {
    try {
        const { cin_number } = req.body;
        
        if (!cin_number) {
            return res.status(400).json({ 
                success: false, 
                error: "CIN number is required" 
            });
        }
        
        const isValid = isValidCIN(cin_number);
        const exists = await DocumentRecord.findOne({ cin_number: cin_number, document_type: 'cin' });
        
        res.json({
            success: true,
            cin_number: cin_number,
            isValid: isValid,
            exists: !!exists,
            message: isValid ? "Valid CIN number" : "Invalid CIN number (must be 8 digits)"
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


router.get("/health", async (req, res) => {
    let ocrConnected = false;
    let ollamaStatus = false;

    try {
        const health = await axios.get(`${OCR_API_URL}/health`, { timeout: 3000 });
        ocrConnected = health.status === 200;
        ollamaStatus = health.data?.ollama_running || false;
    } catch (err) {
        ocrConnected = false;
    }

    res.json({
        service: "CIN OCR API - Full Information Extraction",
        status: "running",
        ocr_connected: ocrConnected,
        mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        extraction_type: "Returns ALL information found",
        ollama_available: ollamaStatus,
        cin_validation: "Enabled - Only saves records with valid 8-digit CIN",
        endpoints: {
            upload: "POST /upload - Extract all information from CIN card",
            records: "GET /records - Get all records summary (valid CIN only)",
            record: "GET /record/:id - Get full record by ID",
            "check-cin": "POST /check-cin - Check if CIN number is valid",
            health: "GET /health - Health check"
        }
    });
});

module.exports = router;