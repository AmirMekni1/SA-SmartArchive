const mongoose = require('mongoose');

const DocumentRecordSchema = new mongoose.Schema(
  {
    filename: { type: String, default: '' },
    original_filename: { type: String, default: '' },
    stored_filename: { type: String, default: '' },
    type: { type: String, default: 'unknown' },
    status: { type: String, default: 'processed' },
    verification_status: { type: String, default: 'pending_review' },
    username: { type: String, default: '' },
    user_id: { type: String, default: '' },
    cin_number: { type: String, default: '' },
    file_size: { type: Number, default: 0 },
    mime_type: { type: String, default: '' },
    file_url: { type: String, default: '' },
    document_type: { type: String, default: 'unknown' },
    detected_language: { type: String, default: 'unknown' },
    classification_source: { type: String, default: 'rule-based' },
    quality_score: { type: Number, default: 0 },
    requires_admin_review: { type: Boolean, default: true },
    reviewed_by: { type: String, default: '' },
    review_note: { type: String, default: '' },
    reviewed_at: { type: Date, default: null },
    edited_by_user: { type: Boolean, default: false },
    edited_at: { type: Date, default: null },
    extracted_data: mongoose.Schema.Types.Mixed,
    full_text: String,
    text_lines: Array,
    raw_ocr_response: mongoose.Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

module.exports =
  mongoose.models.DocumentRecord ||
  mongoose.model('DocumentRecord', DocumentRecordSchema, 'documentrecords');
