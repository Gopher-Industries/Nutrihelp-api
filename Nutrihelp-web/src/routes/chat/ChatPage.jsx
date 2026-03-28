// chat/ChatPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ChatPage.css";

/* ---------------- Utils ---------------- */

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(d) {
  const h24 = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h24 >= 12 ? "pm" : "am";
  const h12 = ((h24 + 11) % 12) + 1;
  return `Today, ${h12}:${m}${ampm}`;
}

/* ---------------- Page ---------------- */

export default function ChatPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesRef = useRef(null);

  const navLinks = useMemo(
    () => [
      "Home",
      "Menu",
      "Meal Planning",
      "Edit Daily Plan",
      "Health News",
      "Fitness Roadmap",
      "Community",
      "Health FAQ",
      "Recipes",
      "Scan Products",
      "Allergies & Intolerances",
      "Symptom Assessment",
      "Health Tools",
      "Settings",
    ],
    []
  );

  const [messages, setMessages] = useState(() => [
    { id: uid(), side: "left", text: "Hey There!", time: "Today, 8:30pm" },
    { id: uid(), side: "left", text: "How are you?", time: "Today, 8:30pm" },
    { id: uid(), side: "right", text: "Hello!", time: "Today, 8:33pm" },
    { id: uid(), side: "right", text: "I am fine and how are you?", time: "Today, 8:34pm" },
    {
      id: uid(),
      side: "left",
      text: "I would like some advice on my calorie intake!",
      time: "Today, 8:36pm",
    },
    { id: uid(), side: "right", text: "Yes sure!", time: "Today, 8:58pm" },
  ]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  function sendMessage(e) {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), side: "right", text, time: formatTime(new Date()) },
    ]);
    setDraft("");
  }

  return (
    <div className="nh-root">
      {/* ---------- Topbar ---------- */}
      <header className="nh-topbar">
        <button
          className="nh-hamburger"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="nh-brand">
          <div className="nh-logo">🍃</div>
          <b>NutriHelp</b>
        </div>

        <div className="nh-rightlinks">
          <span>Account</span>
          <span>Log out</span>
        </div>
      </header>

      {/* ---------- Drawer ---------- */}
      <div
        className={`nh-drawerOverlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`nh-drawer ${menuOpen ? "open" : ""}`}>
        <button className="nh-drawerClose" onClick={() => setMenuOpen(false)}>
          ×
        </button>

        <nav className="nh-drawerNav">
          {navLinks.map((t) => (
            <a key={t} href="#" className="nh-drawerLink">
              {t}
            </a>
          ))}
        </nav>
      </aside>

      {/* ---------- Chat ---------- */}
      <main className="nh-app">
        <section className="nh-chatCard">
          <div className="nh-chatHeader">
            <h2>Anon</h2>
          </div>

          <div className="nh-messages" ref={messagesRef}>
            {messages.map((m) => (
              <div key={m.id} className={`nh-msgRow ${m.side}`}>
                <div className="nh-msgWrap">
                  <div className={`nh-bubble ${m.side}`}>{m.text}</div>
                  <div className={`nh-meta ${m.side}`}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          <form className="nh-composer" onSubmit={sendMessage}>
            <div className="nh-inputWrap">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message here..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>

            <button className="nh-sendBtn" type="submit">
              ➤
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
