const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('./config');
const licenseHelper = require('./licenseHelper');

async function initializeDatabase() {
  console.log('Initializing database setup...');
  
  // Establish connection without database first (to create db if needed)
  const connection = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    port: config.db.port
  });

  try {
    // 1. Create database
    console.log(`Creating database "${config.db.database}" if it does not exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\``);
    await connection.query(`USE \`${config.db.database}\``);

    // 2. Create system_settings table
    console.log('Creating "system_settings" table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`system_settings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`org_name\` VARCHAR(255) NOT NULL,
        \`contact_number\` VARCHAR(50) NOT NULL,
        \`email_address\` VARCHAR(255) NOT NULL,
        \`domain_name\` VARCHAR(255) NOT NULL,
        \`address\` TEXT NOT NULL,
        \`valid_from\` DATE NOT NULL,
        \`valid_to\` DATE NOT NULL,
        \`license_key\` VARCHAR(255) NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Create email_settings table
    console.log('Creating "email_settings" table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`email_settings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`smtp_name\` VARCHAR(255) NOT NULL,
        \`smtp_host\` VARCHAR(255) NOT NULL,
        \`smtp_port\` INT NOT NULL,
        \`smtp_security\` VARCHAR(10) NOT NULL,
        \`imap_name\` VARCHAR(255) NOT NULL,
        \`imap_host\` VARCHAR(255) NOT NULL,
        \`imap_port\` INT NOT NULL,
        \`imap_security\` VARCHAR(10) NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Create school_settings table
    console.log('Creating "school_settings" table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`school_settings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`school_name\` VARCHAR(255) NOT NULL,
        \`email_address\` VARCHAR(255) NOT NULL,
        \`contact_number\` VARCHAR(50) NOT NULL,
        \`school_logo\` VARCHAR(255),
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Create users table
    console.log('Creating "users" table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(100) NOT NULL UNIQUE,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Checking for default admin user...');
    const [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (users.length === 0) {
      console.log('Seeding admin user: username: admin, password: password123');
      const hash = bcrypt.hashSync('password123', 10);
      await connection.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    } else {
      console.log('Admin user already exists.');
    }

    // 5. Seed default settings if empty
    console.log('Checking for existing system settings...');
    const [settings] = await connection.query('SELECT * FROM system_settings LIMIT 1');
    if (settings.length === 0) {
      console.log('Seeding initial system settings...');
      
      const orgName = 'Acme Corporation';
      const contactNumber = '+1 (555) 019-2834';
      const emailAddress = 'support@acme.com';
      const domainName = 'localhost';
      const address = '123 Tech Lane, Silicon Valley, CA 94025';
      const validFrom = licenseHelper.formatDateString(new Date()); // Today
      
      // Valid for 1 year from now
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const validTo = licenseHelper.formatDateString(nextYear);
      
      // Dynamically compute the valid license key
      const licenseKey = licenseHelper.generateLicenseKey(orgName, domainName, validFrom, validTo);

      await connection.query(`
        INSERT INTO system_settings 
        (org_name, contact_number, email_address, domain_name, address, valid_from, valid_to, license_key) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [orgName, contactNumber, emailAddress, domainName, address, validFrom, validTo, licenseKey]);

      console.log('Initial system settings seeded with key:', licenseKey);
    } else {
      console.log('System settings already exist.');
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Execute if run directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initializeDatabase;
