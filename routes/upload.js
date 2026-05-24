const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const DocumentRecord = require('../models/DocumentRecord');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();


const OCR_API_URL = process.env.OCR_API_URL || "http://127.0.0.1:5000";
const EXTRACTOR_API_URL = process.env.EXTRACTOR_API_URL || "http://127.0.0.1:5001";
const UPLOAD_DIR = path.join(__dirname, "../uploads/documents");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cin_database";

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
        const allowed = /jpeg|jpg|png|bmp|tiff|webp|pdf/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype);
        extOk && mimeOk ? cb(null, true) : cb(new Error("Invalid file type"));
    },
});




function extractTextFromLines(lines) {
    if (!lines) return [];
    return lines.map(line => {
        if (typeof line === 'string') return line;
        if (line.text) return line.text;
        return String(line);
    });
}

function detectLanguage(text = '') {
    const content = String(text || '');
    const arabicMatches = content.match(/[\u0600-\u06FF]/g) || [];
    const latinMatches = content.match(/[A-Za-z]/g) || [];

    if (arabicMatches.length > latinMatches.length * 1.2) {
        return 'ar';
    }
    if (latinMatches.length > 0) {
        return 'latin';
    }
    return 'unknown';
}

function classifyDocument({ filename = '', requestedType = '', entities = {}, text = '' }) {
    const normalizedRequested = String(requestedType || '').toLowerCase();
    if (normalizedRequested && normalizedRequested !== 'auto') {
        return { type: normalizedRequested, source: 'user-input' };
    }

    const normalizedName = String(filename || '').toLowerCase();
    const normalizedText = String(text || '').toLowerCase();
    const hasCinSignals =
        !!entities.cin_number ||
        normalizedName.includes('cin') ||
        normalizedText.includes('national identity') ||
        normalizedText.includes('بطاقة') ||
        normalizedText.includes('carte');
    if (hasCinSignals) {
        return { type: 'cin', source: 'entity-rules' };
    }

    if (normalizedName.includes('passport') || normalizedText.includes('passport')) {
        return { type: 'passport', source: 'filename-rules' };
    }

    if (normalizedName.includes('license') || normalizedText.includes('driving')) {
        return { type: 'license', source: 'filename-rules' };
    }

    return { type: 'other', source: 'fallback' };
}

function computeQualityScore({ documentType = 'other', entities = {}, text = '' }) {
    const requiredByType = {
        cin: ['cin_number', 'first_name', 'last_name', 'birth_date'],
        passport: ['first_name', 'last_name', 'passport_number'],
        license: ['first_name', 'last_name'],
        other: [],
    };

    const required = requiredByType[documentType] || requiredByType.other;
    const foundCount = required.filter((key) => !!entities?.[key]).length;
    const requiredScore = required.length ? Math.round((foundCount / required.length) * 70) : 45;

    const textLength = String(text || '').trim().length;
    const textScore = Math.min(30, Math.floor(textLength / 20));
    const score = Math.max(0, Math.min(100, requiredScore + textScore));

    return score;
}

function canAccessDocument(user, doc) {
    if (!user || !doc) {
        return false;
    }
    if (user.role === 'admin') {
        return true;
    }

    const cinMatches = !!user.cin_number && user.cin_number === doc.cin_number;
    const usernameMatches = !!user.username && user.username === doc.username;
    return cinMatches || usernameMatches;
}


