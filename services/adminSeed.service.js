const Admin = require('../models/Admin');

const DEFAULT_ADMIN = {
  email: 'mondhermekni1940@gmail.com',
  password: 'U2FsdGVkX186vxCEmo7nw95hG3P1t5IBYonCtjCuREY=',
  username: 'admin',
  first_name: null,
  last_name: null,
  full_name: null,
  role: 'admin',
  is_verified: true,
  verified_at: null,
  last_login: null,
  cin_number: '09893423',
  phone: '',
  address: '',
  date_of_birth: '',
  bio: '',
  avatar: '',
};

const ensureStaticAdmin = async () => {
  const adminMatch = {
    $or: [
      { cin_number: DEFAULT_ADMIN.cin_number },
      { email: DEFAULT_ADMIN.email.toLowerCase() },
    ],
  };

  await Admin.findOneAndUpdate(
    adminMatch,
    { $set: DEFAULT_ADMIN },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();

  console.log('✅ Static admin synchronized in Admin collections');
};

module.exports = { ensureStaticAdmin };
