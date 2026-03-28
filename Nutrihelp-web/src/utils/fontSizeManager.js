// Font size manager for elderly users
export const initializeFontSize = () => {
  // Check if user has font size preference in localStorage
  const savedFontSize = localStorage.getItem('fontSize');
  
  if (savedFontSize) {
    applyFontSize(savedFontSize);
  }
};

export const setFontSize = (size) => {
  // Set font size and save to localStorage
  applyFontSize(size);
  localStorage.setItem('fontSize', size);
};

export const getFontSize = () => {
  return localStorage.getItem('fontSize') || '16px';
};

// Get font size options for the Settings page
export const getFontSizeOptions = () => {
  return {
    small: { size: '14px', label: 'Small' },
    large: { size: '18px', label: 'Large' },
    veryLarge: { size: '24px', label: 'Very Large' }
  };
};

// Get current font size key
export const getCurrentFontSize = () => {
  const currentSize = getFontSize();
  const options = getFontSizeOptions();
  
  // Find the matching key for the current font size
  for (const [key, value] of Object.entries(options)) {
    if (value.size === currentSize) {
      return key;
    }
  }
  
  // If no exact match found, try to find the closest match
  const currentSizeNum = parseInt(currentSize);
  if (currentSizeNum) {
    if (currentSizeNum <= 14) return 'small';
    if (currentSizeNum <= 16) return 'medium';
    if (currentSizeNum <= 18) return 'large';
    if (currentSizeNum <= 20) return 'extraLarge';
    if (currentSizeNum <= 24) return 'veryLarge';
  }
  
  return 'medium'; // Default fallback
};

// Apply font size to document and navigation elements
export const applyFontSize = (size) => {
  // Set root font size for rem units
  document.documentElement.style.fontSize = size;
  
  // Apply to navigation elements with proper alignment
  updateNavigationFontSize(size);
  
  // Apply to Settings page elements
  updateSettingsPageFontSize(size);
};

// Update navigation font size while maintaining alignment
const updateNavigationFontSize = (size) => {
  // Update side menu container to maintain proper height
  const sideMenu = document.querySelector('.side-menu');
  if (sideMenu) {
    sideMenu.style.height = 'fit-content';
    sideMenu.style.minHeight = 'auto';
    
    // Add scroll functionality for very large fonts
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      sideMenu.style.maxHeight = '100vh';
      sideMenu.style.overflowY = 'auto';
      sideMenu.style.overflowX = 'hidden';
    } else {
      sideMenu.style.maxHeight = 'none';
      sideMenu.style.overflowY = 'visible';
      sideMenu.style.overflowX = 'visible';
    }
  }
  
  // Update nav-links container
  const navLinks = document.querySelector('.side-menu .nav-links');
  if (navLinks) {
    navLinks.style.display = 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.gap = '1rem';
    navLinks.style.alignItems = 'stretch';
    
    // Ensure nav-links container is scrollable for large fonts
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      navLinks.style.maxHeight = 'calc(100vh - 100px)';
      navLinks.style.overflowY = 'auto';
      navLinks.style.paddingRight = '10px';
    } else {
      navLinks.style.maxHeight = 'none';
      navLinks.style.overflowY = 'visible';
      navLinks.style.paddingRight = '0';
    }
  }
  
  // Update all navigation links and buttons
  const navElements = document.querySelectorAll('.side-menu a, .side-menu button, .side-menu .dropdown-toggle');
  navElements.forEach(element => {
    element.style.fontSize = size;
    element.style.textAlign = 'left';
    element.style.width = '100%';
    element.style.padding = '0.5rem 0';
    element.style.display = 'block';
    element.style.textDecoration = 'none';
    element.style.border = 'none';
    element.style.background = 'none';
    element.style.cursor = 'pointer';
    element.style.minHeight = '2.5rem';
    element.style.lineHeight = '1.5';
    element.style.verticalAlign = 'middle';
    
    // Ensure elements don't get cut off for large fonts
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      element.style.whiteSpace = 'nowrap';
      element.style.overflow = 'hidden';
      element.style.textOverflow = 'ellipsis';
    } else {
      element.style.whiteSpace = 'normal';
      element.style.overflow = 'visible';
      element.style.textOverflow = 'clip';
    }
  });
  
  // Update dropdown content
  const dropdownContent = document.querySelectorAll('.side-menu .dropdown-content a');
  dropdownContent.forEach(link => {
    link.style.fontSize = size;
    link.style.textAlign = 'left';
    link.style.width = '100%';
    link.style.padding = '0.3rem 0';
    link.style.display = 'block';
    link.style.minHeight = '2rem';
    link.style.lineHeight = '1.5';
    
    // Ensure dropdown items are visible for large fonts
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      link.style.whiteSpace = 'nowrap';
      link.style.overflow = 'hidden';
      link.style.textOverflow = 'ellipsis';
    } else {
      link.style.whiteSpace = 'normal';
      link.style.overflow = 'visible';
      link.style.textOverflow = 'clip';
    }
  });
  
  // Update dropdown toggles specifically
  const dropdownToggles = document.querySelectorAll('.side-menu .dropdown-toggle');
  dropdownToggles.forEach(toggle => {
    toggle.style.fontSize = size;
    toggle.style.textAlign = 'left';
    toggle.style.width = '100%';
    toggle.style.padding = '0.5rem 0';
    toggle.style.display = 'flex';
    toggle.style.justifyContent = 'space-between';
    toggle.style.alignItems = 'center';
    toggle.style.minHeight = '2.5rem';
    toggle.style.lineHeight = '1.5';
    
    // Ensure dropdown toggles are fully visible for large fonts
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      toggle.style.whiteSpace = 'nowrap';
      toggle.style.overflow = 'hidden';
      toggle.style.textOverflow = 'ellipsis';
    } else {
      toggle.style.whiteSpace = 'normal';
      toggle.style.overflow = 'visible';
      toggle.style.textOverflow = 'clip';
    }
  });
  
  // Update close button
  const closeButton = document.querySelector('.close-button');
  if (closeButton) {
    closeButton.style.fontSize = size;
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '20px';
    
    // Ensure close button is always visible and clickable
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      closeButton.style.zIndex = '1000';
      closeButton.style.backgroundColor = 'rgba(0,0,0,0.1)';
      closeButton.style.borderRadius = '50%';
      closeButton.style.width = '40px';
      closeButton.style.height = '40px';
      closeButton.style.display = 'flex';
      closeButton.style.alignItems = 'center';
      closeButton.style.justifyContent = 'center';
    } else {
      closeButton.style.zIndex = 'auto';
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.borderRadius = '0';
      closeButton.style.width = 'auto';
      closeButton.style.height = 'auto';
      closeButton.style.display = 'block';
    }
  }
  
  // Update hamburger button
  const hamburger = document.querySelector('.hamburger');
  if (hamburger) {
    hamburger.style.fontSize = size;
    
    // Ensure hamburger button is always visible for large fonts
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      hamburger.style.zIndex = '1000';
      hamburger.style.backgroundColor = 'rgba(0,0,0,0.1)';
      hamburger.style.borderRadius = '50%';
      hamburger.style.width = '40px';
      hamburger.style.height = '40px';
      hamburger.style.display = 'flex';
      hamburger.style.alignItems = 'center';
      hamburger.style.justifyContent = 'center';
    } else {
      hamburger.style.zIndex = 'auto';
      hamburger.style.backgroundColor = 'transparent';
      hamburger.style.borderRadius = '0';
      hamburger.style.width = 'auto';
      hamburger.style.height = 'auto';
      hamburger.style.display = 'block';
    }
  }
  
  // Ensure proper spacing and alignment
  const navItems = document.querySelectorAll('.side-menu .nav-links > *');
  navItems.forEach(item => {
    item.style.margin = '0';
    item.style.padding = '0';
    item.style.width = '100%';
    item.style.boxSizing = 'border-box';
    
    // Add extra spacing for large fonts to prevent overlap
    const fontSize = parseInt(size);
    if (fontSize >= 20) {
      item.style.marginBottom = '0.5rem';
    } else {
      item.style.marginBottom = '0';
    }
  });
  
  // Force layout recalculation
  setTimeout(() => {
    recalculateNavigationLayout();
  }, 10);
};

