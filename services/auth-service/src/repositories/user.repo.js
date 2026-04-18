const User = require('../models/user.model');

exports.findByEmail = (email) => User.findOne({ where: { email } });
exports.findById = (id) => User.findByPk(id);
exports.createUser = (data) => User.create(data);
exports.updateRefreshToken = (id, token) => User.update({ refreshToken: token }, { where: { id } });
exports.clearRefreshToken = (id) => User.update({ refreshToken: null }, { where: { id } });