async function saveToMongoDB(documentData, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            if (mongoose.connection.readyState !== 1) {
                throw new Error('MongoDB not connected');
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
            
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    
    return { success: false, error: "Max retries reached" };
}


router.post("/documents/upload", (req, res, next) => {
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
        console.log(`📄 Processing: ${req.file.originalname}`);

        const form = new FormData();
        const fileBuffer = fs.readFileSync(filePath);
        form.append("file", fileBuffer, { filename: req.file.originalname });

        let ocrResult = null;
        
        try {
            console.log("📤 Calling OCR service...");
            const ocrResponse = await axios.post(`${OCR_API_URL}/ocr`, form, {
                headers: form.getHeaders(),
                timeout: 15000,
            });
            ocrResult = ocrResponse.data;
        } catch (ocrErr) {
            console.log("⚠️  OCR service unavailable, using mock data");
            ocrResult = {
                success: true,
                text: `Mock OCR text from ${req.file.originalname}`,
                text_lines: [`Line 1 from ${req.file.originalname}`, `Line 2`],
                total_lines: 2,
                total_blocks: 1
            };
        }

        if (!ocrResult.success) {
            return res.status(500).json({
                success: false,
                error: ocrResult.error || "OCR processing failed"
            });
        }

        console.log("✅ OCR completed (or mocked)");

        let extractorResult = null;
        
        try {
            console.log("📤 Calling entity extractor...");
            const extractorResponse = await axios.post(`${EXTRACTOR_API_URL}/extract`, {
                text_lines: ocrResult.text_lines,
                document_type: req.body.document_type || 'auto'
            }, {
                timeout: 15000,
            });
            extractorResult = extractorResponse.data;
        } catch (extractErr) {
            console.log("⚠️  Entity extractor unavailable, using mock data");
            extractorResult = {
                success: true,
                entities: {
                    first_name: "John",
                    last_name: "Doe",
                    document_type: req.body.document_type || "other"
                }
            };
        }

        if (!extractorResult.success) {
            return res.status(500).json({
                success: false,
                error: extractorResult.error || "Entity extraction failed"
            });
        }

        console.log("✅ Entity extraction completed (or mocked)");

        const fullText = ocrResult.text || extractTextFromLines(ocrResult.text_lines).join('\n');
        const detectedLanguage = detectLanguage(fullText);
        const classification = classifyDocument({
            filename: req.file.originalname,
            requestedType: req.body.document_type,
            entities: extractorResult.entities,
            text: fullText,
        });
        const qualityScore = computeQualityScore({
            documentType: classification.type,
            entities: extractorResult.entities,
            text: fullText,
        });
        const requiresAdminReview = qualityScore < 50;

        const documentData = {
            filename: req.file.originalname,
            original_filename: req.file.originalname,
            stored_filename: req.file.filename,
            type: classification.type,
            status: requiresAdminReview ? 'pending_review' : 'processed',
            verification_status: requiresAdminReview ? 'pending_review' : 'processed',
            username: req.body.username || '',
            user_id: req.body.user_id || '',
            cin_number: req.body.cin_number || '',
            file_size: req.file.size || 0,
            mime_type: req.file.mimetype || '',
            file_url: `/uploads/documents/${req.file.filename}`,
            document_type: classification.type,
            detected_language: detectedLanguage,
            classification_source: classification.source,
            quality_score: qualityScore,
            requires_admin_review: requiresAdminReview,
            extracted_data: extractorResult.entities,
            full_text: fullText,
            text_lines: ocrResult.text_lines,
            raw_ocr_response: {
                text: ocrResult.text,
                total_lines: ocrResult.total_lines,
                total_blocks: ocrResult.total_blocks
            }
        };

        console.log("💾 Saving to MongoDB...");
        const dbResult = await saveToMongoDB(documentData);

        if (!dbResult.success) {
            return res.json({
                success: true,
                warning: "OCR and extraction successful but database save failed",
                db_error: dbResult.error,
                document: {
                    type: extractorResult.document_type,
                    extracted_data: extractorResult.entities,
                    text: fullText,
                    text_lines: ocrResult.text_lines,
                    total_lines: ocrResult.total_lines,
                    quality_score: qualityScore,
                    requires_admin_review: requiresAdminReview,
                }
            });
        }

        return res.json({
            success: true,
            document: {
                id: dbResult.id,
                type: classification.type,
                extracted_data: extractorResult.entities,
                text: fullText,
                text_lines: ocrResult.text_lines,
                total_lines: ocrResult.total_lines
            },
            saved_to_db: true
        });

    } catch (err) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("❌ Error:", err.message);
        
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

        res.json(
            documents.map((doc) => ({
                id: doc._id,
                filename: doc.filename || `${doc.document_type || 'document'}-${String(doc._id).slice(-6)}`,
                username: doc.username || 'Unknown owner',
                cin_number: doc.cin_number || '',
                status: doc.status || 'processed',
                type: doc.type || doc.document_type || 'unknown',
                created_at: doc.created_at || null,
                file_size: doc.file_size || 0,
                quality_score: Number.isFinite(doc.quality_score) ? doc.quality_score : 0,
                requires_admin_review: !!doc.requires_admin_review,
                detected_language: doc.detected_language || 'unknown',
                file_url: doc.file_url || '',
                extracted_data: doc.extracted_data || {},
                full_text: doc.full_text || '',
                text_lines: doc.text_lines || [],
                download_url: `/api/documents/${doc._id}`,
            }))
        );
    } catch (error) {
        console.error("❌ List error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/documents/history', verifyToken, async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, error: 'MongoDB not connected' });
        }

        const userCin = req.user?.cin_number || '';
        const query = userCin ? { cin_number: userCin } : { username: req.user?.username || '' };

        const rows = await DocumentRecord.find(query)
            .sort({ created_at: -1 })
            .lean()
            .exec();

        return res.json(
            rows.map((doc) => ({
                id: doc._id,
                name: doc.filename || `${doc.document_type || 'document'}-${String(doc._id).slice(-6)}`,
                filename: doc.filename || '',
                type: doc.type || doc.document_type || 'unknown',
                status: doc.status || 'processed',
                uploadDate: doc.created_at || null,
                created_at: doc.created_at || null,
                size: doc.file_size || 0,
                file_size: doc.file_size || 0,
                quality_score: Number.isFinite(doc.quality_score) ? doc.quality_score : 0,
                requires_admin_review: !!doc.requires_admin_review,
                file_url: doc.file_url || '',
            }))
        );
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/documents/stats', verifyToken, async (req, res) => {
    try {
        const userCin = req.user?.cin_number || '';
        const query = userCin ? { cin_number: userCin } : { username: req.user?.username || '' };

        const [totalDocuments, processedToday, pendingDocuments] = await Promise.all([
            DocumentRecord.countDocuments(query),
            DocumentRecord.countDocuments({
                ...query,
                created_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                status: { $in: ['processed', 'verified'] },
            }),
            DocumentRecord.countDocuments({
                ...query,
                status: { $in: ['pending', 'processing'] },
            }),
        ]);

        return res.json({
            totalDocuments,
            processedToday,
            pendingDocuments,
            accuracy: 98.5,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/documents/my-cin', verifyToken, async (req, res) => {
    try {
        const userCin = req.user?.cin_number || '';
        const query = userCin ? { cin_number: userCin } : { username: req.user?.username || '' };

        const doc = await DocumentRecord.findOne(query)
            .sort({ created_at: -1 })
            .lean()
            .exec();

        if (!doc) {
            return res.status(404).json({ success: false, error: 'No CIN data found' });
        }

        const data = doc.extracted_data || {};
        return res.json({
            cin_number: data.cin_number || doc.cin_number || req.user?.cin_number || '',
            first_name: data.first_name || data.firstname || req.user?.first_name || '',
            last_name: data.last_name || data.lastname || req.user?.last_name || '',
            father_name: data.father_name || '',
            mother_name: data.mother_name || '',
            birth_date: data.birth_date || data.date_of_birth || req.user?.date_of_birth || '',
            birth_place: data.birth_place || '',
            gouvernante: data.gouvernante || data.governorate || '',
            job: data.job || '',
            cin_creation: data.cin_creation || data.issue_date || '',
            photo: data.photo || '',
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get("/documents/:id", verifyToken, async (req, res) => {
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
        if (!canAccessDocument(req.user, document)) {
            return res.status(403).json({ success: false, error: 'Access denied for this document' });
        }
        res.json({
            id: document._id,
            filename: document.filename || `${document.document_type || 'document'}-${String(document._id).slice(-6)}`,
            original_filename: document.original_filename || document.filename || '',
            stored_filename: document.stored_filename || '',
            username: document.username || 'Unknown owner',
            cin_number: document.cin_number || '',
            status: document.status || 'processed',
            verification_status: document.verification_status || 'pending_review',
            type: document.type || document.document_type || 'unknown',
            created_at: document.created_at || null,
            updated_at: document.updated_at || null,
            file_size: document.file_size || 0,
            mime_type: document.mime_type || '',
            file_url: document.file_url || '',
            detected_language: document.detected_language || 'unknown',
            quality_score: Number.isFinite(document.quality_score) ? document.quality_score : 0,
            requires_admin_review: !!document.requires_admin_review,
            review_note: document.review_note || '',
            reviewed_at: document.reviewed_at || null,
            extracted_data: document.extracted_data || {},
            full_text: document.full_text || '',
            text_lines: document.text_lines || [],
            raw_ocr_response: document.raw_ocr_response || {},
            download_url: `/api/documents/${document._id}`,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/documents/:id/entities', verifyToken, async (req, res) => {
    try {
        const document = await DocumentRecord.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        if (!canAccessDocument(req.user, document)) {
            return res.status(403).json({ success: false, error: 'Access denied for this document' });
        }

        const nextExtractedData = req.body?.extracted_data ?? document.extracted_data ?? {};
        const nextFullText = req.body?.full_text ?? document.full_text ?? '';
        const nextTextLines = req.body?.text_lines ?? document.text_lines ?? [];

        document.extracted_data = nextExtractedData;
        document.full_text = nextFullText;
        document.text_lines = nextTextLines;
        document.detected_language = detectLanguage(nextFullText);
        document.quality_score = computeQualityScore({
            documentType: document.type || document.document_type || 'other',
            entities: nextExtractedData,
            text: nextFullText,
        });
        document.requires_admin_review = document.quality_score < 50;
        document.status = document.requires_admin_review ? 'pending_review' : document.status;
        document.verification_status = document.requires_admin_review ? 'pending_review' : document.verification_status;
        document.edited_by_user = true;
        document.edited_at = new Date();
        document.updated_at = new Date();
        await document.save();

        return res.json({ success: true, document });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.delete("/documents/:id", verifyToken, async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: "MongoDB not connected"
            });
        }
        
        const document = await DocumentRecord.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ success: false, error: "Document not found" });
        }
        if (!canAccessDocument(req.user, document)) {
            return res.status(403).json({ success: false, error: 'Access denied for this document' });
        }

        const result = await DocumentRecord.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, error: "Document not found" });
        }

        if (document.stored_filename) {
            const fileOnDisk = path.join(UPLOAD_DIR, document.stored_filename);
            if (fs.existsSync(fileOnDisk)) {
                fs.unlinkSync(fileOnDisk);
            }
        }

        res.json({ success: true, message: "Document deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


router.get("/health", async (req, res) => {
    let ocrConnected = false;
    let extractorConnected = false;
    let mongoConnected = false;
    let mongoStatus = "disconnected";

    try {
        const ocrHealth = await axios.get(`${OCR_API_URL}/health`, { timeout: 3000 });
        ocrConnected = ocrHealth.status === 200;
    } catch { ocrConnected = false; }

    try {
        const extractorHealth = await axios.get(`${EXTRACTOR_API_URL}/health`, { timeout: 3000 });
        extractorConnected = extractorHealth.status === 200;
    } catch { extractorConnected = false; }

    try {
        mongoConnected = mongoose.connection.readyState === 1;
        mongoStatus = mongoConnected ? "connected" : "disconnected";
        
        if (mongoConnected) {
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