// Recalculate navigation layout to ensure proper alignment
const recalculateNavigationLayout = () => {
  const sideMenu = document.querySelector('.side-menu');
  if (sideMenu) {
    // Force a reflow to ensure proper layout
    sideMenu.offsetHeight;
    
    // Ensure all items are properly aligned
    const navItems = document.querySelectorAll('.side-menu .nav-links > *');
    navItems.forEach((item, index) => {
      if (index > 0) {
        item.style.marginTop = '0.5rem';
      }
    });
    
    // Ensure dropdown content is properly positioned
    const dropdowns = document.querySelectorAll('.side-menu .dropdown');
    dropdowns.forEach(dropdown => {
      const dropdownContent = dropdown.querySelector('.dropdown-content');
      if (dropdownContent) {
        dropdownContent.style.position = 'absolute';
        dropdownContent.style.left = '150%';
        dropdownContent.style.top = '0';
        dropdownContent.style.zIndex = '1000';
      }
    });
  }
};

// Update Settings page font size specifically
const updateSettingsPageFontSize = (size) => {
  // Update Settings page text elements
  const settingsTextElements = document.querySelectorAll('.settings-page h1, .settings-page h2, .settings-page h3, .settings-page p, .settings-page span, .settings-page label');
  settingsTextElements.forEach(element => {
    // Don't override elements that have specific font-size styles (like preview text)
    if (!element.classList.contains('font-size-preview') && !element.style.fontSize) {
      element.style.fontSize = size;
    }
  });
  
  // Update buttons in Settings page
  const settingsButtons = document.querySelectorAll('.settings-page button');
  settingsButtons.forEach(button => {
    if (!button.classList.contains('font-size-option')) {
      button.style.fontSize = size;
    }
  });
  
  // Update section titles and descriptions
  const sectionTitles = document.querySelectorAll('.section-title, .section-description');
  sectionTitles.forEach(element => {
    element.style.fontSize = size;
  });
  
  // Update checkbox labels
  const checkboxLabels = document.querySelectorAll('.checkbox-label');
  checkboxLabels.forEach(label => {
    label.style.fontSize = size;
  });
};

// Load saved settings and apply them
export const loadSavedSettings = () => {
  try {
    // Load and apply font size
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      applyFontSize(savedFontSize);
    }
    
    // Load and apply global dark mode
    const savedGlobalDarkMode = localStorage.getItem('globalDarkMode') === 'true';
    if (savedGlobalDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Apply accessibility settings
    const highContrast = localStorage.getItem('highContrast') === 'true';
    const showFocusIndicators = localStorage.getItem('showFocusIndicators') === 'true';
    const screenReaderSupport = localStorage.getItem('screenReaderSupport') === 'true';
    
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
  } catch (error) {
    console.error('Error loading saved settings:', error);
  }
};
