// simple_ocr_routes_fixed.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const User = require('../models/User');


const router = express.Router();

// =======================
// CONFIGURATION
// =======================

const OCR_API_URL = process.env.OCR_API_URL || "http://127.0.0.1:5003";
const AUTH_API_URL = process.env.AUTH_API_URL || "http://127.0.0.1:5007"
const UPLOAD_DIR = './uploads';

// MongoDB Schema - ديناميكي (يمكنه تخزين أي حقل)
const CINSchema = new mongoose.Schema({
    cin_number: { type: String, sparse: true },
    full_text: String,
    method: String,
    all_extracted_data: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const CINRecord = mongoose.model('CINRecord', CINSchema);

// Ensure upload directory exists
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

// =======================
// دالة لعرض جميع البيانات بشكل منظم
// =======================

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

// =======================
// دالة للتحقق من صحة رقم CIN
// =======================

function isValidCIN(cinNumber) {
    if (!cinNumber) return false;
    const cinStr = String(cinNumber);
    // التحقق من أن الرقم مكون من 8 أرقام
    return /^\d{8}$/.test(cinStr);
}

// =======================
// دالة لتوليد كلمة مرور تلقائية
// =======================

function generateAutoPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// =======================
// دالة لاستخراج رقم CIN من البيانات
// =======================

function extractCINNumber(extractedData) {
    // محاولة استخراج رقم CIN من عدة مصادر
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
    
    // البحث عن أي رقم مكون من 8 أرقام في النص الكامل
    if (extractedData.full_text) {
        const match = extractedData.full_text.match(/\b\d{8}\b/);
        if (match) return match[0];
    }
    
    return null;
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

        // Clean up temp file
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

        // استخراج جميع البيانات
        const extractedData = pythonResult.extracted_data || {};
        const method = pythonResult.method || "Unknown";

        // =======================
        // استخراج رقم CIN والتحقق منه
        // =======================
        const cinNumber = extractCINNumber(extractedData);
        // التحقق من صحة رقم CIN
        const isValid = isValidCIN(cinNumber);
        // عرض جميع البيانات المستخرجة في الكونسول
        console.log("\n" + "=".repeat(70));
        console.log("📊 ALL EXTRACTED DATA:");
        console.log("=".repeat(70));
        console.log(`🛠️ Extraction Method: ${method}`);
        console.log("-".repeat(70));
        displayAllData(extractedData);
        console.log("-".repeat(70));
        console.log(`🔢 CIN Number Found: ${cinNumber || 'NOT FOUND'}`);
        console.log(`✅ Is Valid CIN (8 digits): ${isValid ? 'YES' : 'NO'}`);
        console.log("=".repeat(70));
        console.log(`✅ Total fields extracted: ${Object.keys(extractedData).filter(k => !k.startsWith('_')).length}`);
        console.log("=".repeat(70));
        // =======================
        // إرجاع جميع البيانات مع معلومات عن صحة CIN
        // =======================
        
        const extractedFirstName =
            extractedData.first_name || extractedData.firstname || extractedData.given_name || extractedData.firstName || null;
        const extractedLastName =
            extractedData.last_name || extractedData.lastname || extractedData.family_name || extractedData.lastName || null;
        const extractedFullName =
            extractedData.full_name || extractedData.fullName || extractedData.name || `${extractedFirstName || ''} ${extractedLastName || ''}`.trim() || null;
        existingUser = await User.findOne({ cin_number: cinNumber });
        const isNewUser = !!cinNumber && !existingUser;
        return res.json({
            success: true,
            extracted_data: extractedData,
            cin_number: cinNumber || null,
            first_name: extractedFirstName,
            last_name: extractedLastName,
            full_name: extractedFullName,
            user_exists: !!existingUser,
            user_verified: existingUser?.is_verified || false,
            email: existingUser?.email || null,
            is_new_user: isNewUser,
            message: !isValid
                ? "No valid CIN number found (must be 8 digits)"
                : (isNewUser ? "new user" : (existingUser?.is_verified ? "existing verified user" : "existing unverified user")),
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

// =======================
// GET ALL RECORDS - فقط السجلات التي تحتوي على CIN صالح
// =======================

router.get("/records", async (req, res) => {
    try {
        const records = await CINRecord.find({ 
            cin_number: { $exists: true, $ne: null }
        }).sort({ created_at: -1 }).limit(50);
        
        res.json({
            success: true,
            count: records.length,
            records: records.map(r => ({
                id: r._id,
                cin_number: r.cin_number,
                method: r.method,
                extracted_data_summary: {
                    fields: Object.keys(r.all_extracted_data || {}).filter(k => !k.startsWith('_')).length,
                    has_full_text: !!r.full_text
                },
                created_at: r.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =======================
// GET SINGLE RECORD BY ID
// =======================

router.get("/record/:id", async (req, res) => {
    try {
        const record = await CINRecord.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: "Record not found" });
        }
        
        // التحقق من صحة رقم CIN في السجل
        const isValid = isValidCIN(record.cin_number);
        
        res.json({
            success: true,
            record: {
                id: record._id,
                cin_number: record.cin_number,
                is_valid_cin: isValid,
                method: record.method,
                extracted_data: record.all_extracted_data,
                full_text: record.full_text,
                created_at: record.created_at,
                updated_at: record.updated_at
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =======================
// CHECK CIN VALIDITY - التحقق من صحة رقم CIN
// =======================

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
        const exists = await CINRecord.findOne({ cin_number: cin_number });
        
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

// =======================
// HEALTH CHECK
// =======================

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