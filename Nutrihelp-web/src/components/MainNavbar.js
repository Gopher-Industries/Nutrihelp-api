import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDarkMode } from "../routes/DarkModeToggle/DarkModeContext";
import "../styles/mainNavbar.css";
import UserIcon from "./user-stroke-rounded.tsx";
import SideMenu from "./SideMenu";

const RobotIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="7" width="18" height="14" rx="4" ry="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="9" cy="13" r="1" fill="currentColor"/>
    <circle cx="15" cy="13" r="1" fill="currentColor"/>
    <path d="M12 7V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ChevronDownIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 9l6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BarcodeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 7v10M7 7v10M10 7v10M12 7v10M14 7v10M17 7v10M20 7v10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const HamburgerIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 7h16M4 12h16M4 17h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const MainNavbar = () => {
  const { darkMode } = useDarkMode();

  const navigate = useNavigate();

  // Desktop dropdowns
  const [openMenu, setOpenMenu] = useState(null); // "more" | "settings" | "account" | null

  // Mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);

  // close on outside click (desktop dropdowns)
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  // close on ESC (desktop and mobile)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hover/focus open
  const menuHandlers = (name) => ({
    onMouseEnter: () => setOpenMenu(name),
    onMouseLeave: () => setOpenMenu((prev) => (prev === name ? null : prev)),
    onFocus: () => setOpenMenu(name),
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setOpenMenu((prev) => (prev === name ? null : prev));
      }
    },
  });

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      className={`main-header ${darkMode ? "dark-mode" : ""} ${
        scrolled ? "scrolled" : ""
      }`}
    >
      <nav className="main-nav" ref={navRef} aria-label="Main">
        {/* Logo -> Home */}
        <Link to="/home" className="nav-logo" aria-label="NutriHelp Home">
          <img src="/images/logo.png" alt="NutriHelp logo" />
        </Link>

        {/* Desktop controls (hidden on mobile via CSS) */}
        <div className="nav-desktop">
          {/* Left */}
          <div className="nav-left">
            <Link to="/home" className="nav-link">
              Home
            </Link>

            <Link to="/Scan" className="nav-link nav-link-icon">
              <span className="nav-icon" aria-hidden="true">
                <BarcodeIcon />
              </span>
              Scan
            </Link>

            {/* MORE */}
            <div className="nav-dropdown" {...menuHandlers("more")}>
              <button
                type="button"
                className="nav-button"
                aria-haspopup="true"
                aria-expanded={openMenu === "more"}
                aria-controls="menu-more"
              >
                More{" "}
                <span className="nav-icon">
                  <ChevronDownIcon />
                </span>
              </button>

              {openMenu === "more" && (
                <div
                  id="menu-more"
                  className="dropdown-panel mega-menu"
                  role="menu"
                >
                  <SideMenu mode="desktop" onNavigate={() => setOpenMenu(null)} />
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="nav-right">
            <button
              type="button"
              className="nav-button nav-assistant"
              aria-label="Open Assistant"
              onClick={() => navigate("/chat")}
            >
              <span className="nav-icon">
                <RobotIcon />
              </span>
              Assistant
            </button>


            {/* SETTINGS */}
            <div className="nav-dropdown" {...menuHandlers("settings")}>
              <button
                type="button"
                className="nav-button"
                aria-haspopup="true"
                aria-expanded={openMenu === "settings"}
                aria-controls="menu-settings"
              >
                Settings{" "}
                <span className="nav-icon">
                  <ChevronDownIcon />
                </span>
              </button>

              {/* Settings' anchors */}
              {openMenu === "settings" && (
                <div
                  id="menu-settings"
                  className="dropdown-panel single-menu"
                  role="menu"
                >
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/settings#display"
                    onClick={() => setOpenMenu(null)}
                  >
                    Display
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/settings#font"
                    onClick={() => setOpenMenu(null)}
                  >
                    Font Size
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/settings#accessibility"
                    onClick={() => setOpenMenu(null)}
                  >
                    Accessibility
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/settings#notifications"
                    onClick={() => setOpenMenu(null)}
                  >
                    Notifications
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/settings#language"
                    onClick={() => setOpenMenu(null)}
                  >
                    Language
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/settings#voice"
                    onClick={() => setOpenMenu(null)}
                  >
                    Voice &amp; Audio
                  </Link>
                </div>
              )}
            </div>

            {/* ACCOUNT */}
            <div className="nav-dropdown" {...menuHandlers("account")}>
              <button
                type="button"
                className="nav-button nav-account"
                aria-haspopup="true"
                aria-expanded={openMenu === "account"}
                aria-controls="menu-account"
              >
                <span className="account-icon" aria-hidden="true">
                  <UserIcon width={22} height={22} color="currentColor" />
                </span>
                Account{" "}
                <span className="nav-icon">
                  <ChevronDownIcon />
                </span>
              </button>

              {openMenu === "account" && (
                <div
                  id="menu-account"
                  className="dropdown-panel single-menu"
                  role="menu"
                >
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/userProfile"
                    onClick={() => setOpenMenu(null)}
                  >
                    Profile
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/dietaryRequirements"
                    onClick={() => setOpenMenu(null)}
                  >
                    Dietary Preference
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/preferences"
                    onClick={() => setOpenMenu(null)}
                  >
                    Allergies &amp; Intolerances
                  </Link>
                  <Link
                    className="dropdown-item"
                    role="menuitem"
                    to="/login"
                    onClick={() => setOpenMenu(null)}
                  >
                    Log Out
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile controls (shown on mobile via CSS) */}
        <div className="nav-mobile">
          <button
            type="button"
            className="nav-mobile-menu-btn"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <HamburgerIcon />
            <span className="nav-mobile-menu-label">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (overlay and side panel) */}
      {mobileOpen && (
        <div
          className="mobile-drawer-overlay"
          role="presentation"
          onMouseDown={(e) => {
            // click outside closes
            if (e.target === e.currentTarget) closeMobile();
          }}
        >
          <aside className="mobile-drawer" aria-label="Mobile navigation">
            <SideMenu mode="mobile" onNavigate={closeMobile} onClose={closeMobile} />
          </aside>
        </div>
      )}
    </header>
  );
};

export default MainNavbar;
