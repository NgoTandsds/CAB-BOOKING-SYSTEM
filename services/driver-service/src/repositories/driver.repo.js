const Driver = require('../models/driver.model');
const { Op } = require('sequelize');

exports.create = (data) => Driver.create(data);
exports.findByAuthId = (authId) => Driver.findOne({ where: { authId } });
exports.findById = (id) => Driver.findByPk(id);
exports.update = (authId, data) => Driver.update(data, { where: { authId }, returning: true });
exports.updateById = (id, data) => Driver.update(data, { where: { id }, returning: true });
exports.findAll = () => Driver.findAll({ order: [['createdAt', 'DESC']] });
exports.findAvailableNearby = (lat, lng, delta = 0.15) =>
  Driver.findAll({
    where: {
      isAvailable: true, status: 'AVAILABLE',
      latitude: { [Op.between]: [lat - delta, lat + delta] },
      longitude: { [Op.between]: [lng - delta, lng + delta] },
    },
  });
