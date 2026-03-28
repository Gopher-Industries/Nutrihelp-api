import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/mainNavbar.css";

const ChevronRight = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M9 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronLeft = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M15 6l-6 6 6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 6l12 12M18 6L6 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const SideMenu = ({ onNavigate, mode = "desktop", onClose }) => {
  const close = () => typeof onNavigate === "function" && onNavigate();

  // Desktop Mega Menu
  if (mode === "desktop") {
    const navigate = useNavigate();

    const goToContact = () => {
      close();
      navigate("/home");
      setTimeout(() => {
        const el = document.getElementById("contact");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    };


    return (
      <div className="mega-menu-content" aria-label="More menu">
        <div className="mega-col">
          <div className="mega-title">Recipes</div>
          <Link to="/createRecipe" className="mega-item" onClick={close}>
            Create Recipe
          </Link>
          <Link to="/searchRecipes" className="mega-item" onClick={close}>
            Search Recipes
          </Link>
          <Link to="/RecipeRating" className="mega-item" onClick={close}>
            Recipe Rating
          </Link>
          <Link to="/recipe" className="mega-item" onClick={close}>
          Recipe
          </Link>
        </div>

        <div className="mega-col">
          <div className="mega-title">Meal Planning</div>
          <Link to="/dashboard" className="mega-item" onClick={close}>
            Meal Details
          </Link>
          <Link to="/Meal" className="mega-item" onClick={close}>
            Plan
          </Link>
          <Link to="/daily-plan-edit" className="mega-item" onClick={close}>
            Daily Meal
          </Link>
        </div>

        <div className="mega-col">
          <div className="mega-title">Health</div>
          <Link to="/HealthFAQ" className="mega-item" onClick={close}>
            Health FAQ
          </Link>
          <Link to="/HealthTools" className="mega-item" onClick={close}>
            Health Tools
          </Link>
          <Link to="/healthnews" className="mega-item" onClick={close}>
            Health News
          </Link>
          <Link to="/symptomassessment" className="mega-item" onClick={close}>
            Symptom Assessment
          </Link>
          <Link to="/survey" className="mega-item" onClick={close}>
            Fitness Roadmap
          </Link>
        </div>

        <div className="mega-col">
          <div className="mega-title">Resources</div>
          <Link to="/faq" className="mega-item" onClick={close}>
            FAQ
          </Link>
          <Link to="/UiTimer" className="mega-item" onClick={close}>
            Cooking Timer
          </Link>
          <Link to="/Appointment" className="mega-item" onClick={close}>
            My Appointments
          </Link>
          <Link to="/community" className="mega-item" onClick={close}>
            Community
          </Link>
        </div>

        <div className="mega-footer">
          <button type="button" className="mega-contact-btn" onClick={goToContact}>
            Contact Us
          </button>
        </div>
      </div>
    );
  }

  // Mobile Drawer Menu (stack navigation)
  const navigate = useNavigate();

  const menuTree = useMemo(
    () => ({
      title: "Menu",
      items: [
        { type: "action", label: "Assistant", action: "assistant" },
        { type: "link", label: "Home", to: "/home" },
        { type: "link", label: "Scan Products", to: "/Scan" },

        {
          type: "submenu",
          label: "Recipes",
          items: [
            { type: "link", label: "Create Recipe", to: "/createRecipe" },
            { type: "link", label: "Search Recipes", to: "/searchRecipes" },
            { type: "link", label: "Recipe Rating", to: "/RecipeRating" },
          ],
        },

        {
          type: "submenu",
          label: "Meal Planning",
          items: [
            { type: "link", label: "Meal Details", to: "/dashboard" },
            { type: "link", label: "Plan", to: "/Meal" },
            { type: "link", label: "Daily Meal", to: "/daily-plan-edit" },
          ],
        },

        {
          type: "submenu",
          label: "Health",
          items: [
            { type: "link", label: "Health FAQ", to: "/HealthFAQ" },
            { type: "link", label: "Health Tools", to: "/HealthTools" },
            { type: "link", label: "Health News", to: "/healthnews" },
            { type: "link", label: "Symptom Assessment", to: "/symptomassessment" },
            { type: "link", label: "Fitness Roadmap", to: "/survey" },
          ],
        },

        {
          type: "submenu",
          label: "Resources",
          items: [
            { type: "link", label: "FAQ", to: "/faq" },
            { type: "link", label: "Cooking Timer", to: "/UiTimer" },
            { type: "link", label: "My Appointments", to: "/Appointment" },
            { type: "link", label: "Community", to: "/community" },
          ],
        },

        { type: "link", label: "Settings", to: "/settings" },

        /* {
          type: "submenu",
          label: "Settings",
          items: [
            { type: "link", label: "Display", to: "/settings#display" },
            { type: "link", label: "Font Size", to: "/settings#font" },
            { type: "link", label: "Accessibility", to: "/settings#accessibility" },
            { type: "link", label: "Notifications", to: "/settings#notifications" },
            { type: "link", label: "Language", to: "/settings#language" },
            { type: "link", label: "Voice & Audio", to: "/settings#voice" },
          ],
        }, */

        {
          type: "submenu",
          label: "Account",
          items: [
            { type: "link", label: "Profile", to: "/userProfile" },
            { type: "link", label: "Dietary Preference", to: "/dietaryRequirements" },
            { type: "link", label: "Allergies & Intolerances", to: "/preferences" },
            { type: "link", label: "Log Out", to: "/login" },
          ],
        },

        { type: "action", label: "Contact Us", action: "contact" },
      ],
    }),
    []
  );


  const [stack, setStack] = useState([menuTree]);

  const current = stack[stack.length - 1];

  const goBack = () => {
    if (stack.length > 1) setStack((s) => s.slice(0, -1));
  };

  const goTo = (to) => {
    navigate(to);
    close();
  };

  const doContact = () => {
    close();
    // If on home, scroll; otherwise navigate home first then scroll.
    navigate("/home");
    setTimeout(() => {
      const el = document.getElementById("contact");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  const doAssistant = () => {
    close();
    navigate("/chat");
  };


  return (
    <div className="mobile-menu">
      <div className="mobile-menu-header">
        <div className="mobile-menu-title">{current.title}</div>
        <button
          type="button"
          className="mobile-menu-close"
          onClick={() => (typeof onClose === "function" ? onClose() : close())}
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="mobile-menu-list" role="menu" aria-label="Navigation items">
        {stack.length > 1 && (
          <button type="button" className="mobile-menu-item" onClick={goBack}>
            <span className="mobile-item-left">
              <ChevronLeft /> Back
            </span>
          </button>
        )}

        {current.items.map((item, idx) => {
          if (item.type === "link") {
            return (
              <button
                key={`${item.label}-${idx}`}
                type="button"
                className="mobile-menu-item"
                onClick={() => goTo(item.to)}
                role="menuitem"
              >
                <span className="mobile-item-left">{item.label}</span>
              </button>
            );
          }

          if (item.type === "action" && item.action === "contact") {
            return (
              <button
                key={`${item.label}-${idx}`}
                type="button"
                className="mobile-menu-item"
                onClick={doContact}
                role="menuitem"
              >
                <span className="mobile-item-left">{item.label}</span>
              </button>
            );
          }

          if (item.type === "submenu") {
            return (
              <button
                key={`${item.label}-${idx}`}
                type="button"
                className="mobile-menu-item mobile-menu-item-sub"
                onClick={() =>
                  setStack((s) => [...s, { title: item.label, items: item.items }])
                }
                role="menuitem"
                aria-haspopup="true"
              >
                <span className="mobile-item-left">{item.label}</span>
                <span className="mobile-item-right">
                  <ChevronRight />
                </span>
              </button>
            );
          }

          if (item.type === "action" && item.action === "assistant") {
            return (
              <button
                key={`${item.label}-${idx}`}
                type="button"
                className="mobile-menu-item mobile-menu-item-assistant"
                onClick={doAssistant}
                role="menuitem"
              >
                <span className="mobile-item-left">{item.label}</span>
              </button>
            );
          }

          if (item.type === "group") {
            
            return (
              <div key={`${item.label}-${idx}`} className="mobile-menu-group">
                <div className="mobile-menu-group-title">{item.label}</div>
                {item.items.map((g, gidx) => (
                  <button
                    key={`${g.label}-${gidx}`}
                    type="button"
                    className="mobile-menu-item"
                    onClick={() => goTo(g.to)}
                    role="menuitem"
                  >
                    <span className="mobile-item-left">{g.label}</span>
                  </button>
                ))}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default SideMenu;
