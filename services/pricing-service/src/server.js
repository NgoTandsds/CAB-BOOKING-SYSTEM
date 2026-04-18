require('./tracing'); // OpenTelemetry must load first
require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`[pricing-service] Running on port ${PORT}`));
