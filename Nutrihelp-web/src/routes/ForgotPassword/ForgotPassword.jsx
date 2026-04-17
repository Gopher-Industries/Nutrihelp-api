"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [serverMsg, setServerMsg] = useState("");

  const isValidEmail = (e) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());

  const handleSendCode = async (e) => {
    e?.preventDefault();
    setEmailError("");
    setServerMsg("");

    if (!isValidEmail(emailInput)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/password/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.message || `Request failed (HTTP ${res.status})`);
      }
      setServerMsg("If that email exists, a code was sent. Check your inbox.");
      // Navigate to verify step and pass email in location state
      navigate("/forgot/verify", { state: { email: emailInput.trim().toLowerCase() } });
    } catch (err) {
      setEmailError(err.message || "Unable to request reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/login");
  };

  return (
    <div>
      <style>{`
        :root{
          --card-radius:18px;
          --page-bg:#eef7fb;
          --accent:#0000F5;
          --muted:#6b7280;
          --input-border:#d1d5db;
          --input-focus: #60a5fa;
        }
        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{ margin:0; font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, Arial; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;}
        .fp-page{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--page-bg);
          padding:28px;
        }
        .fp-card{
          width:100%;
          max-width:760px;
          background:#fff;
          border-radius:var(--card-radius);
          box-shadow: 0 10px 30px rgba(15,23,42,0.06);
          padding:36px 48px;
          position:relative;
        }
        .fp-back{
          position:absolute;
          top:18px;
          left:18px;
          color:var(--muted);
          font-size:14px;
          cursor:pointer;
          user-select:none;
        }
        .fp-icon{
          display:block;
          margin:8px auto 6px;
          width:54px;
          height:54px;
          color:var(--accent);
        }
        .fp-title{
          text-align:center;
          font-size:22px;
          font-weight:700;
          margin:6px 0;
        }
        .fp-sub{
          text-align:center;
          font-size:13px;
          color:var(--muted);
          max-width:560px;
          margin:0 auto 18px;
        }

        /* field */
        .fp-field{ margin:12px 0; }
        /* strong specificity: target input and label inside fp-card to override global rules */
        .fp-card .fp-field label{
          display:block !important;
          font-weight:700 !important;
          font-size:13px !important;
          margin-bottom:6px !important;
          color:#111827 !important;
          background: transparent !important;
          user-select: none !important;
        }

        /* Remove label selection highlight and hover effects */
        .fp-card .fp-field label::selection {
          background: transparent !important;
          color: #111827 !important;
        }
        .fp-card .fp-field label:hover {
          background: transparent !important;
          color: #111827 !important;
        }
        .fp-card .fp-field label:focus {
          outline: none !important;
          box-shadow: none !important;
        }

        /*
         * INPUT STYLE (FORCED):
         * - white background
         * - square: border-radius: 0
         * - high-contrast text color
         * - visible placeholder color
         * - strong !important to beat global resets
         */
        .fp-card .fp-field input{
          width:100% !important;
          height:48px !important;
          padding:10px 12px !important;
          border-radius:0px !important;            /* fully square - no curve */
          border:1px solid var(--input-border) !important;
          background: #ffffff !important;          /* white input box */
          font-size:15px !important;
          color:#111827 !important;                /* dark text for visibility */
          outline:none !important;
          transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          caret-color: #111827 !important;
        }
        .fp-card .fp-field input::placeholder{ color:#9ca3af !important; opacity:1; }
        .fp-card .fp-field input:focus{
          box-shadow: 0 6px 20px rgba(59,130,246,0.08) !important;
          border-color: var(--input-focus) !important;
          background: #ffffff !important;
        }

        .fp-card .fp-field .small-msg{
          font-size:13px !important;
          color:var(--muted) !important;
          margin-top:8px !important;
          text-align:left !important;         /* force left alignment */
          width:100% !important;
        }

        .fp-actions{
          display:flex;
          justify-content:flex-end;
          margin-top:20px;
          gap:12px;
          flex-wrap:wrap;
        }
        .fp-btn{
          min-width:120px;
          padding:10px 16px;
          border-radius:8px;
          border:1px solid #c7c7c7;
          background:white;
          color:var(--accent);
          cursor:pointer;
          font-weight:600;
        }
        .fp-btn[disabled]{ opacity:0.7; cursor:not-allowed; }
        .fp-btn.primary{
          background:var(--accent);
          color:#fff;
          border:0;
        }

        .fp-msg{
          margin-top:12px;
          text-align:center;
          color:#b91c1c;
        }

        /* responsive tweaks */
        @media (max-width:880px){
          .fp-card{ padding:28px; }
          .fp-icon{ width:48px; height:48px; }
        }
        @media (max-width:560px){
          .fp-card{ padding:20px; margin:10px; border-radius:12px; }
          .fp-title{ font-size:20px; }
          .fp-field input{ height:46px; font-size:15px; }
          .fp-actions{ justify-content:center; }
          .fp-btn{ width:48%; min-width:0; }
        }
      `}</style>

      <div className="fp-page">
        <div className="fp-card" role="region" aria-labelledby="fp-title">
          <div className="fp-back" onClick={handleBack}>← Back to Login</div>

          {/* icon */}
          <svg
            className="fp-icon"
            xmlns="http://www.w3.org/2000/svg"
            height="40px"
            viewBox="0 -960 960 960"
            width="40px"
            fill="#0000F5"
            aria-hidden
          >
            <path d="M481-779.67q107.33 0 202.33 45.84 95 45.83 158 131.83 4.34 6.33 3.17 10.67-1.17 4.33-5.17 8-4 3.66-9.66 3.5Q824-580 819.33-586q-57.66-80.67-147.5-123.83Q582-753 481-753q-101 0-189.33 43.5-88.34 43.5-147 123.5-4.67 6.33-9.67 7.33t-9.67-2q-5-3-5.5-8.5t2.84-10.83q62-85.67 156.5-132.67 94.5-47 201.83-47Zm0 95.34q135.67 0 233 90 97.33 90 97.33 222.33 0 47.33-34.5 79.83t-83.5 32.5q-49.66 0-85.16-32.5T572.67-372q0-37-27.17-61.83-27.17-24.84-64.5-24.84t-64.83 24.84Q388.67-409 388.67-372q0 101.67 61.16 169.67Q511-134.33 604-107q7 2.33 9 6.67 2 4.33.67 9.66-1.34 5.67-5.34 8.67T598-81q-103.33-26-169.67-103.17Q362-261.33 362-372q0-48 35-80.67 35-32.66 84-32.66t84 32.66Q600-420 600-372q0 36.33 28 61.17Q656-286 693.33-286 730-286 757-310.83q27-24.84 27-61.17 0-120.67-89.33-202.33Q605.33-656 481.33-656T268-574.33q-89.33 81.66-89.33 202 0 24 5.16 61.66Q189-273 206.67-224.33 209-218 206.5-214t-7.17 6.33q-5.33 2.34-10.83.5-5.5-1.83-7.83-7.83-13.67-38.33-20.84-77.5-7.16-39.17-7.16-79.5 0-130.33 97.5-221.33t230.83-91Zm0-195.34q64.67 0 126.67 15.84 62 15.83 119 44.83 6.33 3 7.16 8 .84 5-1.5 9.33-2.33 4.34-7 7Q720.67-792 714-795q-54.33-27-113.17-42.17Q542-852.33 481-852.33q-60.67 0-118.67 14.16-58 14.17-111 43.17-6 3-10.33 1.17-4.33-1.84-7-6.5-2.67-4-2-8.84.67-4.83 5.33-7.83Q294-847.67 356-863.67t125-16Zm0 295q92.33 0 159 61.5T706.67-372q0 6.33-3.5 9.83t-9.84 3.5q-6 0-10-3.5t-4-9.83q0-79-58.83-132.5T481-558q-80.67 0-138.5 53.5T284.67-372q0 83.67 29 142.5t85.66 117.83Q404-107 403.67-102q-.34 5-4.34 9-3.33 3.33-9 4.33-5.66 1-10.33-4.33-58.33-60.67-90.5-126.17T257.33-372q0-89.67 65.67-151.17 65.67-61.5 158-61.5ZM480-386q6.33 0 9.83 4t3.5 10q0 79 57.67 130t133.67 51q7.33 0 18.33-1 11-1 23.67-3 6.33-1.33 10.5 1.83 4.16 3.17 5.5 8.17 1.33 5.33-1.34 9.33-2.66 4-8.66 5.34-18 5-31.5 5.5t-16.5.5q-88.34 0-153.17-59-64.83-59-64.83-148.67 0-6 3.5-10t9.83-4Z"/>
          </svg>

          <h2 id="fp-title" className="fp-title">Forgot Password</h2>
          <p className="fp-sub">Enter your email and we'll send a verification code to reset your password.</p>

          <form onSubmit={handleSendCode} noValidate>
            <div className="fp-field">
              <label htmlFor="fp-email">Email address</label>
              <input
                id="fp-email"
                name="email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "fp-email-error" : undefined}
              />
              {emailError ? (
                <div id="fp-email-error" className="fp-field small-msg" style={{ color: "#b91c1c" }}>{emailError}</div>
              ) : (
                <div className="fp-field small-msg">We will send a 6-digit code to this email if it exists in our system.</div>
              )}
            </div>

            <div style={{ textAlign: "center" }}>
              {serverMsg && <div style={{ color: "#065f46", marginBottom: 8 }}>{serverMsg}</div>}
            </div>

            <div className="fp-actions">
              <button className="fp-btn" type="button" onClick={handleBack} style={{ marginRight: 12 }}>Cancel</button>
              <button className="fp-btn primary" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send code"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
