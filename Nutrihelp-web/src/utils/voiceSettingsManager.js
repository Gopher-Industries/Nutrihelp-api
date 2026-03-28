// Voice Settings Manager
// Manages voice/audio settings for text-to-speech functionality

/**
 * Get voice settings from localStorage with defaults
 * @returns {Object} Voice settings object
 */
export const getVoiceSettings = () => {
  try {
    const saved = localStorage.getItem('voiceSettings');
    const defaultSettings = {
      enabled: true,
      volume: 0.8,
      rate: 1.0,
      pitch: 1.0,
      autoPlay: false,
      voice: 'default'
    };
    
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Error loading voice settings:', error);
    return {
      enabled: true,
      volume: 0.8,
      rate: 1.0,
      pitch: 1.0,
      autoPlay: false,
      voice: 'default'
    };
  }
};

/**
 * Save voice settings to localStorage and dispatch custom event
 * @param {Object} settings - Voice settings object
 */
export const saveVoiceSettings = (settings) => {
  try {
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
    
    // Dispatch custom event to notify components on the same page
    window.dispatchEvent(new CustomEvent('voiceSettingsChanged', {
      detail: settings
    }));
  } catch (error) {
    console.error('Error saving voice settings:', error);
  }
};

/**
 * Apply voice settings to a SpeechSynthesisUtterance
 * @param {SpeechSynthesisUtterance} utterance - The utterance to configure
 * @param {Object} settings - Voice settings object
 */
export const applyVoiceSettings = (utterance, settings = null) => {
  const voiceSettings = settings || getVoiceSettings();
  
  if (!voiceSettings.enabled) {
    return false; // Voice is disabled
  }
  
  // Apply volume (0.0 to 1.0)
  utterance.volume = Math.max(0, Math.min(1, voiceSettings.volume));
  
  // Apply speech rate (0.1 to 10, typically 0.5 to 2.0)
  utterance.rate = Math.max(0.1, Math.min(10, voiceSettings.rate));
  
  // Apply pitch (0 to 2)
  utterance.pitch = Math.max(0, Math.min(2, voiceSettings.pitch));
  
  return true; // Voice is enabled and applied
};

/**
 * Check if voice functionality is enabled
 * @returns {boolean} True if voice is enabled
 */
export const isVoiceEnabled = () => {
  const settings = getVoiceSettings();
  return settings.enabled;
};

/**
 * Get the auto-play setting
 * @returns {boolean} True if auto-play is enabled
 */
export const isAutoPlayEnabled = () => {
  const settings = getVoiceSettings();
  return settings.autoPlay;
};

/**
 * Create a configured speech utterance with current settings
 * @param {string} text - Text to speak
 * @param {Object} customSettings - Optional custom settings to override defaults
 * @returns {SpeechSynthesisUtterance|null} Configured utterance or null if disabled
 */
export const createConfiguredUtterance = (text, customSettings = {}) => {
  const settings = { ...getVoiceSettings(), ...customSettings };
  
  if (!settings.enabled) {
    return null;
  }
  
  const utterance = new SpeechSynthesisUtterance(text);
  applyVoiceSettings(utterance, settings);
  
  return utterance;
};

/**
 * Speak text with current voice settings
 * @param {string} text - Text to speak
 * @param {Object} callbacks - Optional callbacks for events
 */
export const speakWithSettings = (text, callbacks = {}) => {
  const utterance = createConfiguredUtterance(text);
  
  if (!utterance) {
    console.log('Voice is disabled');
    return null;
  }
  
  // Add event listeners if provided
  if (callbacks.onStart) utterance.onstart = callbacks.onStart;
  if (callbacks.onEnd) utterance.onend = callbacks.onEnd;
  if (callbacks.onError) utterance.onerror = callbacks.onError;
  if (callbacks.onPause) utterance.onpause = callbacks.onPause;
  if (callbacks.onResume) utterance.onresume = callbacks.onResume;
  
  speechSynthesis.speak(utterance);
  return utterance;
};

/**
 * Test voice settings by speaking a sample text
 * @param {Object} settings - Voice settings to test
 */
export const testVoiceSettings = (settings) => {
  const testText = "This is a test of your voice settings. You can adjust the volume, speed, and pitch to your preference.";
  
  // Cancel any existing speech
  speechSynthesis.cancel();
  
  const utterance = createConfiguredUtterance(testText, settings);
  if (utterance) {
    speechSynthesis.speak(utterance);
  }
};
