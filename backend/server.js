const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');
const licenseHelper = require('./licenseHelper');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const initializeDatabase = require('./db_init');

const app = express();

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware to verify JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid.' });
    }
    req.user = user;
    next();
  });
};

/**
 * Endpoint to generate a license key.
 * This is used by our frontend license utility tool to make testing easy.
 */
app.post('/api/generate-key', (req, res) => {
  const { org_name, domain_name, valid_from, valid_to } = req.body;
  
  if (!org_name || !domain_name || !valid_from || !valid_to) {
    return res.status(400).json({ error: 'All parameters (org_name, domain_name, valid_from, valid_to) are required.' });
  }

  try {
    const key = licenseHelper.generateLicenseKey(org_name, domain_name, valid_from, valid_to);
    res.json({ license_key: key });
  } catch (error) {
    console.error('Error generating key:', error);
    res.status(500).json({ error: 'Failed to generate license key.' });
  }
});

/**
 * Endpoint to authenticate user and perform license validation on login
 */
app.post('/api/login', async (req, res) => {
  const { username, password, clientDomain } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // 1. Determine client domain (prioritize clientDomain parameter, fallback to headers)
  const currentDomain = clientDomain || req.headers.host || req.hostname;
  console.log(`Login attempt: user=${username}, domain=${currentDomain}`);

  try {
    // 2. Authenticate credentials
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = users[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // 3. Retrieve system settings to check license
    const [settingsRows] = await db.query('SELECT * FROM system_settings LIMIT 1');
    
    // If no settings exist yet (bootstrap mode), allow login to let them configure it
    if (settingsRows.length === 0) {
      const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: '1h' });
      return res.json({
        token,
        username: user.username,
        warning: 'No system settings found. Please configure settings and license key immediately.',
        licenseStatus: { active: false, reason: 'unconfigured' }
      });
    }

    const settings = settingsRows[0];

    // Verification A: Domain match
    const domainMatch = licenseHelper.verifyDomain(settings.domain_name, currentDomain);
    if (!domainMatch) {
      console.warn(`License domain mismatch: Saved domain="${settings.domain_name}" vs Current domain="${currentDomain}"`);
      return res.status(403).json({ 
        error: 'Invalid license for this domain.',
        code: 'DOMAIN_MISMATCH',
        details: { saved: settings.domain_name, current: currentDomain }
      });
    }

    // Verification B: Expiry verification
    const expiryStatus = licenseHelper.verifyExpiry(settings.valid_from, settings.valid_to);
    if (!expiryStatus.isValid) {
      console.warn(`License expired/inactive: ${expiryStatus.message}`);
      return res.status(403).json({ 
        error: expiryStatus.message,
        code: 'LICENSE_EXPIRED',
        details: { validFrom: settings.valid_from, validTo: settings.valid_to }
      });
    }

    // Verification C: Key integrity check
    const isKeyValid = licenseHelper.verifyLicenseKey(
      settings.org_name,
      settings.domain_name,
      settings.valid_from,
      settings.valid_to,
      settings.license_key
    );

    if (!isKeyValid) {
      console.warn('License key integrity check failed!');
      return res.status(403).json({ 
        error: 'Invalid license key. The key does not match the organization details or domain.',
        code: 'INVALID_LICENSE_KEY'
      });
    }

    // All validation passed, generate JWT token
    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: '2h' });
    
    res.json({
      token,
      username: user.username,
      licenseStatus: {
        active: true,
        orgName: settings.org_name,
        domainName: settings.domain_name,
        validTo: settings.valid_to
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

/**
 * Endpoint to retrieve current system settings
 */
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const [settingsRows] = await db.query('SELECT * FROM system_settings LIMIT 1');
    if (settingsRows.length === 0) {
      return res.json(null);
    }
    
    const settings = settingsRows[0];
    
    // We also compute the current license health status for frontend info display
    const currentDomain = req.headers.host || req.hostname;
    const isDomainMatch = licenseHelper.verifyDomain(settings.domain_name, currentDomain);
    const expiryStatus = licenseHelper.verifyExpiry(settings.valid_from, settings.valid_to);
    const isKeyValid = licenseHelper.verifyLicenseKey(
      settings.org_name,
      settings.domain_name,
      settings.valid_from,
      settings.valid_to,
      settings.license_key
    );

    res.json({
      ...settings,
      health: {
        domainMatch: isDomainMatch,
        dateValid: expiryStatus.isValid,
        expiryMessage: expiryStatus.message || null,
        keyIntegrityValid: isKeyValid
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to retrieve system settings.' });
  }
});

/**
 * Endpoint to save or update system settings
 */
app.post('/api/settings', authenticateToken, async (req, res) => {
  const { 
    org_name, 
    contact_number, 
    email_address, 
    domain_name, 
    address, 
    valid_from, 
    valid_to, 
    license_key,
    clientDomain 
  } = req.body;

  // Validate required fields
  if (!org_name || !contact_number || !email_address || !domain_name || !address || !valid_from || !valid_to || !license_key) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // 1. Domain Match Check: Entered domain must match the current website domain
  const currentDomain = clientDomain || req.headers.host || req.hostname;
  const isDomainMatch = licenseHelper.verifyDomain(domain_name, currentDomain);
  if (!isDomainMatch) {
    return res.status(400).json({ 
      error: `Domain Name entered (${domain_name}) must match the current website domain (${licenseHelper.normalizeDomain(currentDomain)}).` 
    });
  }

  // 2. License Key Integrity validation
  const isKeyValid = licenseHelper.verifyLicenseKey(
    org_name,
    domain_name,
    valid_from,
    valid_to,
    license_key
  );

  if (!isKeyValid) {
    return res.status(400).json({ 
      error: 'License Key validation failed. The license key is invalid for the provided Organization, Domain, and Date ranges.' 
    });
  }

  try {
    const [settingsRows] = await db.query('SELECT id FROM system_settings LIMIT 1');
    const cleanValidFrom = licenseHelper.formatDateString(valid_from);
    const cleanValidTo = licenseHelper.formatDateString(valid_to);

    if (settingsRows.length === 0) {
      // Create new settings (Add)
      await db.query(`
        INSERT INTO system_settings 
        (org_name, contact_number, email_address, domain_name, address, valid_from, valid_to, license_key) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [org_name, contact_number, email_address, domain_name, address, cleanValidFrom, cleanValidTo, license_key]);
      
      return res.json({ message: 'System settings added successfully!' });
    } else {
      // Update existing settings (Edit & Save)
      const settingsId = settingsRows[0].id;
      await db.query(`
        UPDATE system_settings 
        SET org_name = ?, contact_number = ?, email_address = ?, domain_name = ?, address = ?, valid_from = ?, valid_to = ?, license_key = ?
        WHERE id = ?
      `, [org_name, contact_number, email_address, domain_name, address, cleanValidFrom, cleanValidTo, license_key, settingsId]);

      return res.json({ message: 'System settings updated successfully!' });
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save system settings.' });
  }
});

/**
 * Endpoint to retrieve current email settings
 */
app.get('/api/email-settings', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM email_settings LIMIT 1');
    if (rows.length === 0) {
      return res.json(null);
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to retrieve email settings.' });
  }
});

/**
 * Endpoint to save or update email settings
 */
app.post('/api/email-settings', authenticateToken, async (req, res) => {
  const {
    smtp_name,
    smtp_host,
    smtp_port,
    smtp_security,
    imap_name,
    imap_host,
    imap_port,
    imap_security
  } = req.body;

  if (
    !smtp_name ||
    !smtp_host ||
    !smtp_port ||
    !smtp_security ||
    !imap_name ||
    !imap_host ||
    !imap_port ||
    !imap_security
  ) {
    return res.status(400).json({ error: 'All email settings fields are required.' });
  }

  const smtpPortNum = Number(smtp_port);
  const imapPortNum = Number(imap_port);
  const allowedSecurity = ['SSL', 'TLS', 'None'];

  if (!Number.isInteger(smtpPortNum) || smtpPortNum < 1 || smtpPortNum > 65535) {
    return res.status(400).json({ error: 'SMTP port must be a valid integer between 1 and 65535.' });
  }

  if (!Number.isInteger(imapPortNum) || imapPortNum < 1 || imapPortNum > 65535) {
    return res.status(400).json({ error: 'IMAP port must be a valid integer between 1 and 65535.' });
  }

  if (!allowedSecurity.includes(smtp_security)) {
    return res.status(400).json({ error: 'Invalid SMTP security type.' });
  }

  if (!allowedSecurity.includes(imap_security)) {
    return res.status(400).json({ error: 'Invalid IMAP security type.' });
  }

  try {
    const [rows] = await db.query('SELECT id FROM email_settings LIMIT 1');
    if (rows.length === 0) {
      await db.query(
        `INSERT INTO email_settings
          (smtp_name, smtp_host, smtp_port, smtp_security, imap_name, imap_host, imap_port, imap_security)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          smtp_name.trim(),
          smtp_host.trim(),
          smtpPortNum,
          smtp_security,
          imap_name.trim(),
          imap_host.trim(),
          imapPortNum,
          imap_security
        ]
      );
      return res.json({ message: 'Email settings added successfully!' });
    }

    const settingsId = rows[0].id;
    await db.query(
      `UPDATE email_settings
        SET smtp_name = ?, smtp_host = ?, smtp_port = ?, smtp_security = ?, imap_name = ?, imap_host = ?, imap_port = ?, imap_security = ?
        WHERE id = ?`,
      [
        smtp_name.trim(),
        smtp_host.trim(),
        smtpPortNum,
        smtp_security,
        imap_name.trim(),
        imap_host.trim(),
        imapPortNum,
        imap_security,
        settingsId
      ]
    );

    return res.json({ message: 'Email settings updated successfully!' });
  } catch (error) {
    console.error('Error saving email settings:', error);
    res.status(500).json({ error: 'Failed to save email settings.' });
  }
});

/**
 * Endpoint to retrieve current school settings
 */
app.get('/api/school-settings', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM school_settings LIMIT 1');
    if (rows.length === 0) {
      return res.json(null);
    }

    const row = rows[0];
    const logoUrl = row.school_logo ? `${req.protocol}://${req.get('host')}/uploads/${row.school_logo}` : '';
    res.json({
      id: row.id,
      school_name: row.school_name,
      email_address: row.email_address,
      contact_number: row.contact_number,
      school_logo: logoUrl,
      updated_at: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching school settings:', error);
    res.status(500).json({ error: 'Failed to retrieve school settings.' });
  }
});

/**
 * Endpoint to save or update school settings with logo upload support
 */
app.post('/api/school-settings', authenticateToken, upload.single('school_logo'), async (req, res) => {
  console.log('School settings POST request received. Body:', req.body);
  console.log('File upload:', req.file);
  
  const { school_name, email_address, contact_number } = req.body;

  if (!school_name || !email_address || !contact_number) {
    console.error('Validation failed: Missing required fields');
    return res.status(400).json({ error: 'School Name, Email Address, and Contact Number are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9\s-]{7,20}$/;

  if (!emailRegex.test(email_address)) {
    console.error('Validation failed: Invalid email -', email_address);
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  if (!phoneRegex.test(contact_number)) {
    console.error('Validation failed: Invalid phone -', contact_number, 'Regex:', phoneRegex);
    return res.status(400).json({ error: 'Enter a valid contact number.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM school_settings LIMIT 1');
    console.log('Database query result. Existing rows:', rows.length);
    
    let schoolLogoFilename = rows.length > 0 ? rows[0].school_logo : null;

    if (req.file) {
      console.log('New file uploaded:', req.file.filename);
      schoolLogoFilename = req.file.filename;
      if (rows.length > 0 && rows[0].school_logo) {
        const existingFile = path.join(uploadDir, rows[0].school_logo);
        if (fs.existsSync(existingFile)) {
          fs.unlinkSync(existingFile);
          console.log('Old logo file deleted:', rows[0].school_logo);
        }
      }
    }

    if (rows.length === 0) {
      console.log('Inserting new school settings...');
      await db.query(
        `INSERT INTO school_settings (school_name, email_address, contact_number, school_logo)
         VALUES (?, ?, ?, ?)`,
        [school_name.trim(), email_address.trim(), contact_number.trim(), schoolLogoFilename]
      );
      console.log('School settings inserted successfully');
    } else {
      console.log('Updating existing school settings...');
      await db.query(
        `UPDATE school_settings
         SET school_name = ?, email_address = ?, contact_number = ?, school_logo = ?
         WHERE id = ?`,
        [school_name.trim(), email_address.trim(), contact_number.trim(), schoolLogoFilename, rows[0].id]
      );
      console.log('School settings updated successfully');
    }

    const logoUrl = schoolLogoFilename ? `${req.protocol}://${req.get('host')}/uploads/${schoolLogoFilename}` : '';
    console.log('Sending response with logoUrl:', logoUrl);
    
    res.json({
      message: 'School settings saved successfully!',
      school_name: school_name.trim(),
      email_address: email_address.trim(),
      contact_number: contact_number.trim(),
      school_logo: logoUrl
    });
  } catch (error) {
    console.error('Error saving school settings:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to save school settings.' });
  }
});

// Serve frontend static files
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

initializeDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Backend server running on port ${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization failed. Server not started.', err);
    process.exit(1);
  });
