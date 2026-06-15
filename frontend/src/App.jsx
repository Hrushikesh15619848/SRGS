import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  User,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  ShieldAlert,
  LogOut,
  Edit3,
  Save,
  X,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Menu
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  // Authentication & Navigation State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [currentTab, setCurrentTab] = useState('settings'); // 'settings' | 'email' | 'generator' | 'info'
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(undefined);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    org_name: '',
    contact_number: '',
    email_address: '',
    domain_name: '',
    address: '',
    valid_from: '',
    valid_to: '',
    license_key: ''
  });

  // School Settings State
  const [schoolSettings, setSchoolSettings] = useState(undefined);
  const [loadingSchoolSettings, setLoadingSchoolSettings] = useState(false);
  const [schoolEditMode, setSchoolEditMode] = useState(false);
  const [schoolFormData, setSchoolFormData] = useState({
    school_name: '',
    email_address: '',
    contact_number: '',
    school_logo: ''
  });
  const [schoolLogoFile, setSchoolLogoFile] = useState(null);
  const [schoolLogoPreview, setSchoolLogoPreview] = useState('');

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState(undefined);
  const [loadingEmailSettings, setLoadingEmailSettings] = useState(false);
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    smtp_name: '',
    smtp_host: '',
    smtp_port: '',
    smtp_security: 'SSL',
    imap_name: '',
    imap_host: '',
    imap_port: '',
    imap_security: 'SSL'
  });

  // Generator Utility State
  const [genData, setGenData] = useState({
    org_name: 'Acme Corporation',
    domain_name: 'localhost',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  // Status/Alert State
  const [alert, setAlert] = useState(null); // { type: 'success'|'danger'|'warning', message: '' }
  const [loginError, setLoginError] = useState('');
  const [blockedLicenseError, setBlockedLicenseError] = useState(''); // Holds system block message

  // Clear alerts automatically after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Fetch Settings on load if authenticated
  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchSchoolSettings();
      fetchEmailSettings();
    }
  }, [token]);

  // Format date to YYYY-MM-DD for input fields
  const formatInputDate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  // Fetch settings from API
  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json();
      if (data) {
        setSettings(data);
        setFormData({
          org_name: data.org_name || '',
          contact_number: data.contact_number || '',
          email_address: data.email_address || '',
          domain_name: data.domain_name || '',
          address: data.address || '',
          valid_from: formatInputDate(data.valid_from),
          valid_to: formatInputDate(data.valid_to),
          license_key: data.license_key || ''
        });
        setEditMode(false);
      } else {
        setSettings(null);
        setFormData({
          org_name: '',
          contact_number: '',
          email_address: '',
          domain_name: window.location.hostname || '',
          address: '',
          valid_from: new Date().toISOString().split('T')[0],
          valid_to: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          license_key: ''
        });
        setEditMode(true);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showAlert('danger', 'Could not connect to server to fetch settings.');
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchSchoolSettings = async () => {
    setLoadingSchoolSettings(true);
    try {
      const response = await fetch(`${API_URL}/school-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json();
      if (data) {
        setSchoolSettings(data);
        setSchoolFormData({
          school_name: data.school_name || '',
          email_address: data.email_address || '',
          contact_number: data.contact_number || '',
          school_logo: data.school_logo || ''
        });
        setSchoolLogoPreview(data.school_logo || '');
        setSchoolEditMode(false);
      } else {
        setSchoolSettings(null);
        setSchoolFormData({
          school_name: '',
          email_address: '',
          contact_number: '',
          school_logo: ''
        });
        setSchoolLogoPreview('');
        setSchoolEditMode(true);
      }
    } catch (error) {
      console.error('Error fetching school settings:', error);
      showAlert('danger', 'Could not fetch school settings.');
    } finally {
      setLoadingSchoolSettings(false);
    }
  };

  const fetchEmailSettings = async () => {
    setLoadingEmailSettings(true);
    try {
      const response = await fetch(`${API_URL}/email-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json();
      if (data) {
        setEmailSettings(data);
        setEmailFormData({
          smtp_name: data.smtp_name || '',
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || '',
          smtp_security: data.smtp_security || 'SSL',
          imap_name: data.imap_name || '',
          imap_host: data.imap_host || '',
          imap_port: data.imap_port || '',
          imap_security: data.imap_security || 'SSL'
        });
        setEmailEditMode(false);
      } else {
        setEmailSettings(null);
        setEmailFormData({
          smtp_name: '',
          smtp_host: '',
          smtp_port: '',
          smtp_security: 'SSL',
          imap_name: '',
          imap_host: '',
          imap_port: '',
          imap_security: 'SSL'
        });
        setEmailEditMode(true);
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
      showAlert('danger', 'Could not fetch email settings.');
    } finally {
      setLoadingEmailSettings(false);
    }
  };

  // Show status banner alert
  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\+?[0-9\s-]{7,20}$/;
    return phoneRegex.test(phone);
  };

  const handleSchoolLogoSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('danger', 'Only JPG, JPEG, PNG, and WEBP image files are allowed for school logo.');
      return;
    }

    setSchoolLogoFile(file);
    setSchoolLogoPreview(URL.createObjectURL(file));
  };

  const handleSaveSchoolSettings = async (e) => {
    e.preventDefault();

    if (!schoolFormData.school_name.trim()) {
      showAlert('danger', 'School Name is required.');
      return;
    }

    if (!validateEmail(schoolFormData.email_address)) {
      showAlert('danger', 'Enter a valid email address.');
      return;
    }

    if (!validatePhone(schoolFormData.contact_number)) {
      showAlert('danger', 'Enter a valid contact number.');
      return;
    }

    const formDataPayload = new FormData();
    formDataPayload.append('school_name', schoolFormData.school_name.trim());
    formDataPayload.append('email_address', schoolFormData.email_address.trim());
    formDataPayload.append('contact_number', schoolFormData.contact_number.trim());
    if (schoolLogoFile) {
      formDataPayload.append('school_logo', schoolLogoFile);
    }

    try {
      const response = await fetch(`${API_URL}/school-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataPayload
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setSchoolSettings(data);
        setSchoolFormData({
          school_name: data.school_name || '',
          email_address: data.email_address || '',
          contact_number: data.contact_number || '',
          school_logo: data.school_logo || ''
        });
        setSchoolLogoPreview(data.school_logo || '');
        setSchoolEditMode(false);
        setSchoolLogoFile(null);
        showAlert('success', data.message || 'School settings saved successfully.');
      } else {
        showAlert('danger', data.error || 'Failed to save school settings.');
      }
    } catch (error) {
      console.error('Error saving school settings:', error);
      showAlert('danger', 'Unable to save school settings.');
    }
  };

  // Perform Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setBlockedLicenseError('');

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
          clientDomain: window.location.hostname
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        setToken(data.token);
        setUsername(data.username);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        // Handle license validations
        if (response.status === 403) {
          if (data.code === 'LICENSE_EXPIRED') {
            setBlockedLicenseError('Your license has expired. Please contact the administrator.');
          } else if (data.code === 'DOMAIN_MISMATCH') {
            setBlockedLicenseError('Invalid license for this domain.');
          } else {
            setBlockedLicenseError(data.error || 'Access blocked due to license failure.');
          }
        } else {
          setLoginError(data.error || 'Login failed. Please check credentials.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Could not reach backend. Verify backend is running.');
    }
  };

  // Perform Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    setSettings(null);
    setEditMode(false);
    setBlockedLicenseError('');
  };

  // Save Settings Changes
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setAlert(null);

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          clientDomain: window.location.hostname
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('success', data.message || 'System settings updated successfully!');
        setEditMode(false);
        fetchSettings(); // reload updated details and health status
      } else {
        showAlert('danger', data.error || 'Failed to save settings.');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      showAlert('danger', 'Error connecting to server to save settings.');
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (settings) {
      setFormData({
        org_name: settings.org_name || '',
        contact_number: settings.contact_number || '',
        email_address: settings.email_address || '',
        domain_name: settings.domain_name || '',
        address: settings.address || '',
        valid_from: formatInputDate(settings.valid_from),
        valid_to: formatInputDate(settings.valid_to),
        license_key: settings.license_key || ''
      });
    }
    setEditMode(false);
  };

  const handleCancelEmailEdit = () => {
    if (emailSettings) {
      setEmailFormData({
        smtp_name: emailSettings.smtp_name || '',
        smtp_host: emailSettings.smtp_host || '',
        smtp_port: emailSettings.smtp_port || '',
        smtp_security: emailSettings.smtp_security || 'SSL',
        imap_name: emailSettings.imap_name || '',
        imap_host: emailSettings.imap_host || '',
        imap_port: emailSettings.imap_port || '',
        imap_security: emailSettings.imap_security || 'SSL'
      });
    }
    setEmailEditMode(false);
  };

  const validateEmailSettingsForm = () => {
    const { smtp_name, smtp_host, smtp_port, imap_name, imap_host, imap_port } = emailFormData;
    if (!smtp_name.trim() || !smtp_host.trim() || !smtp_port) {
      showAlert('danger', 'SMTP server name, host, and port are required.');
      return false;
    }
    if (!imap_name.trim() || !imap_host.trim() || !imap_port) {
      showAlert('danger', 'IMAP server name, host, and port are required.');
      return false;
    }
    const smtpPortValue = Number(smtp_port);
    const imapPortValue = Number(imap_port);
    if (!Number.isInteger(smtpPortValue) || smtpPortValue <= 0 || smtpPortValue > 65535) {
      showAlert('danger', 'SMTP port must be a valid integer between 1 and 65535.');
      return false;
    }
    if (!Number.isInteger(imapPortValue) || imapPortValue <= 0 || imapPortValue > 65535) {
      showAlert('danger', 'IMAP port must be a valid integer between 1 and 65535.');
      return false;
    }
    return true;
  };

  const handleSaveEmailSettings = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!validateEmailSettingsForm()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/email-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(emailFormData)
      });

      const data = await response.json();
      if (response.ok) {
        showAlert('success', data.message || 'Email settings saved successfully!');
        setEmailEditMode(false);
        fetchEmailSettings();
      } else {
        showAlert('danger', data.error || 'Failed to save email settings.');
      }
    } catch (error) {
      console.error('Save email settings error:', error);
      showAlert('danger', 'Error connecting to server to save email settings.');
    }
  };

  // Call API to generate a license key
  const handleGenerateKey = async (e) => {
    if (e) e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/generate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(genData)
      });
      const data = await response.json();
      if (response.ok) {
        setGeneratedKey(data.license_key);
        setCopied(false);
      } else {
        showAlert('danger', data.error || 'Failed to generate key.');
      }
    } catch (error) {
      console.error('Error generating key:', error);
      showAlert('danger', 'Failed to reach key generator endpoint.');
    }
  };

  // Preset generators to simplify testing
  const applyPreset = async (type) => {
    const today = new Date().toISOString().split('T')[0];

    let updated = {};
    if (type === 'valid') {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      updated = {
        org_name: 'Acme Corporation',
        domain_name: window.location.hostname || 'localhost',
        valid_from: today,
        valid_to: nextYear.toISOString().split('T')[0]
      };
    } else if (type === 'expired') {
      updated = {
        org_name: 'Acme Corporation',
        domain_name: window.location.hostname || 'localhost',
        valid_from: '2020-01-01',
        valid_to: '2025-01-01'
      };
    } else if (type === 'mismatch') {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      updated = {
        org_name: 'Acme Corporation',
        domain_name: 'invalid-external-domain.com',
        valid_from: today,
        valid_to: nextYear.toISOString().split('T')[0]
      };
    }

    setGenData(updated);

    // Auto-generate key for preset
    try {
      const response = await fetch(`${API_URL}/generate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
      });
      const data = await response.json();
      if (response.ok) {
        setGeneratedKey(data.license_key);
        setCopied(false);
        showAlert('info', `Preset applied. Key generated for domain: ${updated.domain_name}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Copy helper
  const copyToClipboard = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render Blocking License screen
  if (blockedLicenseError) {
    return (
      <div className="blocked-overlay">
        <div className="blocked-card glass-panel">
          <div className="blocked-icon-container">
            <ShieldAlert size={40} />
          </div>
          <h2 className="blocked-title">Access Restricted</h2>
          <p className="blocked-message">{blockedLicenseError}</p>
          <button className="btn btn-secondary" onClick={() => setBlockedLicenseError('')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Render Login screen if not authenticated
  if (!token) {
    return (
      <div className="login-wrapper">
        <div className="login-card glass-panel">
          <div className="login-header">
            <h1 className="login-logo">SRGS (Security Suite)</h1>
            <p className="login-subtitle">System Administration Login</p>
          </div>

          {loginError && (
            <div className="alert alert-danger">
              <ShieldAlert className="alert-icon" size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-grid" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label>Username</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', paddingLeft: '40px' }}
                    placeholder="Enter username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    style={{ width: '100%', paddingLeft: '40px' }}
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <Key size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Authenticate
            </button>
          </form>

          {/* <div style={{ marginTop: '24px', borderTop: '1px dashed var(--border-glass)', paddingTop: '20px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Demo Credentials:
            </p>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
              Username: <span style={{ color: '#fff', fontWeight: 'bold' }}>admin</span> &nbsp;|&nbsp; Password: <span style={{ color: '#fff', fontWeight: 'bold' }}>password123</span>
            </div>
          </div> */}
        </div>
      </div>
    );
  }

  // Get current active license status details
  const getLicenseBadge = () => {
    if (!settings || !settings.health) return null;
    const { domainMatch, dateValid, keyIntegrityValid } = settings.health;

    if (!keyIntegrityValid) {
      return (
        <span className="status-badge expired">
          <span className="badge-dot"></span>
          Corrupted Key
        </span>
      );
    }
    if (!domainMatch) {
      return (
        <span className="status-badge warning">
          <span className="badge-dot"></span>
          Domain Mismatch
        </span>
      );
    }
    if (!dateValid) {
      return (
        <span className="status-badge expired">
          <span className="badge-dot"></span>
          Expired
        </span>
      );
    }
    return (
      <span className="status-badge active">
        <span className="badge-dot"></span>
        Active License
      </span>
    );
  };

  // Main Authenticated Dashboard view
  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      <div className={`mobile-backdrop ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`} style={{ borderRadius: '0' }}>
        <div>
          <div className="brand-section">

            <h2 className="brand-title sidebar-link-text">
              <Settings className="text-primary" /> Admin Panel
            </h2>
          </div>

          <nav className="nav-menu">
            <div
              className={`nav-item ${currentTab === 'school' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('school'); handleCancelEdit(); handleCancelEmailEdit(); setSchoolEditMode(false); setIsMobileMenuOpen(false); }}
            >
              <Building size={18} />
              <span className="sidebar-link-text">
                School Settings
              </span>
            </div>

            <div
              className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => { setCurrentTab('settings'); handleCancelEdit(); setIsMobileMenuOpen(false); }}
            >
              <Settings size={18} />
              <span className="sidebar-link-text">
                System Settings
              </span>
            </div>

          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              <User size={18} className="text-primary" />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{username}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <div className="header-bar">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="page-title">
                {currentTab === 'school' && 'School Settings'}
                {currentTab === 'settings' && 'System Settings'}
                {currentTab === 'email' && 'Email Settings'}
                {currentTab === 'generator' && 'License Key Generator'}
                {currentTab === 'info' && 'Licensing & Host Audit'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                {currentTab === 'school' && 'Manage school profile, contact information, and logo uploads'}
                {currentTab === 'settings' && 'View and modify organization details and active license key'}
                {currentTab === 'email' && 'Configure SMTP and IMAP server settings for application email flows'}
                {currentTab === 'generator' && 'Generate cryptographic license keys for testing system rules'}
                {currentTab === 'info' && 'Audit of currently running domain matching and cryptographic checks'}
              </p>
            </div>
          </div>

          <div className="header-top-right">
            {currentTab === 'school' && (
              <div className="header-action-icons" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="header-menu-btn"
                  onClick={() => { setCurrentTab('email'); handleCancelEdit(); handleCancelEmailEdit(); }}
                  title="Email Settings"
                >
                  <Mail size={16} />
                  <span>Email Settings</span>
                </button>
              </div>
            )}
            {currentTab === 'settings' && (
              <div className="header-action-icons">
                <button
                  type="button"
                  className="header-menu-btn"
                  onClick={() => { setCurrentTab('generator'); handleCancelEdit(); handleCancelEmailEdit(); }}
                  title="License Key Utility"
                >
                  <Key size={16} />
                  <span>License Key Utility</span>
                </button>

                <button
                  type="button"
                  className="header-menu-btn"
                  onClick={() => { setCurrentTab('info'); handleCancelEdit(); handleCancelEmailEdit(); }}
                  title="License Integrity Info"
                >
                  <Info size={16} />
                  <span>License Integrity Info</span>
                </button>
              </div>
            )}
            {getLicenseBadge()}
          </div>
        </div>

        {/* Global Page Banner Alert */}
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.type === 'success' && <CheckCircle className="alert-icon" size={18} />}
            {alert.type === 'danger' && <ShieldAlert className="alert-icon" size={18} />}
            {alert.type === 'warning' && <AlertTriangle className="alert-icon" size={18} />}
            {alert.type === 'info' && <Info className="alert-icon" size={18} />}
            <span>{alert.message}</span>
          </div>
        )}

        {/* TAB 1: School Settings Form */}
        {currentTab === 'school' && (
          <div className="dashboard-grid">
            <div className="settings-card glass-panel">
              <div className="card-title">
                <Building size={20} className="text-primary" /> School Settings Configuration
              </div>

              {loadingSchoolSettings ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '10px' }} />
                  <p>Loading school settings from database...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveSchoolSettings}>
                  <h3 className="form-section-title">School Details</h3>
                  <div className="form-grid two-col">
                    <div className="form-group">
                      <label>School Name</label>
                      <input
                        type="text"
                        required
                        disabled={!schoolEditMode}
                        value={schoolFormData.school_name}
                        onChange={(e) => setSchoolFormData({ ...schoolFormData, school_name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        required
                        disabled={!schoolEditMode}
                        value={schoolFormData.email_address}
                        onChange={(e) => setSchoolFormData({ ...schoolFormData, email_address: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Number</label>
                      <input
                        type="text"
                        required
                        disabled={!schoolEditMode}
                        value={schoolFormData.contact_number}
                        onChange={(e) => setSchoolFormData({ ...schoolFormData, contact_number: e.target.value })}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>School Logo</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {schoolLogoPreview ? (
                          <img
                            src={schoolLogoPreview}
                            alt="School Logo Preview"
                            style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)' }}
                          />
                        ) : (
                          <div style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.18)', color: 'var(--text-secondary)' }}>
                            No logo uploaded
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          disabled={!schoolEditMode}
                          onChange={handleSchoolLogoSelect}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="btn-group">
                    {!schoolEditMode ? (
                      <button type="button" className="btn btn-primary" onClick={() => setSchoolEditMode(true)}>
                        <Edit3 size={16} /> Edit School Settings
                      </button>
                    ) : (
                      <>
                        <button type="button" className="btn btn-secondary" onClick={() => { setSchoolEditMode(false); setSchoolLogoFile(null); if (schoolSettings) setSchoolLogoPreview(schoolSettings.school_logo || ''); }}>
                          <X size={16} /> Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          <Save size={16} /> {schoolSettings ? 'Save School Settings' : 'Add School Settings'}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: System Settings Form */}
        {currentTab === 'settings' && (
          <div className="dashboard-grid">
            <div className="settings-card glass-panel">
              <div className="card-title">
                <Building size={20} className="text-primary" /> Settings Configuration
              </div>
              {loadingSettings ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '10px' }} />
                  <p>Loading system settings from database...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveSettings}>
                  {/* Organization Details Group */}
                  <h3 className="form-section-title">Organization Details</h3>
                  <div className="form-grid two-col">
                    <div className="form-group">
                      <label>Organization Name</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px' }}
                          value={formData.org_name}
                          onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                        />
                        <Building size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Domain Name</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px' }}
                          value={formData.domain_name}
                          onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                        />
                        <Globe size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Contact Number</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px' }}
                          value={formData.contact_number}
                          onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                        />
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="email"
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px' }}
                          value={formData.email_address}
                          onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                        />
                        <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label>Address</label>
                      <div style={{ position: 'relative' }}>
                        <textarea
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px' }}
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                        <MapPin size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </div>

                  {/* License Details Group */}
                  <h3 className="form-section-title">License Details</h3>
                  <div className="form-grid two-col">
                    <div className="form-group">
                      <label>Valid From</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="date"
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px' }}
                          value={formData.valid_from}
                          onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                        />
                        <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Valid To</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="date"
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px' }}
                          value={formData.valid_to}
                          onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                        />
                        <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label>License Key</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          disabled={!editMode}
                          style={{ width: '100%', paddingLeft: '40px', fontFamily: 'monospace' }}
                          value={formData.license_key}
                          placeholder="Paste license key here"
                          onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                        />
                        <Key size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="btn-group">
                    {!editMode ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setEditMode(true)}
                      >
                        <Edit3 size={16} /> Edit Settings
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          <X size={16} /> Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                        >
                          <Save size={16} /> {settings ? 'Save Changes' : 'Add Settings'}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Quick Status / Help pane */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div className="settings-card glass-panel">
                <div className="card-title" style={{ marginBottom: '16px' }}>
                  <Info size={18} className="text-accent" /> Licensing Guide
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  <p style={{ marginBottom: '10px' }}>
                    1. When saving new settings, the backend checks that the entered <strong>Domain Name</strong> matches the running server domain.
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    2. The entered <strong>License Key</strong> is validated cryptographically against organization details, domain, and dates.
                  </p>
                  <p>
                    3. Need a key to test? Use the <strong>License Key Utility</strong> tab in the sidebar to generate keys instantly!
                  </p>
                </div>
              </div>

              {settings && (
                <div className="settings-card glass-panel">
                  <div className="card-title" style={{ marginBottom: '16px' }}>
                    System Context
                  </div>
                  <div className="info-list">
                    <div className="info-item">
                      <span className="info-label">Active Hostname</span>
                      <span className="info-value" style={{ color: 'var(--accent)' }}>{window.location.hostname}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Domain Check</span>
                      <span className={`info-value ${settings.health?.domainMatch ? 'text-primary' : 'text-danger'}`}>
                        {settings.health?.domainMatch ? 'MATCHED' : 'MISMATCHED'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Key Integrity</span>
                      <span className={`info-value ${settings.health?.keyIntegrityValid ? 'text-primary' : 'text-danger'}`}>
                        {settings.health?.keyIntegrityValid ? 'INTEGRAL' : 'CORRUPTED/INVALID'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Time Validity</span>
                      <span className={`info-value ${settings.health?.dateValid ? 'text-primary' : 'text-danger'}`}>
                        {settings.health?.dateValid ? 'ACTIVE' : 'EXPIRED'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Email Settings */}
        {currentTab === 'email' && (
          <div className="dashboard-grid">
            <div className="settings-card glass-panel">
              <div className="card-title">
                <Mail size={20} className="text-primary" /> Email Settings
              </div>

              {loadingEmailSettings ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '10px' }} />
                  <p>Loading email settings from database...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveEmailSettings}>
                  <h3 className="form-section-title">SMTP Configuration</h3>
                  <div className="form-grid two-col">
                    <div className="form-group">
                      <label>SMTP Server Name</label>
                      <input
                        type="text"
                        required
                        disabled={!emailEditMode}
                        value={emailFormData.smtp_name}
                        onChange={(e) => setEmailFormData({ ...emailFormData, smtp_name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>SMTP Host</label>
                      <input
                        type="text"
                        required
                        disabled={!emailEditMode}
                        value={emailFormData.smtp_host}
                        onChange={(e) => setEmailFormData({ ...emailFormData, smtp_host: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>SMTP Port</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="65535"
                        disabled={!emailEditMode}
                        value={emailFormData.smtp_port}
                        onChange={(e) => setEmailFormData({ ...emailFormData, smtp_port: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>SMTP Security Type</label>
                      <select
                        required
                        disabled={!emailEditMode}
                        value={emailFormData.smtp_security}
                        onChange={(e) => setEmailFormData({ ...emailFormData, smtp_security: e.target.value })}
                      >
                        <option value="SSL">SSL</option>
                        <option value="TLS">TLS</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>

                  <h3 className="form-section-title">IMAP Configuration</h3>
                  <div className="form-grid two-col">
                    <div className="form-group">
                      <label>IMAP Server Name</label>
                      <input
                        type="text"
                        required
                        disabled={!emailEditMode}
                        value={emailFormData.imap_name}
                        onChange={(e) => setEmailFormData({ ...emailFormData, imap_name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>IMAP Host</label>
                      <input
                        type="text"
                        required
                        disabled={!emailEditMode}
                        value={emailFormData.imap_host}
                        onChange={(e) => setEmailFormData({ ...emailFormData, imap_host: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>IMAP Port</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="65535"
                        disabled={!emailEditMode}
                        value={emailFormData.imap_port}
                        onChange={(e) => setEmailFormData({ ...emailFormData, imap_port: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>IMAP Security Type</label>
                      <select
                        required
                        disabled={!emailEditMode}
                        value={emailFormData.imap_security}
                        onChange={(e) => setEmailFormData({ ...emailFormData, imap_security: e.target.value })}
                      >
                        <option value="SSL">SSL</option>
                        <option value="TLS">TLS</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>

                  <div className="btn-group">
                    {!emailEditMode ? (
                      <button type="button" className="btn btn-primary" onClick={() => setEmailEditMode(true)}>
                        <Edit3 size={16} /> Edit Email Settings
                      </button>
                    ) : (
                      <>
                        <button type="button" className="btn btn-secondary" onClick={handleCancelEmailEdit}>
                          <X size={16} /> Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                          <Save size={16} /> {emailSettings ? 'Save Email Settings' : 'Add Email Settings'}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: License Key Generator (Admin Sandbox Utility) */}
        {currentTab === 'generator' && (
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="settings-card glass-panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div className="card-title">
                <Key size={20} className="text-accent" /> Key Generation Console
              </div>

              <div className="helper-box">
                <p className="helper-text">
                  This utility acts as the Licensing Authority Generator. It uses the backend secret key to sign settings credentials.
                  Generate keys for various scenarios, copy them, and paste them into System Settings to test enforcement logic.
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Interactive Test Presets</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => applyPreset('valid')}
                  >
                    <CheckCircle size={16} className="text-primary" /> 1. Seed Active Localhost
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => applyPreset('expired')}
                  >
                    <AlertTriangle size={16} className="text-danger" /> 2. Seed Expired Date
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => applyPreset('mismatch')}
                  >
                    <Globe size={16} className="text-warning" /> 3. Seed Mismatched Domain
                  </button>
                </div>
              </div>

              <form onSubmit={handleGenerateKey}>
                <div className="form-grid two-col">
                  <div className="form-group">
                    <label>Licensee / Organization Name</label>
                    <input
                      type="text"
                      required
                      value={genData.org_name}
                      onChange={(e) => setGenData({ ...genData, org_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Domain Name</label>
                    <input
                      type="text"
                      required
                      value={genData.domain_name}
                      onChange={(e) => setGenData({ ...genData, domain_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Valid From</label>
                    <input
                      type="date"
                      required
                      value={genData.valid_from}
                      onChange={(e) => setGenData({ ...genData, valid_from: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Valid To (Expiry)</label>
                    <input
                      type="date"
                      required
                      value={genData.valid_to}
                      onChange={(e) => setGenData({ ...genData, valid_to: e.target.value })}
                    />
                  </div>
                </div>

                <div className="btn-group" style={{ justifyContent: 'flex-start' }}>
                  <button type="submit" className="btn btn-accent">
                    Generate Cryptographic License Key
                  </button>
                </div>
              </form>

              {generatedKey && (
                <div style={{ marginTop: '30px', borderTop: '1px dashed var(--border-glass)', paddingTop: '24px' }}>
                  <label style={{ fontWeight: 'bold' }}>Generated Cryptographic Key</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Click key below to copy to clipboard, then paste it in System Settings form to test validations:
                  </p>
                  <div className="key-display" onClick={copyToClipboard}>
                    <span>{generatedKey}</span>
                    <span className="copy-indicator">
                      {copied ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}><Check size={12} /> Copied!</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Copy size={12} /> Copy</span>}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Diagnostic License Integrity Audit */}
        {currentTab === 'info' && (
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div className="settings-card glass-panel">
              <div className="card-title">
                <ShieldAlert size={20} className="text-primary" /> Active License Security Audit
              </div>

              {settings === null ? (
                <p style={{ color: 'var(--text-secondary)' }}>Load settings to view system security audit.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Active System Host</h4>
                      <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{window.location.hostname}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Hostname reported by client browser</p>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Registered Settings Domain</h4>
                      <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: settings.health?.domainMatch ? 'var(--success)' : 'var(--danger)' }}>
                        {settings.domain_name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Domain registered in settings database</p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>License Execution Diagnostics</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span>Cryptographic Signature Audit (HMAC-SHA256):</span>
                        <span style={{ fontWeight: 'bold', color: settings.health?.keyIntegrityValid ? 'var(--success)' : 'var(--danger)' }}>
                          {settings.health?.keyIntegrityValid ? 'PASS (Integrity Valid)' : 'FAIL (Tampered / Invalid)'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span>Host Binding Audit:</span>
                        <span style={{ fontWeight: 'bold', color: settings.health?.domainMatch ? 'var(--success)' : 'var(--danger)' }}>
                          {settings.health?.domainMatch ? 'PASS (Bound to current host)' : 'FAIL (Host mismatch)'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span>Temporal Expiry Audit:</span>
                        <span style={{ fontWeight: 'bold', color: settings.health?.dateValid ? 'var(--success)' : 'var(--danger)' }}>
                          {settings.health?.dateValid ? 'PASS (Within range)' : `FAIL (${settings.health?.expiryMessage || 'Expired'})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', padding: '16px', borderRadius: '12px' }}>
                    <Info size={20} className="text-primary" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      <h5 style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>Licensing Enforcement</h5>
                      All diagnostics are processed on the server upon every login request. Any failure halts session creation and triggers the restricted entry splash.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
