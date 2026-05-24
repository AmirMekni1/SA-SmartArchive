const express = require('express');
const path = require('path');
const { execFile } = require('child_process');
const User = require('../models/User');
const DocumentRecord = require('../models/DocumentRecord');
const AdminSettings = require('../models/AdminSettings');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

const PYTHON_SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'ollama_autocomplete.py');

const uniqueLimited = (values = [], limit = 20) =>
  Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))).slice(0, limit);

const jsRankSuggestions = (query, candidates = [], limit = 20) => {
  const normalizedQuery = String(query || '').toLowerCase().trim();
  if (!normalizedQuery) {
    return uniqueLimited(candidates, limit);
  }

  return uniqueLimited(candidates, candidates.length)
    .map((value) => {
      const lower = value.toLowerCase();
      let score = 0;
      if (lower.startsWith(normalizedQuery)) score += 100;
      if (lower.includes(normalizedQuery)) score += 50;
      if (lower.replace(/\s+/g, '').includes(normalizedQuery.replace(/\s+/g, ''))) score += 20;
      score -= Math.abs(lower.length - normalizedQuery.length);
      return { value, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.value);
};

const runPythonAutocomplete = ({ field, query, candidates, topK = 20 }) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({ field, query, candidates, top_k: topK });
    const commands = [
      { cmd: 'python', args: [PYTHON_SCRIPT_PATH] },
      { cmd: 'py', args: ['-3', PYTHON_SCRIPT_PATH] },
      { cmd: 'python3', args: [PYTHON_SCRIPT_PATH] },
    ];

    const tryNext = (index) => {
      if (index >= commands.length) {
        reject(new Error('No Python runtime available for autocomplete script'));
        return;
      }

      const current = commands[index];
      const child = execFile(
        current.cmd,
        current.args,
        {
          timeout: 4500,
          maxBuffer: 1024 * 1024,
          env: {
            ...process.env,
            OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'deepseek-v3.1:671b-cloud',
          },
        },
        (error, stdout) => {
          if (error) {
            tryNext(index + 1);
            return;
          }

          try {
            const parsed = JSON.parse(String(stdout || '{}'));
            const ranked = Array.isArray(parsed.suggestions)
              ? parsed.suggestions.map((item) => String(item).trim()).filter(Boolean)
              : [];
            resolve(uniqueLimited(ranked, topK));
          } catch (parseError) {
            tryNext(index + 1);
          }
        },
      );

      child.stdin.write(payload);
      child.stdin.end();
    };

    tryNext(0);
  });

