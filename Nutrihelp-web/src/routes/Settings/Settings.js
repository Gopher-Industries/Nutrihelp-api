import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDarkMode } from '../../routes/DarkModeToggle/DarkModeContext';
import { getFontSizeOptions, applyFontSize, getCurrentFontSize } from '../../utils/fontSizeManager';
import { testVoiceSettings, saveVoiceSettings } from '../../utils/voiceSettingsManager';
import { MoonIcon, SunIcon, Bell, Globe, Volume2 } from "lucide-react";
import notificationPreferencesApi from '../../services/notificationPreferencesApi';
import './Settings.css';
import Switch from "react-switch";
import Slider from '@mui/material/Slider';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, setDarkMode } = useDarkMode();

  const [fontSize, setFontSize] = useState('medium');
  const [fontSizes, setFontSizes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [showFocusIndicators, setShowFocusIndicators] = useState(false);
  const [screenReaderSupport, setScreenReaderSupport] = useState(false);
  const [rememberPreferences, setRememberPreferences] = useState(true);
  const [showHelpfulTips, setShowHelpfulTips] = useState(true);
  
  // Settings states
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    mealReminders: true,
    waterReminders: true,
    healthTips: true,
    weeklyReports: false,
    systemUpdates: true
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // API integration states
  const [isLoadingFromAPI, setIsLoadingFromAPI] = useState(false);
  const [isSavingToAPI, setIsSavingToAPI] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  
  // Voice/Audio settings states
  const [voiceSettings, setVoiceSettings] = useState({
    enabled: true,
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    autoPlay: false,
    voice: 'default'
  });

  // Language options
  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ];

  // Initialize settings
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setIsLoadingFromAPI(true);
        setApiError(null);
        
        // Initialize font size options
        const options = getFontSizeOptions();
        setFontSizes(options);
        
        const currentSize = getCurrentFontSize();
        if (options[currentSize]) {
          setFontSize(currentSize);
          applyFontSize(options[currentSize].size);
        }
        
        // Try to load settings from API first
        try {
          const apiPreferences = await notificationPreferencesApi.getAllUserPreferences();
          
          if (apiPreferences) {
            // Set notification preferences from API
            if (apiPreferences.notification_preferences) {
              setNotifications(apiPreferences.notification_preferences);
            }
            
            // Set language from API
            if (apiPreferences.language) {
              setLanguage(apiPreferences.language);
            }
            
            // Set theme from API
            if (apiPreferences.theme) {
              const isDarkMode = apiPreferences.theme === 'dark';
              setDarkMode(isDarkMode);
              if (isDarkMode) {
                document.body.classList.add('dark-mode');
              } else {
                document.body.classList.remove('dark-mode');
              }
            }
            
            // Set font size from API
            if (apiPreferences.font_size) {
              // Find matching font size option
              const matchingSize = Object.keys(options).find(key => 
                options[key].size === apiPreferences.font_size
              );
              if (matchingSize) {
                setFontSize(matchingSize);
                applyFontSize(apiPreferences.font_size);
              }
            }
            
            setApiSuccess('Settings loaded from cloud successfully');
          }
        } catch (apiError) {
          console.error('Error loading settings from API:', apiError);
          setApiError('Failed to load settings from cloud, using local settings');
          
          // Fallback to local storage
          loadSettingsFromLocalStorage();
        }
        
        // Load other settings from local storage (not handled by API yet)
        const savedHighContrast = localStorage.getItem('highContrast') === 'true';
        const savedShowFocusIndicators = localStorage.getItem('showFocusIndicators') === 'true';
        const savedScreenReaderSupport = localStorage.getItem('screenReaderSupport') === 'true';
        const savedRememberPreferences = localStorage.getItem('rememberPreferences') !== 'false';
        const savedShowHelpfulTips = localStorage.getItem('showHelpfulTips') !== 'false';
        const savedAutoSave = localStorage.getItem('autoSave') !== 'false';
        const savedVoiceSettings = JSON.parse(localStorage.getItem('voiceSettings') || '{}');

        setHighContrast(savedHighContrast);
        setShowFocusIndicators(savedShowFocusIndicators);
        setScreenReaderSupport(savedScreenReaderSupport);
        setRememberPreferences(savedRememberPreferences);
        setShowHelpfulTips(savedShowHelpfulTips);
        setAutoSave(savedAutoSave);
        setVoiceSettings(prev => ({ ...prev, ...savedVoiceSettings }));

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing settings:', error);
        setApiError('Error initializing settings');
        setIsLoading(false);
      } finally {
        setIsLoadingFromAPI(false);
      }
    };
    
    initializeSettings();
  }, []);

  // Anchor scrolling for /settings#section
  useEffect(() => {
    if (isLoading) return;

    const hash = location.hash?.replace('#', '');
    if (!hash) return;

    // allow layout to settle
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }, 50);

    return () => clearTimeout(t);
  }, [location.hash, isLoading]);

  // Load settings from local storage (fallback function)
  const loadSettingsFromLocalStorage = () => {
    try {
      const savedGlobalDarkMode = localStorage.getItem('globalDarkMode') === 'true';
      const savedLanguage = localStorage.getItem('language') || 'en';
      const savedNotifications = JSON.parse(localStorage.getItem('notifications') || '{}');

      setDarkMode(savedGlobalDarkMode);
      setLanguage(savedLanguage);
      setNotifications(prev => ({ ...prev, ...savedNotifications }));

      if (savedGlobalDarkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    } catch (error) {
      console.error('Error loading settings from local storage:', error);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasUnsavedChanges) {
      const timer = setTimeout(() => {
        saveSettings();
        setHasUnsavedChanges(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [autoSave, hasUnsavedChanges, fontSize, darkMode, highContrast, showFocusIndicators, screenReaderSupport, rememberPreferences, showHelpfulTips, language, notifications, voiceSettings]);

  // Apply font size
  useEffect(() => {
    if (fontSize && fontSizes[fontSize]) {
      try {
        applyFontSize(fontSizes[fontSize].size);
      } catch (error) {
        console.error('Error applying font size:', error);
      }
    }
  }, [fontSize, fontSizes]);

  // Handle font size change
  const handleFontSizeChange = (newSize) => {
    if (fontSizes[newSize]) {
      setFontSize(newSize);
      localStorage.setItem('fontSize', fontSizes[newSize].size);
      setHasUnsavedChanges(true);
    }
  };

  // Handle light mode button click
  const handleLightModeClick = () => {
    if (darkMode) {
      setDarkMode(false);
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      localStorage.setItem('globalDarkMode', 'false');
      setHasUnsavedChanges(true);
    }
  };

  // Handle dark mode button click
  const handleDarkModeClick = () => {
    if (!darkMode) {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('globalDarkMode', 'true');
      setHasUnsavedChanges(true);
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = async (key) => {
    console.log('🔧 Debug: handleNotificationToggle called with key:', key);
    console.log('🔧 Debug: Current notifications:', notifications);
    console.log('🔧 Debug: Current autoSave:', autoSave);
    
    const newNotifications = {
      ...notifications,
      [key]: !notifications[key]
    };
    
    console.log('🔧 Debug: New notifications:', newNotifications);
    
    setNotifications(newNotifications);
    setHasUnsavedChanges(true);
    
    // Show immediate feedback
    showSuccessMessage(`${key} notification ${newNotifications[key] ? 'enabled' : 'disabled'}`);
    
    // If auto-save is enabled, save to API immediately
    if (autoSave) {
      try {
        setIsSavingToAPI(true);
        setApiError(null);
        
        console.log('🔧 Debug: Attempting to save to API...');
        const response = await notificationPreferencesApi.updateNotificationPreferences(newNotifications);
        
        if (response.success) {
          setApiSuccess('Notification preferences saved to cloud');
          setHasUnsavedChanges(false);
          console.log('✅ Debug: API save successful');
        } else {
          setApiError(response.message || 'Failed to save notification preferences');
          console.log('❌ Debug: API save failed:', response.message);
        }
      } catch (error) {
        console.error('❌ Debug: Error saving notification preferences:', error);
        setApiError('Failed to save to cloud, saved locally');
      } finally {
        setIsSavingToAPI(false);
      }
    } else {
      console.log('🔧 Debug: Auto-save disabled, only saved locally');
    }
  };

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setHasUnsavedChanges(true);
  };

  // Handle voice settings change
  const handleVoiceSettingChange = (setting, value) => {
    setVoiceSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Test voice settings
  const handleTestVoice = () => {
    testVoiceSettings(voiceSettings);
  };

  // Save all settings
  const saveSettings = async () => {
    try {
      setIsSavingToAPI(true);
      setApiError(null);
      
      // Save settings that are handled by API
      const apiPreferences = {
        notification_preferences: notifications,
        language: language,
        theme: darkMode ? 'dark' : 'light',
        font_size: fontSizes[fontSize]?.size || '16px'
      };
      
      // Try to save to API first
      try {
        const response = await notificationPreferencesApi.updateAllUserPreferences(apiPreferences);
        
        if (response.success) {
          setApiSuccess('Settings saved to cloud successfully!');
        } else {
          setApiError(response.message || 'Failed to save some settings to cloud');
        }
      } catch (apiError) {
        console.error('Error saving to API:', apiError);
        setApiError('Failed to save to cloud, saved locally');
      }
      
      // Always save to local storage as backup and for settings not handled by API
      saveSettingsToLocalStorage();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setApiError('Error saving settings');
      saveSettingsToLocalStorage();
    } finally {
      setIsSavingToAPI(false);
    }
  };

  // Save settings to local storage
  const saveSettingsToLocalStorage = () => {
    if (fontSize && fontSizes[fontSize]) {
      localStorage.setItem('fontSize', fontSizes[fontSize].size);
    }
    
    localStorage.setItem('highContrast', highContrast);
    localStorage.setItem('showFocusIndicators', showFocusIndicators);
    localStorage.setItem('screenReaderSupport', screenReaderSupport);
    localStorage.setItem('rememberPreferences', rememberPreferences);
    localStorage.setItem('showHelpfulTips', showHelpfulTips);
    localStorage.setItem('autoSave', autoSave);
    localStorage.setItem('language', language);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('globalDarkMode', darkMode.toString());
    saveVoiceSettings(voiceSettings);
    
    // Apply accessibility settings
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    if (showFocusIndicators) {
      document.body.classList.add('show-focus-indicators');
    } else {
      document.body.classList.remove('show-focus-indicators');
    }
    
    if (screenReaderSupport) {
      document.body.classList.add('screen-reader-support');
    } else {
      document.body.classList.remove('screen-reader-support');
    }
    
    showSuccessMessage('Settings saved successfully!');
  };

  // Show success message
  const showSuccessMessage = (message) => {
    const successMessage = document.createElement('div');
    successMessage.className = 'settings-success-message';
    successMessage.textContent = message;
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className={`settings-page ${darkMode ? 'dark-mode' : ''}`}>
        <div className="settings-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!fontSizes || Object.keys(fontSizes).length === 0) {
    return (
      <div className={`settings-page ${darkMode ? 'dark-mode' : ''}`}>
        <div className="settings-container">
          <div className="error-content">
            <h2>Settings Not Available</h2>
            <p>Please refresh the page to try again.</p>
            <button onClick={() => window.location.reload()} className="refresh-btn">
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentFontSize = fontSizes[fontSize] || fontSizes.medium || { size: '16px', label: 'Medium' };

  // Define all settings sections
  const allSections = [
    {
      id: 'display',
      title: 'Display Settings',
      description: 'Theme mode and display preferences',
      content: (
        <div className="theme-mode-selector">
            <button 
              className={`mode-button ${!darkMode ? 'active' : ''}`}
              onClick={handleLightModeClick}
              aria-label="Switch to light mode"
            >
              <SunIcon size={24} />
              <span>Light Mode</span>
            </button>
            <button 
              className={`mode-button ${darkMode ? 'active' : ''}`}
              onClick={handleDarkModeClick}
              aria-label="Switch to dark mode"
            >
              <MoonIcon size={24} />
              <span>Dark Mode</span>
            </button>
        </div>
      )
    },
    {
      id: 'font',
      title: 'Font Size',
      description: 'Adjust text size for readability',
      content: (
        <>
          <div className="font-size-options">
            {Object.entries(fontSizes).map(([key, value]) => (
              <button
                key={key}
                className={`font-size-option ${fontSize === key ? 'selected' : ''}`}
                onClick={() => handleFontSizeChange(key)}
              >
                <span className="font-size-label">{value.label}</span>
                <span className={`font-size-preview font-size-${key}`}>Aa</span>
              </button>
            ))}
          </div>
          <div className="font-size-preview-container">
            <h3 className="preview-title">Preview:</h3>
            <p className="preview-text" style={{ fontSize: currentFontSize.size }}>
              This is how the text will appear with your selected font size. 
              The text should be comfortable to read for elderly users.
            </p>
          </div>
        </>
      )
    },
    {
      id: 'accessibility',
      title: 'Accessibility',
      description: 'Support features for diverse accessibility needs',
      content: (
        <div className="accessibility-options">
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">High contrast mode</div>
            </div>
            <Switch 
              checked={highContrast}
              onChange={(checked) => {
                setHighContrast(checked);
                setHasUnsavedChanges(true);
              }}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
          
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">Show focus indicators</div>
            </div>
            <Switch 
              checked={showFocusIndicators}
              onChange={(checked) => {
                setShowFocusIndicators(checked);
                setHasUnsavedChanges(true);
              }}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
          
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">Enable screen reader support</div>
            </div>
            <Switch 
              checked={screenReaderSupport}
              onChange={(checked) => {
                setScreenReaderSupport(checked);
                setHasUnsavedChanges(true);
              }}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Choose which reminders and alerts you receive',
      content: (
        <div className="notification-options">
          <div className="notification-header">
            <div className="notification-status">
              <span className="toggle-label">Enable All Notifications</span>
              <span className="status-indicator">
                {Object.values(notifications).filter(Boolean).length} of {Object.keys(notifications).length} enabled
              </span>
            </div>
            <div className="notification-actions">
              <Switch 
                checked={Object.values(notifications).every(Boolean)}
                onChange={(checked) => {
                  const allToggled = Object.keys(notifications).reduce((acc, key) => {
                    acc[key] = checked;
                    return acc;
                  }, {});
                  setNotifications(allToggled);
                  setHasUnsavedChanges(true);
                  showSuccessMessage(checked ? 'All notifications enabled' : 'All notifications disabled');
                }}
                onColor="#005BBB"
                offColor="#ccc"
                checkedIcon={false}
                uncheckedIcon={false}
                height={24}
                width={48}
              />
            </div>
          </div>
          
          <div className="notification-list">
            <div className="checkbox-group">
              <div className="notification-content">
                <div className="checkbox-label">
                  <span className="notification-icon">🍽️</span>
                  Meal reminders
                  <div className="checkbox-description">Get reminded about your scheduled meals</div>
                </div>
                <Switch 
                  checked={notifications.mealReminders}
                  onChange={(checked) => handleNotificationToggle('mealReminders')}
                  onColor="#005BBB"
                  offColor="#ccc"
                  checkedIcon={false}
                  uncheckedIcon={false}
                  height={24}
                  width={48}
                />
              </div>

            </div>
            
            <div className="checkbox-group">
              <div className="notification-content">
                <div className="checkbox-label">
                  <span className="notification-icon">💧</span>
                  Water intake reminders
                  <div className="checkbox-description">Stay hydrated with regular water reminders</div>
                </div>
                
                <Switch 
                  checked={notifications.waterReminders}
                  onChange={(checked) => handleNotificationToggle('waterReminders')}
                  onColor="#005BBB"
                  offColor="#ccc"
                  checkedIcon={false}
                  uncheckedIcon={false}
                  height={24}
                  width={48}
                />
              </div>

            </div>
            
            <div className="checkbox-group">
              <div className="notification-content">
                <div className="checkbox-label">
                  <span className="notification-icon">💡</span>
                  Health tips
                  <div className="checkbox-description">Receive daily health and nutrition tips</div>
                </div>
                <Switch 
                  checked={notifications.healthTips}
                  onChange={(checked) => handleNotificationToggle('healthTips')}
                  onColor="#005BBB"
                  offColor="#ccc"
                  checkedIcon={false}
                  uncheckedIcon={false}
                  height={24}
                  width={48}
                />
              </div>
              
            </div>
            
            <div className="checkbox-group">
              <div className="notification-content">
                <div className="checkbox-label">
                  <span className="notification-icon">📊</span>
                  Weekly progress reports
                  <div className="checkbox-description">Get weekly summaries of your health progress</div>
                </div>
                <Switch 
                  checked={notifications.weeklyReports}
                  onChange={(checked) => handleNotificationToggle('weeklyReports')}
                  onColor="#005BBB"
                  offColor="#ccc"
                  checkedIcon={false}
                  uncheckedIcon={false}
                  height={24}
                  width={48}
                />
              </div>

            </div>
            
            <div className="checkbox-group">
              <div className="notification-content">
                <div className="checkbox-label">
                  <span className="notification-icon">🔔</span>
                  System updates
                  <div className="checkbox-description">Receive notifications about app updates</div>
                </div>
                <Switch 
                  checked={notifications.systemUpdates}
                  onChange={(checked) => handleNotificationToggle('systemUpdates')}
                  onColor="#005BBB"
                  offColor="#ccc"
                  checkedIcon={false}
                  uncheckedIcon={false}
                  height={24}
                  width={48}
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'language',
      title: 'Language',
      description: 'Change your preferred language',
      content: (
        <div className="language-dropdown-container">
          <select 
            className="language-dropdown"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {languageOptions.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.flag})
              </option>
            ))}
          </select>
        </div>
      )
    },
    {
      id: 'voice',
      title: 'Voice & Audio',
      description: 'Configure text-to-speech and audio settings',
      content: (
        <div className="voice-options">
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">Enable text-to-speech</div>
            </div>
            <Switch 
              checked={voiceSettings.enabled}
              onChange={(checked) => handleVoiceSettingChange('enabled', checked)}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>Voice Volume</span>
              <span>{Math.round(voiceSettings.volume * 100)}%</span>
            </div>
            <Slider
              value={voiceSettings.volume}
              onChange={(e, newValue) => handleVoiceSettingChange('volume', newValue)}
              min={0}
              max={1}
              step={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              sx={{
                color: '#005BBB',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#005BBB',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#005BBB',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#d1d5db',
                },
              }}
            />
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>Speech Rate</span>
              <span>{voiceSettings.rate}x</span>
            </div>
            <Slider
              value={voiceSettings.rate}
              onChange={(e, newValue) => handleVoiceSettingChange('rate', newValue)}
              min={0.5}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}x`}
              sx={{
                color: '#005BBB',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#005BBB'
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#005BBB',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#d1d5db',
                },
              }}
            />
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>Voice Pitch</span>
              <span>{voiceSettings.pitch}x</span>
            </div>
            <Slider
              value={voiceSettings.pitch}
              onChange={(e, newValue) => handleVoiceSettingChange('pitch', newValue)}
              min={0.5}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}x`}
              sx={{
                color: '#005BBB',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#005BBB'
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#005BBB',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#d1d5db',
                },
              }}
            />
          </div>
          
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">Auto-play on page load</div>
              <div className="checkbox-description">Automatically start reading when a new page loads</div>
            </div>
            <Switch 
              checked={voiceSettings.autoPlay}
              onChange={(checked) => handleVoiceSettingChange('autoPlay', checked)}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
          
          <div className="voice-test-section">
            <button 
              className="test-voice-btn"
              onClick={handleTestVoice}
              disabled={!voiceSettings.enabled}
            >
              <Volume2 size={16} />
              Test Voice Settings
            </button>
            <p className="test-description">
              Click to hear a sample with your current voice settings
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'preferences',
      title: 'User Preferences',
      description: 'Personal preferences and autosave options',
      content: (
        <div className="user-preference-options">
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">Remember my preferences</div>
              <div className="checkbox-description">Save your settings across sessions</div>
            </div>
            <Switch 
              checked={rememberPreferences}
              onChange={(checked) => {
                setRememberPreferences(checked);
                setHasUnsavedChanges(true);
              }}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
          
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">Show helpful tips</div>
              <div className="checkbox-description">Display contextual help and tips</div>
            </div>
            <Switch 
              checked={showHelpfulTips}
              onChange={(checked) => {
                setShowHelpfulTips(checked);
                setHasUnsavedChanges(true);
              }}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
          
          <div className="checkbox-group">
            <div>
              <div className="checkbox-label">Auto-save settings</div>
              <div className="checkbox-description">Automatically save changes after 2 seconds</div>
            </div>
            <Switch 
              checked={autoSave}
              onChange={(checked) => {
                setAutoSave(checked);
                setHasUnsavedChanges(true);
              }}
              onColor="#005BBB"
              offColor="#ccc"
              checkedIcon={false}
              uncheckedIcon={false}
              height={24}
              width={48}
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`settings-page ${darkMode ? 'dark-mode' : ''}`}>
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
        </div>

        <div className="settings-content">
          {/* API Status Messages, Not totally necessay but use when testing. */}
          {/* {apiError && (
            <div className="api-status-message api-error">
              <span>⚠️ {apiError}</span>
            </div>
          )}
          {apiSuccess && (
            <div className="api-status-message api-success">
              <span>✅ {apiSuccess}</span>
            </div>
          )}
          {(isLoadingFromAPI || isSavingToAPI) && (
            <div className="api-status-message api-loading">
              <span>🔄 {isLoadingFromAPI ? 'Loading settings from cloud...' : 'Saving settings to cloud...'}</span>
            </div>
          )} */}

          {/* Settings Sections */}
          {allSections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="settings-section"
            >
              <h2 className="section-title">
                 {section.title === 'Display Settings' && <SunIcon size={24} />}
                 {section.title === 'Font Size' && <span style={{ fontSize: '24px' }}>Aa</span>}
                 {section.title === 'Accessibility' && <span style={{ fontSize: '24px' }}>♿</span>}
                 {section.title === 'Notifications' && <Bell size={24} />}
                 {section.title === 'Language' && <Globe size={24} />}
                 {section.title === 'Voice & Audio' && <Volume2 size={24} />}
                 {section.title === 'User Preferences' && <span style={{ fontSize: '24px' }}>⚙️</span>}
                {section.title}
              </h2>
              <p className="section-description">
                {section.description}
              </p>
              {section.content}
            </div>
          ))}
        </div>

          {/* There is auto-save feature so the footer might not be necessary but kept in place in case of future use cases */}
        {/* <div className="settings-footer">
          <button 
            className="cancel-btn"
            onClick={handleBack}
          >
            Cancel
          </button>
          <button 
            className="save-settings-btn"
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges}
          >
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default Settings;
