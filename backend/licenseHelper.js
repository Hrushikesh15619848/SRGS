const crypto = require('crypto');
const config = require('./config');

/**
 * Format date to YYYY-MM-DD
 */
function formatDateString(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates an HMAC-SHA256 signature for the licensing options
 */
function generateLicenseKey(orgName, domainName, validFrom, validTo) {
  if (!orgName || !domainName || !validFrom || !validTo) {
    return '';
  }
  const cleanOrg = orgName.trim();
  const cleanDomain = domainName.trim().toLowerCase();
  const cleanValidFrom = formatDateString(validFrom);
  const cleanValidTo = formatDateString(validTo);

  const payload = `${cleanOrg}|${cleanDomain}|${cleanValidFrom}|${cleanValidTo}`;
  
  return crypto
    .createHmac('sha256', config.licenseSecret)
    .update(payload)
    .digest('hex')
    .toUpperCase();
}

/**
 * Verifies if the provided key matches the generated HMAC signature
 */
function verifyLicenseKey(orgName, domainName, validFrom, validTo, keyToVerify) {
  if (!keyToVerify) return false;
  const computed = generateLicenseKey(orgName, domainName, validFrom, validTo);
  return computed === keyToVerify.trim().toUpperCase();
}

/**
 * Standardize host/domain names by removing protocol, port numbers and path info
 */
function normalizeDomain(host) {
  if (!host) return '';
  let clean = host.trim().toLowerCase();
  
  // Remove protocol if present
  if (clean.includes('://')) {
    clean = clean.split('://')[1];
  }
  
  // Remove path/query if present
  clean = clean.split('/')[0];
  
  // Remove port if present
  clean = clean.split(':')[0];
  
  // Map 127.0.0.1 to localhost for convenience
  if (clean === '127.0.0.1') {
    clean = 'localhost';
  }
  
  return clean;
}

/**
 * Verifies if a domain matches. Special exception for local development:
 * localhost matches 127.0.0.1.
 */
function verifyDomain(savedDomain, currentDomain) {
  const normSaved = normalizeDomain(savedDomain);
  const normCurrent = normalizeDomain(currentDomain);
  
  if (!normSaved || !normCurrent) return false;
  return normSaved === normCurrent;
}

/**
 * Verifies if the license date is valid (i.e. not expired and active)
 */
function verifyExpiry(validFrom, validTo) {
  const todayStr = formatDateString(new Date());
  const fromStr = formatDateString(validFrom);
  const toStr = formatDateString(validTo);
  
  if (!fromStr || !toStr) {
    return { isValid: false, message: 'Invalid license dates.' };
  }

  // Compare as ISO strings (YYYY-MM-DD) which sort chronologically
  if (todayStr < fromStr) {
    return { isValid: false, message: 'License key is not active yet.' };
  }
  
  if (todayStr > toStr) {
    return { isValid: false, message: 'Your license has expired. Please contact the administrator.' };
  }

  return { isValid: true };
}

module.exports = {
  formatDateString,
  generateLicenseKey,
  verifyLicenseKey,
  normalizeDomain,
  verifyDomain,
  verifyExpiry
};