const rankSuggestions = async ({ field, query, candidates, topK = 20 }) => {
  try {
    const ranked = await runPythonAutocomplete({ field, query, candidates, topK });
    if (ranked.length > 0) {
      return ranked;
    }
  } catch (error) {
    console.warn(`[Autocomplete] Python/Ollama fallback for ${field}:`, error.message);
  }

  return jsRankSuggestions(query, candidates, topK);
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const buildUniqueNameCinPairs = (rows = []) => {
  const seen = new Set();
  const pairs = [];

  rows.forEach((row) => {
    const name = String(row.username || '').trim();
    const cin = String(row.cin_number || '').trim();
    if (!name || !cin) return;

    const key = `${name}__${cin}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ name, cin });
  });

  return pairs;
};

const extractNameHintFromCinQuery = (query) => {
  const source = String(query || '').trim();

  const latinMatch = source.match(/cin\s+(?:of|for|de)?\s*(.+)$/i);
  if (latinMatch && latinMatch[1]) {
    return latinMatch[1].trim();
  }

  const arabicMatch = source.match(/(?:بطاقة|رقم|cin)\s*(?:ل|لل|خاص|of)?\s*(.+)$/i);
  if (arabicMatch && arabicMatch[1]) {
    return arabicMatch[1].trim();
  }

  return source;
};

const flattenObjectEntries = (value, prefix = '') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const entries = [];
  Object.entries(value).forEach(([key, entryValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (entryValue && typeof entryValue === 'object' && !Array.isArray(entryValue)) {
      entries.push(...flattenObjectEntries(entryValue, nextKey));
      return;
    }

    const text = String(entryValue ?? '').trim();
    if (!text) return;
    entries.push({ key: nextKey, value: text });
  });

  return entries;
};

const detectRequestedField = (query) => {
  const source = normalizeText(query);
  if (!source) return '';
  if (/(first\s*name|firstname|الاسم\s*الشخصي|الاسم\s*الاول|prenom)/i.test(source)) return 'first_name';
  if (/(last\s*name|lastname|nom|اللقب|اسم\s*العائلة)/i.test(source)) return 'last_name';
  if (/(certificate\s*number|cert\s*number|رقم\s*الشهادة)/i.test(source)) return 'certificate_number';
  if (/(cin\s*number|identity\s*number|رقم\s*البطاقة|رقم\s*التعريف)/i.test(source)) return 'cin_number';
  return '';
};

const DEFAULT_SETTINGS = {
  key: 'global',
  siteName: 'SmartArchive',
  locale: 'en',
  timezone: 'Africa/Tunis',
  enforce2FA: true,
  sessionTimeout: 30,
  notifyByEmail: true,
  notifyBySms: false,
  autoClassify: true,
  autoVerifyThreshold: 92,
};

const ensureAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  return next();
};

router.use(verifyToken, ensureAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ created_at: -1 }).lean().exec();
    return res.json(
      users.map((user) => ({
        id: user._id,
        username: user.username || '',
        email: user.email || '',
        cin_number: user.cin_number || '',
        role: user.role || 'user',
        is_verified: !!user.is_verified,
        phone: user.phone || '',
        address: user.address || '',
        created_at: user.created_at || null,
        last_login: user.last_login || null,
      })),
    );
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean().exec();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      id: user._id,
      username: user.username || '',
      email: user.email || '',
      cin_number: user.cin_number || '',
      role: user.role || 'user',
      is_verified: !!user.is_verified,
      phone: user.phone || '',
      address: user.address || '',
      created_at: user.created_at || null,
      last_login: user.last_login || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const allowed = ['username', 'email', 'role', 'is_verified', 'phone', 'address'];
    const updates = {};

    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username || '',
        email: user.email || '',
        cin_number: user.cin_number || '',
        role: user.role || 'user',
        is_verified: !!user.is_verified,
        phone: user.phone || '',
        address: user.address || '',
        created_at: user.created_at || null,
        last_login: user.last_login || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const [totalUsers, verifiedUsers, totalDocuments, documentsToday] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ is_verified: true }),
      DocumentRecord.countDocuments({}),
      DocumentRecord.countDocuments({
        created_at: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    return res.json({ totalUsers, verifiedUsers, totalDocuments, documentsToday });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/documents/:id/review', async (req, res) => {
  try {
    const { status, review_note } = req.body;
    const normalizedStatus = String(status || '').toLowerCase();
    const allowed = ['verified', 'rejected', 'pending_review', 'processed'];

    if (!allowed.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid review status' });
    }

    const updates = {
      status: normalizedStatus,
      verification_status: normalizedStatus,
      reviewed_by: String(req.user?._id || ''),
      review_note: review_note || '',
      reviewed_at: new Date(),
      requires_admin_review: normalizedStatus !== 'verified',
      updated_at: new Date(),
    };

    const document = await DocumentRecord.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    )
      .lean()
      .exec();

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    return res.json({ success: true, document });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/suggestions', async (req, res) => {
  try {
    const nameQuery = String(req.query.nameQuery || '').trim();
    const cinQuery = String(req.query.cinQuery || '').trim();

    const query = {};
    if (nameQuery) {
      query.username = { $regex: nameQuery, $options: 'i' };
    }
    if (cinQuery) {
      query.cin_number = { $regex: cinQuery, $options: 'i' };
    }

    const [docs, userRows] = await Promise.all([
      DocumentRecord.find(query)
        .select('username cin_number')
        .sort({ created_at: -1 })
        .limit(600)
        .lean()
        .exec(),
      User.find({})
        .select('username cin_number')
        .limit(400)
        .lean()
        .exec(),
    ]);

    const allNames = uniqueLimited([
      ...docs.map((doc) => doc.username),
      ...userRows.map((user) => user.username),
    ], 400);
    const allCins = uniqueLimited([
      ...docs.map((doc) => doc.cin_number),
      ...userRows.map((user) => user.cin_number),
    ], 400);

    const [uniqueNames, uniqueCins] = await Promise.all([
      rankSuggestions({ field: 'name', query: nameQuery, candidates: allNames, topK: 20 }),
      rankSuggestions({ field: 'cin', query: cinQuery, candidates: allCins, topK: 20 }),
    ]);

    return res.json({
      names: uniqueNames,
      cins: uniqueCins,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/text-autocomplete', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const topK = Math.min(Math.max(parseInt(req.query.topK, 10) || 8, 1), 20);

    const docs = await DocumentRecord.find({})
      .select('username cin_number type document_type status detected_language')
      .sort({ created_at: -1 })
      .limit(200)
      .lean()
      .exec();

    const names = uniqueLimited(docs.map((doc) => doc.username), 100);
    const cins = uniqueLimited(docs.map((doc) => doc.cin_number), 100);
    const types = uniqueLimited(docs.map((doc) => doc.type || doc.document_type), 30);
    const statuses = uniqueLimited(docs.map((doc) => doc.status), 20);
    const languages = uniqueLimited(docs.map((doc) => doc.detected_language), 10);

    const sentenceCandidates = [
      'Executive summary of archive quality and compliance for this period.',
      'Documents requiring manual review should be prioritized by risk and age.',
      'Most recurring extraction errors involve CIN number formatting and name normalization.',
      'Recommended action is to verify low confidence records before final validation.',
      'System performance remains stable with consistent document processing throughput.',
      ...names.map((name) => `User ${name} has recent archive activity requiring review.`),
      ...cins.map((cin) => `CIN ${cin} appears in recent document processing logs.`),
      ...types.map((type) => `Document type ${type} is represented in this reporting window.`),
      ...statuses.map((status) => `Current workflow status includes ${status} records.`),
      ...languages.map((language) => `Detected language trend includes ${language} documents.`),
    ];

    const suggestions = await rankSuggestions({
      field: 'report_text',
      query: q,
      candidates: sentenceCandidates,
      topK,
    });

    return res.json({ suggestions });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/token-autocomplete', async (req, res) => {
  try {
    const draft = String(req.query.q || '').trim();
    const fragment = String(req.query.fragment || '').trim();
    const selectedUser = String(req.query.selectedUser || '').trim();
    const selectedCin = String(req.query.selectedCin || '').trim();
    const topK = Math.min(Math.max(parseInt(req.query.topK, 10) || 8, 1), 20);

    const words = draft.toLowerCase().split(/\s+/).filter(Boolean);
    const tail = words.slice(-8).join(' ');

    let intent = 'generic';
    if (/(first\s*name|last\s*name|firstname|lastname|الاسم|اللقب|prenom|nom)/i.test(tail)) {
      intent = 'keyvalue';
    } else if (/(certificate|certificat|cert)/i.test(tail)) {
      intent = 'certificate';
    } else if (/\bcin\b/i.test(tail)) {
      intent = 'cin';
    } else if (/\buser\b|\bname\b/i.test(tail)) {
      intent = 'user';
    }

    const docQuery = {};
    if (selectedUser) {
      docQuery.username = { $regex: selectedUser, $options: 'i' };
    }
    if (selectedCin) {
      docQuery.cin_number = { $regex: selectedCin, $options: 'i' };
    }

    const [docs, users] = await Promise.all([
      DocumentRecord.find(docQuery)
        .select('username cin_number extracted_data')
        .sort({ created_at: -1 })
        .lean()
        .exec(),
      User.find({})
        .select('username cin_number')
        .lean()
        .exec(),
    ]);

    const allNameCinPairs = buildUniqueNameCinPairs([...users, ...docs]);

    const candidateNames = uniqueLimited([
      ...docs.map((doc) => doc.username),
      ...users.map((user) => user.username),
    ], 300);

    const candidateCins = uniqueLimited([
      ...docs.map((doc) => doc.cin_number),
      ...users.map((user) => user.cin_number),
    ], 300);

    const certificateCandidates = uniqueLimited(
      docs.flatMap((doc) => {
        const entities = doc.extracted_data || {};
        const certNo =
          entities.certificate_number ||
          entities.certificate_no ||
          entities.cert_number ||
          entities.number ||
          '';
        if (!certNo) {
          return [];
        }

        const owner = doc.username || entities.full_name || entities.name || 'Unknown';
        return [
          `${owner} - ${certNo}`,
          `${certNo}`,
        ];
      }),
      400,
    );

    const keyValueCandidates = uniqueLimited([
      ...users.flatMap((user) => {
        const base = {
          username: user.username || '',
          cin_number: user.cin_number || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
        };

        return flattenObjectEntries(base).flatMap((entry) => {
          const owner = String(user.username || '').trim();
          const cin = String(user.cin_number || '').trim();
          return [
            `${entry.key}: ${entry.value}`,
            `${entry.value} -> ${entry.key}`,
            owner ? `${owner} | ${entry.key}: ${entry.value}` : '',
            cin ? `${cin} -> ${entry.key}: ${entry.value}` : '',
          ];
        });
      }),
      ...docs.flatMap((doc) => {
        const owner = String(doc.username || '').trim();
        const cin = String(doc.cin_number || '').trim();
        const flatEntries = flattenObjectEntries(doc.extracted_data || {});

        return flatEntries.flatMap((entry) => [
          `${entry.key}: ${entry.value}`,
          `${entry.value} -> ${entry.key}`,
          owner ? `${owner} | ${entry.key}: ${entry.value}` : '',
          cin ? `${cin} -> ${entry.key}: ${entry.value}` : '',
        ]);
      }),
    ], 3000);

    const queryForRank = fragment || draft;
    const requestedField = detectRequestedField(draft || queryForRank);

    let suggestions = [];
    if (intent === 'user') {
      suggestions = await rankSuggestions({
        field: 'user',
        query: queryForRank,
        candidates: candidateNames,
        topK,
      });
    } else if (intent === 'cin') {
      const nameHint = extractNameHintFromCinQuery(draft || queryForRank);
      const normalizedHint = normalizeText(nameHint);
      const cinHintLooksNumeric = /^[0-9A-Za-z-]+$/.test(String(queryForRank || '').trim());

      if (normalizedHint && !cinHintLooksNumeric) {
        const cinByNameCandidates = uniqueLimited(
          allNameCinPairs
            .filter((pair) => normalizeText(pair.name).includes(normalizedHint))
            .flatMap((pair) => [`${pair.name} - ${pair.cin}`, pair.cin]),
          200,
        );

        if (cinByNameCandidates.length > 0) {
          suggestions = await rankSuggestions({
            field: 'cin_by_name',
            query: nameHint,
            candidates: cinByNameCandidates,
            topK,
          });
        }
      }

      if (suggestions.length === 0) {
        suggestions = await rankSuggestions({
          field: 'cin',
          query: queryForRank,
          candidates: candidateCins,
          topK,
        });
      }
    } else if (intent === 'certificate') {
      suggestions = await rankSuggestions({
        field: 'certificate',
        query: queryForRank,
        candidates: certificateCandidates,
        topK,
      });
    } else if (intent === 'keyvalue') {
      const focusedCandidates = requestedField
        ? keyValueCandidates.filter((value) => normalizeText(value).includes(requestedField))
        : keyValueCandidates;

      suggestions = await rankSuggestions({
        field: 'keyvalue',
        query: draft || queryForRank,
        candidates: focusedCandidates.length > 0 ? focusedCandidates : keyValueCandidates,
        topK,
      });
    } else {
      const mixed = uniqueLimited([
        ...candidateNames.slice(0, 80),
        ...candidateCins.slice(0, 80),
        ...certificateCandidates.slice(0, 80),
        ...keyValueCandidates.slice(0, 120),
      ], 240);

      suggestions = await rankSuggestions({
        field: 'report_text_token',
        query: queryForRank,
        candidates: mixed,
        topK,
      });
    }

    return res.json({ intent, suggestions });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    const cin = String(req.query.cin || '').trim();
    const status = String(req.query.status || '').trim();

    const query = {};
    if (name) {
      query.username = { $regex: name, $options: 'i' };
    }
    if (cin) {
      query.cin_number = { $regex: cin, $options: 'i' };
    }
    if (status) {
      query.status = status;
    }

    const rows = await DocumentRecord.find(query)
      .sort({ created_at: -1 })
      .limit(500)
      .lean()
      .exec();

    return res.json(
      rows.map((doc) => ({
        id: doc._id,
        username: doc.username || '',
        cin_number: doc.cin_number || '',
        filename: doc.filename || '',
        type: doc.type || doc.document_type || 'unknown',
        status: doc.status || 'pending_review',
        quality_score: Number.isFinite(doc.quality_score) ? doc.quality_score : 0,
        detected_language: doc.detected_language || 'unknown',
        created_at: doc.created_at || null,
      })),
    );
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/logs', async (req, res) => {
  return res.json([]);
});

router.get('/settings', async (req, res) => {
  try {
    let settings = await AdminSettings.findOne({ key: 'global' }).lean().exec();

    if (!settings) {
      const created = await AdminSettings.create(DEFAULT_SETTINGS);
      settings = created.toObject();
    }

    return res.json({
      siteName: settings.siteName,
      locale: settings.locale,
      timezone: settings.timezone,
      enforce2FA: settings.enforce2FA,
      sessionTimeout: settings.sessionTimeout,
      notifyByEmail: settings.notifyByEmail,
      notifyBySms: settings.notifyBySms,
      autoClassify: settings.autoClassify,
      autoVerifyThreshold: settings.autoVerifyThreshold,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const allowed = [
      'siteName',
      'locale',
      'timezone',
      'enforce2FA',
      'sessionTimeout',
      'notifyByEmail',
      'notifyBySms',
      'autoClassify',
      'autoVerifyThreshold',
    ];

    const updates = {};
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    let settings = await AdminSettings.findOne({ key: 'global' }).exec();

    if (!settings) {
      settings = new AdminSettings({
        ...DEFAULT_SETTINGS,
        ...updates,
        key: 'global',
        updatedBy: req.user ? String(req.user._id) : '',
      });
      await settings.save();
    } else {
      Object.assign(settings, updates, {
        updatedBy: req.user ? String(req.user._id) : '',
      });
      await settings.save();
    }

    return res.json({
      success: true,
      settings: {
        siteName: settings.siteName,
        locale: settings.locale,
        timezone: settings.timezone,
        enforce2FA: settings.enforce2FA,
        sessionTimeout: settings.sessionTimeout,
        notifyByEmail: settings.notifyByEmail,
        notifyBySms: settings.notifyBySms,
        autoClassify: settings.autoClassify,
        autoVerifyThreshold: settings.autoVerifyThreshold,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
