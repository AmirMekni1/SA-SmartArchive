# document_classifier.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =======================
# ARABIC TEXT PROCESSING
# =======================

def fix_arabic_word(word):
    """Reverse individual Arabic word characters"""
    if not word:
        return word
    if any('\u0600' <= c <= '\u06FF' for c in word):
        return word[::-1]
    return word

def fix_arabic_line(line):
    """Fix Arabic line: reverse characters and word order"""
    if not line or not line.strip():
        return line
    
    words = line.split()
    has_arabic = any('\u0600' <= c <= '\u06FF' for w in words for c in w)
    
    if has_arabic:
        fixed_words = [fix_arabic_word(w) for w in words]
        fixed_words = fixed_words[::-1]
        return ' '.join(fixed_words)
    return line

# =======================
# DOCUMENT CLASSIFICATION
# =======================

class DocumentClassifier:
    """Classify document types based on text content"""
    
    # Document type patterns
    PATTERNS = {
        'cin_card': {
            'arabic': [
                'الجمهورية التونسية', 'بطاقة التعريف الوطنية', 'اللقب', 'الاسم', 
                'تاريخ الميلاد', 'مكان الميلاد', 'تاريخ التهلة', 'بنت', 'بن'
            ],
            'french': [
                'carte d\'identité nationale', 'tunisienne', 'nom', 'prénom', 
                'date de naissance', 'lieu de naissance', 'fille de', 'fils de'
            ],
            'english': [
                'national identity card', 'tunisian', 'last name', 'first name',
                'date of birth', 'place of birth', 'mother', 'father'
            ]
        },
        'passport': {
            'arabic': ['جواز سفر', 'رقم جواز السفر', 'الجنسية', 'تاريخ الإصدار', 'تاريخ الانتهاء'],
            'french': ['passeport', 'numéro de passeport', 'nationalité', 'date de délivrance'],
            'english': ['passport', 'passport number', 'nationality', 'date of issue', 'date of expiry']
        },
        'driver_license': {
            'arabic': ['رخصة قيادة', 'رخصة السياقة', 'رقم الرخصة', 'تاريخ الإصدار'],
            'french': ['permis de conduire', 'numéro de permis', 'date de délivrance'],
            'english': ['driver license', 'driver\'s license', 'license number', 'issue date']
        },
        'invoice': {
            'arabic': ['فاتورة', 'رقم الفاتورة', 'المجموع', 'الضريبة', 'تاريخ الفاتورة'],
            'french': ['facture', 'numéro de facture', 'total', 'tva', 'date de facture'],
            'english': ['invoice', 'invoice number', 'total', 'tax', 'invoice date']
        },
        'id_card': {
            'arabic': ['بطاقة تعريف', 'هوية', 'رقم الهوية', 'الاسم الكامل'],
            'french': ['carte d\'identité', 'identité', 'numéro d\'identité', 'nom complet'],
            'english': ['id card', 'identity card', 'id number', 'full name']
        }
    }
    
    def __init__(self):
        self.patterns = self.PATTERNS
    
    def classify(self, text_lines):
        """Classify document type based on text lines"""
        if not text_lines:
            return 'unknown', 0.0
        
        # Combine all text
        full_text = ' '.join(text_lines).lower()
        
        scores = {}
        
        for doc_type, patterns in self.patterns.items():
            score = 0
            total_patterns = 0
            
            for lang, keywords in patterns.items():
                for keyword in keywords:
                    total_patterns += 1
                    if keyword.lower() in full_text:
                        score += 1
            
            scores[doc_type] = score / total_patterns if total_patterns > 0 else 0
        
        # Get best match
        best_type = max(scores, key=scores.get)
        confidence = scores[best_type]
        
        # If confidence is too low, return unknown
        if confidence < 0.1:
            return 'unknown', confidence
        
        return best_type, confidence

# =======================
# CIN CARD EXTRACTOR
# =======================

