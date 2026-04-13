# auth_api.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
import datetime
import random
import re
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

# =======================
# إعدادات التطبيق
# =======================

app.config['SECRET_KEY'] ='7xY2kL9mN4pQ8rT5vW1zA3bC6dE0fG9hJ2kL5mN8pQ'
app.config['JWT_EXPIRATION'] = 3600  # 1 ساعة

# إعدادات البريد الإلكتروني (Gmail)
EMAIL_ADDRESS = os.getenv('EMAIL_ADDRESS', 'mekniamir09@gmail.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'dphaacusiybssyjn')  # كلمة مرور التطبيق

# إعدادات MongoDB
MONGO_URI ='mongodb://localhost:27017/SmartArchiveDB'
client_mongo = MongoClient(MONGO_URI)
db = client_mongo['cin_auth_db']
users_collection = db['users']
pending_users_collection = db['pending_users']
verification_codes_collection = db['verification_codes']

# =======================
# دوال إرسال البريد باستخدام smtplib
# =======================

def send_email_via_smtp(to_email, subject, body_html, body_text=None):
    """
    إرسال بريد إلكتروني باستخدام smtplib
    """
    try:
        # إنشاء الرسالة
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        
        # النص العادي (fallback)
        if body_text:
            part_text = MIMEText(body_text, 'plain')
            msg.attach(part_text)
        
        # النص بتنسيق HTML
        part_html = MIMEText(body_html, 'html')
        msg.attach(part_html)
        
        # الاتصال بخادم Gmail
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        
        # إرسال البريد
        server.sendmail(EMAIL_ADDRESS, to_email, msg.as_string())
        server.quit()
        
        print(f"✅ Email sent to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False

def send_verification_email(email, code, username=None):
    """إرسال رمز تأكيد إلى البريد الإلكتروني"""
    
    subject = f"رمز التحقق - منصة التعريف الوطنية"
    
    # رابط التحقق (يمكن تخصيصه حسب الواجهة الأمامية)
    verification_link = f"http://localhost:3000/verify-email?email={email}&code={code}"
    
    # النص بتنسيق HTML
    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; text-align: center; }}
            .code {{ font-size: 32px; font-weight: bold; color: #27ae60; letter-spacing: 5px; background: #f0f4ff; padding: 15px; border-radius: 8px; display: inline-block; margin: 20px 0; }}
            .button {{ background: #27ae60; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 16px; }}
            .button:hover {{ background: #229954; }}
            .divider {{ border-top: 2px solid #e0e0e0; margin: 25px 0; }}
            .footer {{ background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }}
            .note {{ color: #e74c3c; font-size: 12px; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🏛️ منصة التعريف الوطنية</h2>
            </div>
            <div class="content">
                <h3>مرحباً {username or 'المستخدم'}!</h3>
                <p>شكراً لتسجيلك معنا. لتأكيد بريدك الإلكتروني، انقر على الزر أدناه:</p>
                <a href="{verification_link}" class="button">✓ تأكيد البريد الإلكتروني</a>
                <div class="divider"></div>
                <p>أو استخدم رمز التحقق الخاص بك:</p>
                <div class="code">{code}</div>
                <p>هذا الرمز صالح لمدة <strong>15 دقيقة</strong></p>
                <p class="note">⚠️ إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا البريد.</p>
            </div>
            <div class="footer">
                <p>© 2024 منصة التعريف الوطنية - جميع الحقوق محفوظة</p>
                <p>هذا بريد آلي، يرجى عدم الرد عليه.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # النص العادي (للبريد الإلكتروني الذي لا يدعم HTML)
    text_content = f"""
    مرحباً {username or 'المستخدم'}!
    
    شكراً لتسجيلك معنا. لتأكيد بريدك الإلكتروني، انسخ الرابط التالي في متصفحك:
    {verification_link}
    
    أو استخدم رمز التحقق الخاص بك: {code}
    
    هذا الرمز صالح لمدة 15 دقيقة.
    
    إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا البريد.
    
    --
    منصة التعريف الوطنية
    """
    
    return send_email_via_smtp(email, subject, html_content, text_content)

def send_welcome_email(email, username):
    """إرسال بريد ترحيبي بعد تأكيد الحساب"""
    
    subject = f"مرحباً بك في منصة التعريف الوطنية"
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; text-align: center; }}
            .button {{ background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }}
            .footer {{ background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🎉 مرحباً بك!</h2>
            </div>
            <div class="content">
                <h3>أهلاً وسهلاً {username}!</h3>
                <p>تم تأكيد حسابك بنجاح في منصة التعريف الوطنية.</p>
                <p>يمكنك الآن تسجيل الدخول والاستفادة من خدماتنا.</p>
                <a href="#" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">تسجيل الدخول</a>
            </div>
            <div class="footer">
                <p>© 2024 منصة التعريف الوطنية - جميع الحقوق محفوظة</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    مرحباً بك {username}!
    
    تم تأكيد حسابك بنجاح في منصة التعريف الوطنية.
    
    يمكنك الآن تسجيل الدخول والاستفادة من خدماتنا.
    
    --
    منصة التعريف الوطنية
    """
    
    return send_email_via_smtp(email, subject, html_content, text_content)

# =======================
# دالة إرسال رمز التحقق العامة
# =======================

def send_code_verification(email, code=None, username=None, purpose="verification"):
    """
    إرسال رمز تحقق إلى بريد إلكتروني
    :param email: البريد الإلكتروني المرسل إليه
    :param code: رمز التحقق (إذا لم يتم تمريره، سيتم توليده تلقائياً)
    :param username: اسم المستخدم
    :param purpose: الغرض من الرمز (verification, reset, etc.)
    :return: tuple (success, code)
    """
    try:
        # توليد رمز إذا لم يتم تمريره
        if not code:
            code = generate_verification_code()

        # إرسال البريد الإلكتروني
        email_sent = send_verification_email(email, code, username)

        if email_sent:
            print(f"✅ Verification code sent to {email}: {code}")
            return True, code
        else:
            print(f"❌ Failed to send verification code to {email}")
            return False, None

    except Exception as e:
        print(f"❌ Error sending verification code: {str(e)}")
        return False, None

# =======================
# دوال مساعدة
# =======================

def generate_verification_code():
    """توليد رمز تأكيد عشوائي من 6 أرقام"""
    return str(random.randint(100000, 999999))

def generate_token(user_id, cin_number):
    """توليد JWT token"""
    payload = {
        'user_id': str(user_id),
        'cin_number': cin_number,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=app.config['JWT_EXPIRATION'])
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    """Decorator للتحقق من صحة التوكن"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = users_collection.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'success': False, 'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# =======================
# دوال التحقق من صحة البيانات
# =======================

def is_valid_email(email):
    """التحقق من صحة البريد الإلكتروني"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_cin(cin_number):
    """التحقق من صحة رقم البطاقة (8 أرقام)"""
    return re.match(r'^\d{8}$', cin_number) is not None

def is_strong_password(password):
    """التحقق من قوة كلمة المرور"""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True

# =======================
# API المصادقة
# =======================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """تسجيل حساب جديد"""
    data = request.get_json()
    
    required_fields = ['cin_number', 'email', 'password', 'username']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
    
    cin_number = data['cin_number'].strip()
    email = data['email'].strip().lower()
    password = data['password']
    username = data['username'].strip()
    
    if not is_valid_cin(cin_number):
        return jsonify({'success': False, 'error': 'رقم البطاقة غير صالح (يجب أن يكون 8 أرقام)'}), 400
    
    if not is_valid_email(email):
        return jsonify({'success': False, 'error': 'البريد الإلكتروني غير صالح'}), 400
    
    if not is_strong_password(password):
        return jsonify({'success': False, 'error': 'كلمة المرور ضعيفة (يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، رمز خاص)'}), 400
    
    existing_user = users_collection.find_one({
        '$or': [
            {'cin_number': cin_number},
            {'email': email}
        ]
    })
    
    if existing_user:
        if existing_user.get('cin_number') == cin_number:
            return jsonify({'success': False, 'error': 'رقم البطاقة مسجل بالفعل'}), 400
        if existing_user.get('email') == email:
            return jsonify({'success': False, 'error': 'البريد الإلكتروني مسجل بالفعل'}), 400
    
    verification_code = generate_verification_code()
    
    pending_user = {
        'cin_number': cin_number,
        'email': email,
        'password': generate_password_hash(password),
        'username': username,
        'verification_code': verification_code,
        'code_expires_at': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
        'created_at': datetime.datetime.utcnow()
    }
    
    pending_users_collection.update_one(
        {'email': email},
        {'$set': pending_user},
        upsert=True
    )
    
    verification_codes_collection.insert_one({
        'email': email,
        'code': verification_code,
        'expires_at': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
        'created_at': datetime.datetime.utcnow()
    })
    
    email_sent = send_verification_email(email, verification_code, username)
    
    if not email_sent:
        return jsonify({'success': False, 'error': 'فشل إرسال بريد التأكيد، يرجى المحاولة مرة أخرى'}), 500
    
    return jsonify({
        'success': True,
        'message': 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتأكيد حسابك.',
        'requires_verification': True,
        'email': email
    })

@app.route('/api/auth/verify-email', methods=['POST'])
def verify_email():
    """تأكيد البريد الإلكتروني"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('code'):
        return jsonify({'success': False, 'error': 'البريد الإلكتروني ورمز التحقق مطلوبان'}), 400
    
    email = data['email'].strip().lower()
    code = data['code'].strip()
    
    verification = verification_codes_collection.find_one({
        'email': email,
        'code': code,
        'expires_at': {'$gt': datetime.datetime.utcnow()}
    })
    
    if not verification:
        return jsonify({'success': False, 'error': 'رمز التحقق غير صالح أو منتهي الصلاحية'}), 400
    
    pending_user = pending_users_collection.find_one({'email': email})
    
    if not pending_user:
        return jsonify({'success': False, 'error': 'لم يتم العثور على حساب معلق لهذا البريد'}), 400
    
    new_user = {
        'cin_number': pending_user['cin_number'],
        'email': pending_user['email'],
        'password': pending_user['password'],
        'username': pending_user['username'],
        'is_verified': True,
        'verified_at': datetime.datetime.utcnow(),
        'created_at': pending_user['created_at'],
        'last_login': None,
        'role': 'user'
    }
    
    result = users_collection.insert_one(new_user)
    
    pending_users_collection.delete_one({'email': email})
    verification_codes_collection.delete_many({'email': email})
    
    # إرسال بريد ترحيبي
    send_welcome_email(email, pending_user['username'])
    
    token = generate_token(result.inserted_id, pending_user['cin_number'])
    
    return jsonify({
        'success': True,
        'message': 'تم تأكيد البريد الإلكتروني بنجاح',
        'token': token,
        'user': {
            'id': str(result.inserted_id),
            'cin_number': pending_user['cin_number'],
            'username': pending_user['username'],
            'email': pending_user['email'],
            'is_verified': True
        }
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """تسجيل الدخول"""
    data = request.get_json()
    
    if not data.get('cin_number') or not data.get('password'):
        return jsonify({'success': False, 'error': 'رقم البطاقة وكلمة المرور مطلوبان'}), 400
    
    cin_number = data['cin_number'].strip()
    password = data['password']
    
    user = users_collection.find_one({'cin_number': cin_number})
    
    if not user:
        return jsonify({'success': False, 'error': 'رقم البطاقة غير موجود'}), 401
    
    if not check_password_hash(user['password'], password):
        return jsonify({'success': False, 'error': 'كلمة المرور غير صحيحة'}), 401
    
    if not user.get('is_verified', False):
        return jsonify({'success': False, 'error': 'يرجى تأكيد بريدك الإلكتروني أولاً', 'requires_verification': True}), 401
    
    users_collection.update_one(
        {'_id': user['_id']},
        {'$set': {'last_login': datetime.datetime.utcnow()}}
    )
    
    token = generate_token(user['_id'], user['cin_number'])
    
    return jsonify({
        'success': True,
        'message': 'تم تسجيل الدخول بنجاح',
        'token': token,
        'user': {
            'id': str(user['_id']),
            'cin_number': user['cin_number'],
            'username': user['username'],
            'email': user['email'],
            'is_verified': user.get('is_verified', True)
        }
    })

@app.route('/api/auth/resend-code', methods=['POST'])
def resend_code():
    """إعادة إرسال رمز التحقق"""
    data = request.get_json()
    
    if not data.get('email'):
        return jsonify({'success': False, 'error': 'البريد الإلكتروني مطلوب'}), 400
    
    email = data['email'].strip().lower()
    
    pending_user = pending_users_collection.find_one({'email': email})
    
    if not pending_user:
        return jsonify({'success': False, 'error': 'لم يتم العثور على حساب معلق لهذا البريد'}), 404
    
    new_code = generate_verification_code()
    
    verification_codes_collection.update_one(
        {'email': email},
        {'$set': {
            'code': new_code,
            'expires_at': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
            'updated_at': datetime.datetime.utcnow()
        }},
        upsert=True
    )
    
    pending_users_collection.update_one(
        {'email': email},
        {'$set': {
            'verification_code': new_code,
            'code_expires_at': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        }}
    )
    
    email_sent = send_verification_email(email, new_code, pending_user.get('username'))
    
    if not email_sent:
        return jsonify({'success': False, 'error': 'فشل إرسال البريد'}), 500
    
    return jsonify({
        'success': True,
        'message': 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني'
    })

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """الحصول على معلومات المستخدم الحالي"""
    return jsonify({
        'success': True,
        'user': {
            'id': str(current_user['_id']),
            'cin_number': current_user['cin_number'],
            'username': current_user['username'],
            'email': current_user['email'],
            'is_verified': current_user.get('is_verified', True),
            'created_at': str(current_user.get('created_at')),
            'last_login': str(current_user.get('last_login')) if current_user.get('last_login') else None
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout(current_user):
    """تسجيل الخروج"""
    return jsonify({
        'success': True,
        'message': 'تم تسجيل الخروج بنجاح'
    })

@app.route('/api/auth/check-cin', methods=['POST'])
def check_cin():
    """التحقق من وجود رقم بطاقة"""
    data = request.get_json()
    
    if not data.get('cin_number'):
        return jsonify({'success': False, 'error': 'رقم البطاقة مطلوب'}), 400
    
    cin_number = data['cin_number'].strip()
    
    user = users_collection.find_one({'cin_number': cin_number})
    
    return jsonify({
        'success': True,
        'exists': user is not None,
        'is_verified': user.get('is_verified', False) if user else False
    })

@app.route('/api/auth/send-code', methods=['POST'])
def send_code():
    """إرسال رمز تحقق إلى بريد إلكتروني"""
    data = request.get_json()

    if not data.get('email'):
        return jsonify({'success': False, 'error': 'البريد الإلكتروني مطلوب'}), 400

    email = data['email'].strip().lower()
    username = data.get('username')
    purpose = data.get('purpose', 'verification')
    custom_code = data.get('code')  # Optional custom code

    # Validate email format
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({'success': False, 'error': 'تنسيق البريد الإلكتروني غير صالح'}), 400

    # Send verification code
    success, code = send_code_verification(email, custom_code, username, purpose)

    if success:
        return jsonify({
            'success': True,
            'message': 'تم إرسال رمز التحقق بنجاح',
            'email': email,
            'code': code,  # Only return in development/debugging
            'purpose': purpose
        })
    else:
        return jsonify({
            'success': False,
            'error': 'فشل في إرسال رمز التحقق'
        }), 500

@app.route('/api/auth/test-email', methods=['GET'])
def test_email():
    """اختبار إرسال البريد"""
    result = send_verification_email('test@example.com', '123456', 'Test User')
    return jsonify({'success': result})

if __name__ == '__main__':
    print("\n" + "="*70)
    print("🔐 CIN Authentication API (with smtplib)")
    print("="*70)
    print("✅ Server running on http://0.0.0.0:5004")
    print("📧 Email: smtplib + Gmail")
    print("🔑 JWT authentication enabled")
    print("\n⚠️  IMPORTANT: Set your email credentials:")
    print("   EMAIL_ADDRESS=your-email@gmail.com")
    print("   EMAIL_PASSWORD=your-app-password")
    print("="*70 + "\n")
    
    app.run(host='0.0.0.0', port=5007, debug=True)
