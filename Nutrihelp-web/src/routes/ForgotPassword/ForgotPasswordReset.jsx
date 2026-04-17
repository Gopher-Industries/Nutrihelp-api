"use client";

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

/**
 * ForgotPasswordReset.jsx
 * - Expects location.state.email (and optionally code)
 * - Submits new password to POST /api/password/reset
 */

export default function ForgotPasswordReset() {
  const location = useLocation();
  const navigate = useNavigate();

  const providedEmail = (location && location.state && location.state.email) || "";
  const providedCode = (location && location.state && location.state.code) || "";

  const [email] = useState(providedEmail);
  const [code] = useState(providedCode);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState("");

  const pwChecks = {
    min8: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(password),
  };

  const handleReset = async (e) => {
    e?.preventDefault();
    setServerMsg("");

    if (!email) {
      setServerMsg("Missing email — cannot reset.");
      return;
    }
    if (password !== confirmPassword) {
      setServerMsg("Passwords do not match.");
      return;
    }
    const allOk = Object.values(pwChecks).every(Boolean);
    if (!allOk) {
      setServerMsg("Please choose a stronger password meeting the requirements.");
      return;
    }

    setLoading(true);
    try {
      const body = { email, code, newPassword: password };
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.message || `Reset failed (HTTP ${res.status})`);
      }
      setServerMsg("Password updated! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setServerMsg(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const el = document.querySelector(".fpr-card input");
    if (el) el.setAttribute("autofocus", "true");
  }, []);

  return (
    <div>
      <style>{`
        :root{ --card-radius:18px; --page-bg:#eef7fb; --accent:#0000F5; --muted:#6b7280; --success:#10b981; }
        *{box-sizing:border-box}
        body{font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, Arial; margin:0;}
        .fpr-page{min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--page-bg); padding:28px;}
        .fpr-card{width:100%; max-width:760px; background:#fff; border-radius:var(--card-radius); box-shadow: 0 10px 30px rgba(15,23,42,0.06); padding:36px 48px; position:relative;}
        .fpr-back{position:absolute; top:18px; left:18px; color:var(--muted); font-size:14px; cursor:pointer; user-select:none;}
        .fpr-icon{display:block; margin:8px auto 6px; width:54px; height:54px; color:var(--accent);}
        .fpr-title{text-align:center; font-size:22px; font-weight:700; margin:6px 0;}
        .fpr-sub{text-align:center; font-size:13px; color:var(--muted); max-width:560px; margin:0 auto 18px;}
        .fpr-field{margin:12px 0;}
        .fpr-field label{display:block; font-weight:700; font-size:13px; margin-bottom:6px; color:#111827;}

        /* >>> FORCE WHITE, 5px radius for form inputs <<< */
        .fpr-card input,
        .fpr-card input.fprOverride {
          background: #ffffff !important;
          border-radius: 5px !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
          color: #111827 !important;
          -webkit-appearance: none !important;
          appearance: none !important;
        }

        .fpr-card input {
          width:100% !important;
          height:48px !important;
          padding:10px 14px !important;
          font-size:15px !important;
        }

        .fpr-card input::placeholder { color: #9ca3af !important; opacity:1 !important; }

        .fpr-card input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 6px rgba(37,99,235,0.06) !important;
          background: #ffffff !important;
          outline: none !important;
        }

        .fpr-checklist{margin-top:10px; font-size:13px; color:var(--muted);}
        .fpr-checklist li{margin:6px 0; display:flex; gap:8px; align-items:center;}
        .fpr-checklist li.ok{color:var(--success); font-weight:600;}
        .fpr-actions{display:flex; justify-content:flex-end; margin-top:20px;}
        .fpr-btn{min-width:120px; padding:10px 16px; border-radius:8px; border:1px solid #c7c7c7; background:white; color:var(--accent); cursor:pointer; font-weight:600;}
        .fpr-btn.primary{background:var(--accent); color:#fff; border:0;}
        .fpr-msg{ margin-top:12px; text-align:center; color:#b91c1c; }

        /* extremely specific fallback global override */
        html body .fpr-card input { background: #fff !important; border-radius: 5px !important; }

        @media (max-width:720px){
          .fpr-card{padding:22px;}
        }
      `}</style>

      <div className="fpr-page">
        <div className="fpr-card">
          <div className="fpr-back" onClick={() => navigate("/forgot/verify")}>← Back to Code</div>

          <svg className="fpr-icon" xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#0000F5" aria-hidden>
            <path d="M481-779.67q107.33 0 202.33 45.84 95 45.83 158 131.83 4.34 6.33 3.17 10.67-1.17 4.33-5.17 8-4 3.66-9.66 3.5Q824-580 819.33-586q-57.66-80.67-147.5-123.83Q582-753 481-753q-101 0-189.33 43.5-88.34 43.5-147 123.5-4.67 6.33-9.67 7.33t-9.67-2q-5-3-5.5-8.5t2.84-10.83q62-85.67 156.5-132.67 94.5-47 201.83-47Zm0 95.34q135.67 0 233 90 97.33 90 97.33 222.33 0 47.33-34.5 79.83t-83.5 32.5q-49.66 0-85.16-32.5T572.67-372q0-37-27.17-61.83-27.17-24.84-64.5-24.84t-64.83 24.84Q388.67-409 388.67-372q0 101.67 61.16 169.67Q511-134.33 604-107q7 2.33 9 6.67 2 4.33.67 9.66-1.34 5.67-5.34 8.67T598-81q-103.33-26-169.67-103.17Q362-261.33 362-372q0-48 35-80.67 35-32.66 84-32.66t84 32.66Q600-420 600-372q0 36.33 28 61.17Q656-286 693.33-286 730-286 757-310.83q27-24.84 27-61.17 0-120.67-89.33-202.33Q605.33-656 481.33-656T268-574.33q-89.33 81.66-89.33 202 0 24 5.16 61.66Q189-273 206.67-224.33 209-218 206.5-214t-7.17 6.33q-5.33 2.34-10.83.5-5.5-1.83-7.83-7.83-13.67-38.33-20.84-77.5-7.16-39.17-7.16-79.5 0-130.33 97.5-221.33t230.83-91Zm0-195.34q64.67 0 126.67 15.84 62 15.83 119 44.83 6.33 3 7.16 8 .84 5-1.5 9.33-2.33 4.34-7 7Q720.67-792 714-795q-54.33-27-113.17-42.17Q542-852.33 481-852.33q-60.67 0-118.67 14.16-58 14.17-111 43.17-6 3-10.33 1.17-4.33-1.84-7-6.5-2.67-4-2-8.84.67-4.83 5.33-7.83Q294-847.67 356-863.67t125-16Zm0 295q92.33 0 159 61.5T706.67-372q0 6.33-3.5 9.83t-9.84 3.5q-6 0-10-3.5t-4-9.83q0-79-58.83-132.5T481-558q-80.67 0-138.5 53.5T284.67-372q0 83.67 29 142.5t85.66 117.83Q404-107 403.67-102q-.34 5-4.34 9-3.33 3.33-9 4.33-5.66 1-10.33-4.33-58.33-60.67-90.5-126.17T257.33-372q0-89.67 65.67-151.17 65.67-61.5 158-61.5ZM480-386q6.33 0 9.83 4t3.5 10q0 79 57.67 130t133.67 51q7.33 0 18.33-1 11-1 23.67-3 6.33-1.33 10.5 1.83 4.16 3.17 5.5 8.17 1.33 5.33-1.34 9.33-2.66 4-8.66 5.34-18 5-31.5 5.5t-16.5.5q-88.34 0-153.17-59-64.83-59-64.83-148.67 0-6 3.5-10t9.83-4Z"/>
          </svg>

          <h2 className="fpr-title">Reset Your Password</h2>
          <p className="fpr-sub">Create a new password for your NutriHelp account. Make sure it's strong and easy for you to remember.</p>

          <form onSubmit={handleReset}>
            <div className="fpr-field">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#666",
                    padding: 6,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="fpr-field">
              <label>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#666",
                    padding: 6,
                  }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <ul className="fpr-checklist" aria-live="polite">
              <li className={pwChecks.min8 ? "ok" : ""}>{pwChecks.min8 ? "✓" : "○"} Minimum 8 characters</li>
              <li className={pwChecks.uppercase ? "ok" : ""}>{pwChecks.uppercase ? "✓" : "○"} At least 1 uppercase letter</li>
              <li className={pwChecks.number ? "ok" : ""}>{pwChecks.number ? "✓" : "○"} At least 1 number</li>
              <li className={pwChecks.special ? "ok" : ""}>{pwChecks.special ? "✓" : "○"} At least 1 special character</li>
            </ul>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              {serverMsg && <div style={{ color: serverMsg.includes("updated") ? "#065f46" : "#b91c1c" }}>{serverMsg}</div>}
            </div>

            <div className="fpr-actions" style={{ marginTop: 16 }}>
              <button type="button" className="fpr-btn" onClick={() => navigate("/forgot/verify")} style={{ marginRight: 12 }}>Back to code</button>
              <button type="submit" className="fpr-btn primary" disabled={loading}>{loading ? "Submitting..." : "Submit"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