class CINExtractor:
    """Extract fields from Tunisian CIN card"""
    
    def __init__(self):
        self.months = {
            'جانفي': '01', 'فيفري': '02', 'مارس': '03', 'أفريل': '04',
            'ماي': '05', 'جوان': '06', 'جويلية': '07', 'أوت': '08',
            'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12'
        }
    
    def extract(self, text_lines):
        """Extract all CIN fields"""
        result = {
            'document_type': 'cin_card',
            'cin_number': None,
            'last_name': None,
            'first_name': None,
            'father_name': None,
            'mother_name': None,
            'birth_date': None,
            'birth_place': None,
            'issue_date': None
        }
        
        # Extract CIN number (8 digits)
        for line in text_lines:
            match = re.search(r'\b\d{8}\b', line)
            if match:
                result['cin_number'] = match.group(0)
                break
        
        # Extract names and other fields
        for line in text_lines:
            lower_line = line.lower()
            
            # Last name
            if 'اللقب' in lower_line or 'القب' in lower_line:
                name = re.sub(r'اللقب|القب', '', line, flags=re.IGNORECASE).strip()
                if name:
                    result['last_name'] = fix_arabic_line(name)
            
            # First name
            if 'الاسم' in lower_line or 'الام' in lower_line:
                name = re.sub(r'الاسم|الام', '', line, flags=re.IGNORECASE).strip()
                if name:
                    result['first_name'] = fix_arabic_line(name)
            
            # Father name
            if 'بن' in lower_line and 'بنت' not in lower_line:
                name = re.sub(r'بن', '', line).strip()
                if name and name != line:
                    result['father_name'] = fix_arabic_line(name)
            
            # Mother name
            if 'بنت' in lower_line:
                name = re.sub(r'بنت', '', line).strip()
                if name:
                    result['mother_name'] = fix_arabic_line(name)
            
            # Birth place
            if 'مكان' in lower_line:
                place = re.sub(r'مكان|مكانها', '', line).strip()
                if place:
                    result['birth_place'] = fix_arabic_line(place)
            
            # Birth date
            for month_ar, month_num in self.months.items():
                if month_ar in line:
                    match = re.search(r'(\d{1,2})\s*' + month_ar + r'\s*(\d{4})', line)
                    if match:
                        day = match.group(1).zfill(2)
                        year = match.group(2)
                        result['birth_date'] = f"{day}/{month_num}/{year}"
                        break
        
        return result

# =======================
# PASSPORT EXTRACTOR
# =======================

class PassportExtractor:
    """Extract fields from passport"""
    
    def extract(self, text_lines):
        result = {
            'document_type': 'passport',
            'passport_number': None,
            'full_name': None,
            'nationality': None,
            'birth_date': None,
            'issue_date': None,
            'expiry_date': None
        }
        
        for line in text_lines:
            # Passport number (alphanumeric, 6-12 chars)
            match = re.search(r'\b[A-Z0-9]{6,12}\b', line)
            if match:
                result['passport_number'] = match.group(0)
            
            # Nationality
            if 'تونسية' in line or 'تونس' in line or 'tunisienne' in line.lower():
                result['nationality'] = 'تونسية'
            
            # Dates
            dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b', line)
            if dates:
                if not result['issue_date']:
                    result['issue_date'] = dates[0]
                elif len(dates) > 1:
                    result['expiry_date'] = dates[1]
        
        return result

# =======================
# INVOICE EXTRACTOR
# =======================

