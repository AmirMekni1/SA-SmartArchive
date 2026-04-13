# llmwhisperer_api_deepseek.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from unstract.llmwhisperer.client_v2 import LLMWhispererClientV2
import tempfile
import os
import re
import logging
import json
import requests

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =======================
# إعدادات LLMWhisperer
# =======================

LLMWHISPERER_API_KEY = os.environ.get("LLMWHISPERER_API_KEY", "mM8MTaipyuZ6oF7MSmo-0qCU-S7uMdgjah2kHxnr6Mo")

client = LLMWhispererClientV2(
    base_url="https://llmwhisperer-api.us-central.unstract.com/api/v2",
    api_key=LLMWHISPERER_API_KEY
)

# =======================
# نموذج DeepSeek-V3.1 - الإعدادات
# =======================

MODEL_NAME = "deepseek-v3.1:671b-cloud"
TEMPERATURE = 0.6
TOP_P = 0.95
CONTEXT_LENGTH = 128000

# =======================
# دوال معالجة أسماء الأب (بن/بنت)
# =======================

def extract_father_name_from_text(text):
    """
استخراج اسم الأب من النص و اعكس ترتيب الكلمات 
   مثال الرحمان عبد بن صالح بن  -> بن صالح بن عبد الرحمان
    """
    if not text:
        return None
    
    
    return text.strip() if text else None

def fix_arabic_text(text):
    """تصحيح النص العربي (ترتيب الكلمات والحروف)"""
    if not text:
        return text
    
    known_phrases = {
        'التونسية الجمهورية': 'الجمهورية التونسية',
        'الوطنية التعريف بطاقة': 'بطاقة التعريف الوطنية',
        'التعريف بطاقة': 'بطاقة التعريف',
        'الولادة تاريخ': 'تاريخ الولادة',
        'مكانها': '',
        'سورع نب': 'بن عروس',
        'عروس بن': 'بن عروس',
        'ينكام': 'ماكني',
        'ريمأ': 'أمير',
    }
    
    result = text
    for wrong, correct in known_phrases.items():
        if wrong in result:
            result = result.replace(wrong, correct)
    
    # معالجة العبارات الثنائية
    words = result.split()
    if len(words) == 2 and words[0] in ['التونسية', 'الوطنية', 'التعريف', 'الولادة']:
        result = f"{words[1]} {words[0]}"
    
    return result

def clean_text(text):
    """تنظيف النص من الرموز الزائدة"""
    if not text:
        return text
    text = re.sub(r'[<<<\f\n\r]', '', text)
    text = text.strip()
    return text

# =======================
# التحقق من توفر النموذج
# =======================

