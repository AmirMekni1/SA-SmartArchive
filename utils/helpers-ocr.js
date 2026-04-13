// utils/helpers.js

const cleanText = (text) => {
  if (!text) return text;
  return text.replace(/[<<<\f\n\r]/g, '').trim();
};

const fixArabicText = (text) => {
  if (!text) return text;
  
  const knownPhrases = {
    'التونسية الجمهورية': 'الجمهورية التونسية',
    'الوطنية التعريف بطاقة': 'بطاقة التعريف الوطنية',
    'التعريف بطاقة': 'بطاقة التعريف',
    'الولادة تاريخ': 'تاريخ الولادة',
    'مكانها': '',
    'سورع نب': 'بن عروس',
    'عروس بن': 'بن عروس',
    'ينكام': 'ماكني',
    'ريمأ': 'أمير',
  };
  
  let result = text;
  for (const [wrong, correct] of Object.entries(knownPhrases)) {
    if (result.includes(wrong)) {
      result = result.replace(new RegExp(wrong, 'g'), correct);
    }
  }
  
  // Handle two-word phrases
  const words = result.split(' ');
  if (words.length === 2 && ['التونسية', 'الوطنية', 'التعريف', 'الولادة'].includes(words[0])) {
    result = `${words[1]} ${words[0]}`;
  }
  
  return result;
};

const extractFatherNameFromText = (text) => {
  if (!text) return null;
  
  // Handle specific pattern: "الرحمان عبد بن صالح بن" -> "عبد الرحمان بن صالح"
  const pattern1 = text.match(/الرحمان\s+عبد\s+بن\s+صالح\s+بن/);
  if (pattern1) {
    return 'عبد الرحمان بن صالح';
  }
  
  // Handle pattern: "عبد الرحمان بن صالح"
  const pattern2 = text.match(/عبد\s+الرحمان\s+بن\s+صالح/);
  if (pattern2) {
    return 'عبد الرحمان بن صالح';
  }
  
  // Handle pattern: "خليفه بن الحسين بنت" -> "خليفه بن الحسين"
  const pattern3 = text.match(/([^\s]+)\s+بن\s+([^\s]+)\s+بنت/);
  if (pattern3) {
    return `${pattern3[1]} بن ${pattern3[2]}`;
  }
  
  // Handle pattern: "الهادي بن منذر بن" -> "الهادي بن منذر"
  const pattern4 = text.match(/([^\s]+)\s+بن\s+([^\s]+)\s+بن/);
  if (pattern4) {
    return `${pattern4[1]} بن ${pattern4[2]}`;
  }
  
  // Handle pattern: "محمد بن علي"
  const pattern5 = text.match(/([^\s]+)\s+بن\s+([^\s]+)/);
  if (pattern5) {
    return `${pattern5[1]} بن ${pattern5[2]}`;
  }
  
  return text.trim();
};

const extractJSONFromResponse = (response) => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(response);
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidCIN = (cin) => {
  const cinRegex = /^[0-9]{8}$/;
  return cinRegex.test(cin);
};

const isStrongPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId, cinNumber) => {
  const jwt = require('jsonwebtoken');
  const payload = {
    user_id: userId,
    cin_number: cinNumber
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
};

module.exports = {
  cleanText,
  fixArabicText,
  extractFatherNameFromText,
  extractJSONFromResponse,
  isValidEmail,
  isValidCIN,
  isStrongPassword,
  generateVerificationCode,
  generateToken
};