require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'system_settings_db',
    port: process.env.DB_PORT || 3306
  },
  jwtSecret: process.env.JWT_SECRET || 'secret-jwt-token-key-change-in-production',
  licenseSecret: process.env.LICENSE_SECRET || 'license-validation-secret-key-12345'
};