class InvoiceExtractor:
    """Extract fields from invoice"""
    
    def extract(self, text_lines):
        result = {
            'document_type': 'invoice',
            'invoice_number': None,
            'total_amount': None,
            'tax_amount': None,
            'date': None,
            'vendor': None,
            'customer': None
        }
        
        for line in text_lines:
            lower_line = line.lower()
            
            # Invoice number
            match = re.search(r'(?:invoice|facture|فاتورة)[\s:]*([A-Z0-9-]+)', line, re.IGNORECASE)
            if match:
                result['invoice_number'] = match.group(1)
            
            # Total amount
            match = re.search(r'(?:total|مجموع)[\s:]*([\d,]+\.?\d*)', lower_line)
            if match:
                result['total_amount'] = match.group(1)
            
            # Tax amount
            match = re.search(r'(?:tax|tva|ضريبة)[\s:]*([\d,]+\.?\d*)', lower_line)
            if match:
                result['tax_amount'] = match.group(1)
            
            # Date
            match = re.search(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b', line)
            if match:
                result['date'] = match.group(0)
        
        return result

# =======================
# GENERAL EXTRACTOR (Fallback)
# =======================

class GeneralExtractor:
    """Extract general information from any document"""
    
    def extract(self, text_lines):
        result = {
            'document_type': 'general',
            'dates': [],
            'numbers': [],
            'emails': [],
            'urls': [],
            'phone_numbers': []
        }
        
        for line in text_lines:
            # Extract dates
            dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b', line)
            result['dates'].extend(dates)
            
            # Extract numbers (5+ digits)
            numbers = re.findall(r'\b\d{5,}\b', line)
            result['numbers'].extend(numbers)
            
            # Extract emails
            emails = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', line)
            result['emails'].extend(emails)
            
            # Extract URLs
            urls = re.findall(r'https?://[^\s]+', line)
            result['urls'].extend(urls)
            
            # Extract phone numbers
            phones = re.findall(r'\b(?:\+?216)?[0-9\s-]{8,12}\b', line)
            result['phone_numbers'].extend(phones)
        
        return result

# =======================
# MAIN CLASSIFIER API
# =======================

class DocumentProcessor:
    """Main document processor that coordinates classification and extraction"""
    
    def __init__(self):
        self.classifier = DocumentClassifier()
        self.extractors = {
            'cin_card': CINExtractor(),
            'passport': PassportExtractor(),
            'invoice': InvoiceExtractor(),
            'general': GeneralExtractor()
        }
    
    def process(self, text_lines, force_type=None):
        """Process document: classify and extract fields"""
        
        # Classify document type
        if force_type and force_type != 'auto':
            doc_type = force_type
            confidence = 1.0
        else:
            doc_type, confidence = self.classifier.classify(text_lines)
        
        # Get appropriate extractor
        extractor = self.extractors.get(doc_type, self.extractors['general'])
        
        # Extract fields
        extracted_data = extractor.extract(text_lines)
        
        # Add classification metadata
        extracted_data['classification_confidence'] = confidence
        extracted_data['detected_type'] = doc_type
        
        return {
            'success': True,
            'document_type': doc_type,
            'confidence': confidence,
            'entities': extracted_data
        }

# Initialize processor
processor = DocumentProcessor()

# =======================
# FLASK ENDPOINTS
# =======================

@app.route('/classify', methods=['POST'])
def classify_document():
    """Classify document type"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    text_lines = data.get('text_lines', [])
    
    if not text_lines:
        return jsonify({"error": "No text lines provided"}), 400
    
    doc_type, confidence = processor.classifier.classify(text_lines)
    
    return jsonify({
        "success": True,
        "document_type": doc_type,
        "confidence": round(confidence, 3),
        "message": f"Document classified as {doc_type} with {round(confidence * 100)}% confidence"
    })

@app.route('/extract', methods=['POST'])
def extract_entities():
    """Extract entities from document"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    text_lines = data.get('text_lines', [])
    document_type = data.get('document_type', 'auto')
    
    if not text_lines:
        return jsonify({"error": "No text lines provided"}), 400
    
    result = processor.process(text_lines, document_type)
    
    return jsonify(result)

@app.route('/extract/cin', methods=['POST'])
def extract_cin():
    """Specialized endpoint for CIN cards"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    text_lines = data.get('text_lines', [])
    
    if not text_lines:
        return jsonify({"error": "No text lines provided"}), 400
    
    extractor = CINExtractor()
    result = extractor.extract(text_lines)
    
    return jsonify({
        "success": True,
        "document_type": "cin_card",
        "entities": result
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "Document Classifier & Entity Extractor",
        "supported_documents": list(processor.extractors.keys()),
        "version": "2.0"
    })

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "Document Classifier API",
        "version": "2.0",
        "endpoints": {
            "POST /classify": "Classify document type only",
            "POST /extract": "Extract entities (auto-detect type)",
            "POST /extract/cin": "Specialized CIN extraction",
            "GET /health": "Health check"
        },
        "supported_document_types": list(processor.extractors.keys()),
        "example": {
            "request": {
                "text_lines": ["الجمهورية التونسية", "بطاقة التعريف الوطنية", "14661253"]
            },
            "response": {
                "document_type": "cin_card",
                "confidence": 0.95,
                "entities": {...}
            }
        }
    })

if __name__ == '__main__':
    print("\n" + "="*70)
    print("📄 DOCUMENT CLASSIFIER & ENTITY EXTRACTOR")
    print("="*70)
    print("✅ Service Ready")
    print("📚 Supported Document Types:")
    print("   - cin_card (Tunisian Identity Card)")
    print("   - passport")
    print("   - invoice")
    print("   - general (fallback for any document)")
    print("\n🔧 Features:")
    print("   - Automatic document classification")
    print("   - Field extraction per document type")
    print("   - Arabic text processing")
    print("   - Multi-language support (Arabic, French, English)")
    print("\n🔌 Server: http://0.0.0.0:5001")
    print("="*70 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)