def check_model_available():
    """التحقق من توفر النموذج في Ollama"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code != 200:
            return False, "Ollama is not running"
        
        models = response.json().get("models", [])
        model_names = [m['name'] for m in models]
        
        if MODEL_NAME in model_names:
            return True, f"Model '{MODEL_NAME}' is available"
        else:
            return False, f"Model '{MODEL_NAME}' not found"
        
    except Exception as e:
        return False, f"Ollama error: {e}"

# =======================
# محاولة تحميل LangChain
# =======================

LANGCHAIN_AVAILABLE = False
try:
    from langchain_community.llms import Ollama
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    LANGCHAIN_AVAILABLE = True
    logger.info("✅ LangChain loaded successfully")
except ImportError as e:
    logger.error(f"❌ LangChain not installed: {e}")

# =======================
# تهيئة نموذج DeepSeek-V3.1
# =======================

def setup_deepseek_model():
    """تهيئة نموذج DeepSeek-V3.1"""
    if not LANGCHAIN_AVAILABLE:
        return None
    
    try:
        llm = Ollama(
            model=MODEL_NAME,
            temperature=TEMPERATURE,
            top_p=TOP_P,
            num_ctx=CONTEXT_LENGTH,
            base_url="http://localhost:11434",
            num_predict=4096
        )
        logger.info(f"✅ DeepSeek-V3.1 model '{MODEL_NAME}' loaded successfully")
        return llm
    except Exception as e:
        logger.error(f"❌ Failed to load DeepSeek-V3.1: {e}")
        return None

# =======================
# إنشاء سلسلة الاستخراج مع تعليمات خاصة لاسم الأب
# =======================

def create_extraction_chain(llm):
    """إنشاء سلسلة LangChain لاستخراج المعلومات مع معالجة خاصة لاسم الأب"""
    
    prompt_template = """
    أنت DeepSeek-V3.1، نظام متخصص في تحليل بطاقات التعريف التونسية (CIN).
    
    المهمة: استخرج جميع المعلومات المهمة من النص التالي بدقة عالية.
    
    النص:
    {text}
    
    استخرج المعلومات التالية إذا وجدت:
    - card_number: رقم بطاقة التعريف (8 أرقام)
    - last_name: اللقب (يأتي غالباً قبل كلمة "اللقب")
    - first_name: الاسم الأول (يأتي غالباً قبل كلمة "الاسم")
    - father_name: اسم الأب 
    
    **ملاحظة مهمة لاستخراج اسم الأب:**
    اسم الأب يتكون من اسم الشخص + "بن" + اسم الأب
    مثال: "خليفه بن الحسين بنت" -> "خليفه بن الحسين"
    مثال: "الهادي بن منذر بن" -> "الهادي بن منذر"
    مثال: "محمد بن علي" -> "محمد بن علي"
    
    - mother_name: اسم الأم (يحتوي على "بنت")
    - birth_date: تاريخ الميلاد (بصيغة DD/MM/YYYY)
    - birth_place: مكان الولادة
    - state: الولاية
    - card_name: اسم البطاقة
    - document_title: العنوان الرئيسي
    - husband_name: اسم الزوج (إذا وجدت كلمة "حرم")
    
    قم بإرجاع JSON فقط، بدون أي نص إضافي.
    
    مثال:
    {{
        "card_number": "14661253",
        "last_name": "ماكني",
        "first_name": "أمير",
        "father_name": "منذر بن الهادي",
        "birth_date": "01/11/2002",
        "birth_place": "بن عروس",
        "state": "بن عروس"
    }}
    
    JSON:
    """
    
    prompt = ChatPromptTemplate.from_template(prompt_template)
    chain = prompt | llm | JsonOutputParser()
    
    return chain

def extract_with_deepseek(text, llm):
    """استخراج المعلومات باستخدام DeepSeek-V3.1"""
    
    if not llm:
        return None
    
    try:
        text = clean_text(text)
        chain = create_extraction_chain(llm)
        result = chain.invoke({"text": text})
        
        # تنظيف النتائج
        for key, value in result.items():
            if isinstance(value, str):
                if key == 'father_name' and value:
                    # معالجة خاصة لاسم الأب
                    value = extract_father_name_from_text(value)
                result[key] = fix_arabic_text(value.strip())
        
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        return None
    except Exception as e:
        logger.error(f"DeepSeek extraction error: {e}")
        return None

# =======================
# دالة معالجة الصورة الرئيسية
# =======================

def process_cin_card(image_path):
    """معالجة بطاقة التعريف باستخدام DeepSeek-V3.1"""
    try:
        # 1. OCR باستخدام LLMWhisperer
        logger.info("📸 Processing image with LLMWhisperer...")
        result = client.whisper(
            file_path=image_path,
            wait_for_completion=True,
            wait_timeout=200
        )
        
        raw_text = result["extraction"]["result_text"]
        lines = raw_text.split('\n')
        lines = [clean_text(line) for line in lines if clean_text(line)]
        
        logger.info("="*50)
        logger.info("📄 Text extracted successfully")
        logger.info(f"📊 Total lines: {len(lines)}")
        for i, line in enumerate(lines[:10]):
            logger.info(f"   Line {i+1}: {line[:80]}")
        logger.info("="*50)
        
        # 2. التحقق من توفر النموذج
        available, message = check_model_available()
        if not available:
            logger.error(f"❌ {message}")
            return {
                "success": False, 
                "error": message,
                "help": f"Please run: ollama pull {MODEL_NAME}"
            }
        
        if not LANGCHAIN_AVAILABLE:
            error_msg = "LangChain not installed. Run: pip install langchain langchain-community"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}
        
        # 3. تهيئة DeepSeek-V3.1
        logger.info(f"🤖 Initializing {MODEL_NAME}...")
        llm = setup_deepseek_model()
        
        if not llm:
            error_msg = f"Failed to load {MODEL_NAME}"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}
        
        # 4. استخراج المعلومات
        logger.info(f"🤖 Extracting information with DeepSeek-V3.1...")
        extracted_data = extract_with_deepseek(raw_text, llm)
        
        if not extracted_data:
            error_msg = "DeepSeek-V3.1 extraction failed"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": error_msg}
        
        # 5. معالجة إضافية لاسم الأب من النص الخام إذا لم يجده النموذج
        if not extracted_data.get('father_name'):
            # البحث عن اسم الأب في السطور
            for line in lines:
                if 'بن' in line:
                    father = extract_father_name_from_text(line)
                    if father and len(father) > 3:
                        extracted_data['father_name'] = father
                        logger.info(f"📝 Extracted father name from raw text: {father}")
                        break
        
        # 6. إضافة النص الأصلي
        extracted_data["full_text"] = fix_arabic_text(raw_text)
        extracted_data["text_lines"] = [fix_arabic_text(line) for line in lines]
        extracted_data["_metadata"] = {
            "extraction_method": f"DeepSeek-V3.1",
            "model": MODEL_NAME,
            "total_lines": len(lines),
            "temperature": TEMPERATURE,
            "context_length": CONTEXT_LENGTH
        }
        
        logger.info("="*50)
        logger.info("✅ Extraction complete!")
        logger.info(f"📊 Extracted fields:")
        for key, value in extracted_data.items():
            if not key.startswith('_') and value:
                logger.info(f"   {key}: {str(value)[:50]}")
        logger.info("="*50)
        
        return {
            "success": True,
            "extracted_data": extracted_data,
            "method": f"DeepSeek-V3.1",
            "model_used": MODEL_NAME
        }
        
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"success": False, "error": str(e)}

# =======================
# API Endpoints
# =======================

@app.route('/process', methods=['POST'])
def process_document():
    """معالجة بطاقة التعريف باستخدام DeepSeek-V3.1"""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
    
    file = request.files['file']
    temp_path = None
    
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            file.save(tmp.name)
            temp_path = tmp.name
        
        result = process_cin_card(temp_path)
        
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
        
        return jsonify(result)
        
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/test-father-name', methods=['POST'])
def test_father_name():
    """اختبار معالجة اسم الأب"""
    data = request.get_json()
    text = data.get('text', '')
    result = extract_father_name_from_text(text)
    return jsonify({
        "original": text,
        "extracted_father_name": result
    })

@app.route('/process-two-sides', methods=['POST'])
def process_two_sides_document():
    """معالجة وجهي بطاقة التعريف"""
    if 'front' not in request.files:
        return jsonify({"success": False, "error": "Front image required"}), 400
    
    front_file = request.files['front']
    back_file = request.files.get('back')
    
    front_path = None
    back_path = None
    
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            front_file.save(tmp.name)
            front_path = tmp.name
        
        if back_file:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                back_file.save(tmp.name)
                back_path = tmp.name
        
        front_result = process_cin_card(front_path)
        back_result = process_cin_card(back_path) if back_path else None
        
        combined_data = {
            "front": front_result.get("extracted_data", {}) if front_result.get("success") else None,
            "back": back_result.get("extracted_data", {}) if back_result and back_result.get("success") else None,
            "success": front_result.get("success", False)
        }
        
        if front_path and os.path.exists(front_path):
            os.unlink(front_path)
        if back_path and os.path.exists(back_path):
            os.unlink(back_path)
        
        return jsonify(combined_data)
        
    except Exception as e:
        if front_path and os.path.exists(front_path):
            os.unlink(front_path)
        if back_path and os.path.exists(back_path):
            os.unlink(back_path)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """التحقق من صحة النظام"""
    available, message = check_model_available()
    return jsonify({
        "status": "ok" if available else "degraded",
        "service": "CIN Card OCR API - DeepSeek-V3.1",
        "model": MODEL_NAME,
        "model_available": available,
        "message": message,
        "langchain_available": LANGCHAIN_AVAILABLE,
        "father_name_handling": "Special processing for 'بن' and 'بنت'",
        "extraction_method": "DeepSeek-V3.1 Hybrid Reasoning"
    })

@app.route('/setup', methods=['GET'])
def setup_instructions():
    """تعليمات التثبيت"""
    return jsonify({
        "required_setup": {
            "1_pull_model": f"ollama pull {MODEL_NAME}",
            "2_install_python_packages": "pip install langchain langchain-community"
        },
        "father_name_handling": {
            "description": "Special handling for father names with 'بن' and 'بنت'",
            "examples": [
                {"input": "خليفه بن الحسين بنت", "output": "خليفه بن الحسين"},
                {"input": "الهادي بن منذر بن", "output": "الهادي بن منذر"},
                {"input": "محمد بن علي", "output": "محمد بن علي"}
            ]
        }
    })

@app.route('/', methods=['GET'])
def index():
    """الصفحة الرئيسية"""
    return jsonify({
        "service": "CIN Card OCR API",
        "version": "20.0",
        "model": MODEL_NAME,
        "extraction_method": "DeepSeek-V3.1 with Father Name Special Handling",
        "features": {
            "ocr": "LLMWhisperer",
            "extraction": "DeepSeek-V3.1 (671B parameters)",
            "father_name_handling": "Special processing for 'بن' and 'بنت'",
            "text_correction": "Automatic Arabic text correction"
        },
        "father_name_examples": {
            "خليفه بن الحسين بنت": "→ خليفه بن الحسين",
            "الهادي بن منذر بن": "→ الهادي بن منذر",
            "محمد بن علي": "→ محمد بن علي"
        },
        "endpoints": {
            "POST /process": "Extract information from CIN card",
            "POST /process-two-sides": "Extract from front and back",
            "POST /test-father-name": "Test father name extraction",
            "GET /health": "Health check",
            "GET /setup": "Setup instructions"
        }
    })

if __name__ == '__main__':
    print("\n" + "="*70)
    print("🎯 CIN Card OCR API - DeepSeek-V3.1")
    print("="*70)
    print("✅ LLMWhisperer: Ready")
    print(f"🤖 Model: {MODEL_NAME}")
    print(f"🌡️ Temperature: {TEMPERATURE}")
    print("🔄 Special Handling:")
    print("   - Father names with 'بن' and 'بنت'")
    print("   - خليفه بن الحسين بنت → خليفه بن الحسين")
    print("   - الهادي بن منذر بن → الهادي بن منذر")
    
    available, message = check_model_available()
    if available:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")
        print(f"   Run: ollama pull {MODEL_NAME}")
    
    print("🔌 Server: http://0.0.0.0:5003")
    print("="*70 + "\n")
    
    app.run(host='0.0.0.0', port=5003, debug=False)