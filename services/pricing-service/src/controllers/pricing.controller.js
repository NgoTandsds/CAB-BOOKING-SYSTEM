const pricingService = require('../services/pricing.service');

exports.calculate = async (req, res) => {
  try {
    const data = await pricingService.calculate(req.body);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getSurge = async (req, res) => {
  try {
    const surge = await pricingService.getSurge(req.query.area || 'default');
    res.json({ success: true, data: { area: req.query.area || 'default', surgeMultiplier: surge } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateSurge = async (req, res) => {
  try {
    const { area = 'default', demandIndex, supplyIndex } = req.body;
    const surge = await pricingService.updateSurge(area, demandIndex, supplyIndex);
    res.json({ success: true, data: { area, surgeMultiplier: surge } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
