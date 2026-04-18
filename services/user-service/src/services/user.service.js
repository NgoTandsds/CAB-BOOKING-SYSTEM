const userRepo = require('../repositories/user.repo');

exports.getProfile = async (authId) => {
  const profile = await userRepo.findByAuthId(authId);
  if (!profile) { const e = new Error('Profile not found'); e.status = 404; throw e; }
  return profile;
};

exports.updateProfile = async (authId, data) => {
  const [, profile] = await userRepo.upsert(authId, data);
  return profile;
};

exports.getUserById = async (id) => {
  const profile = await userRepo.findByAuthId(id);
  if (!profile) { const e = new Error('User not found'); e.status = 404; throw e; }
  return profile;
};

exports.getAllUsers = async () => userRepo.findAll();
