"use client";

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ForgotPasswordVerify() {
  const location = useLocation();
  const navigate = useNavigate();
  const providedEmail = (location && location.state && location.state.email) || "";

  const [email] = useState(providedEmail);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [serverMsg, setServerMsg] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    setResendTimer(30);
    setCanResend(false);
  }, [email]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
    setCanResend(true);
  }, [resendTimer]);

  const handleCodeChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[index] = val.slice(-1);
    setCode(next);
    if (val && index < 5) {
      document.getElementById(`fpv-code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      document.getElementById(`fpv-code-${i - 1}`)?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) {
      document.getElementById(`fpv-code-${i - 1}`)?.focus();
    }
    if (e.key === "ArrowRight" && i < 5) {
      document.getElementById(`fpv-code-${i + 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const txt = (e.clipboardData || window.clipboardData).getData("text");
    const digits = txt.replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length === 0) return;
    const next = ["", "", "", "", "", ""];
    digits.forEach((d, i) => (next[i] = d));
    setCode(next);
    document.getElementById(`fpv-code-${Math.min(digits.length, 5)}`)?.focus();
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setVerifyError("");
    setServerMsg("");
    const full = code.join("");
    if (full.length !== 6) {
      setVerifyError("Please enter the 6-digit code.");
      return;
    }
    if (!email) {
      setVerifyError("Missing email. Go back and request a reset code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: full }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.message || "Invalid code");
      }
      // navigate to reset - pass code if you want
      navigate("/forgot/reset", { state: { email, code: full } });
    } catch (err) {
      setVerifyError(err.message || "Verification failed");
      setCode(["", "", "", "", "", ""]);
      document.getElementById("fpv-code-0")?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    if (!email) {
      setVerifyError("Missing email — cannot resend.");
      return;
    }
    setCanResend(false);
    setResendTimer(30);
    setServerMsg("");
    setVerifyError("");
    try {
      const res = await fetch("/api/password/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || d.message || "Unable to resend code");
      }
      setServerMsg("A new code was sent to your email.");
    } catch (err) {
      setVerifyError(err.message || "Resend failed");
    }
  };

  const handleChangeEmail = () => navigate("/forgot");

  return (
    <div>
      <style>{`
        :root{ --card-radius:18px; --page-bg:#eef7fb; --accent:#0000F5; --muted:#6b7280; --success:#10b981; }
        *{box-sizing:border-box}
        body{font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, Arial; margin:0;}
        .fpv-page{min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--page-bg); padding:28px;}
        .fpv-card{width:100%; max-width:960px; background:#fff; border-radius:var(--card-radius); box-shadow: 0 20px 50px rgba(15,23,42,0.06); padding:44px 64px; position:relative;}
        .fpv-back{position:absolute; top:18px; left:18px; color:var(--muted); font-size:14px; cursor:pointer; user-select:none;}
        .fpv-icon{display:block; margin:8px auto 6px; width:54px; height:54px; color:var(--accent);}
        .fpv-title{text-align:center; font-size:22px; font-weight:700; margin:6px 0;}
        .fpv-sub{text-align:center; font-size:15px; color:var(--muted); max-width:720px; margin:0 auto 18px;}

        /* ===== CODE INPUTS: force white, 5px corners (square-ish) ===== */
        /* Use high-specificity selector and !important to override global CSS */
        .fpv-card .fpv-code-row .fpv-code-input{
          width:64px !important;
          height:52px !important;
          border-radius:5px !important;          /* 5px corner radius */
          border:1px solid #cbd5e1 !important;   /* solid subtle border */
          background: #ffffff !important;        /* force white */
          -webkit-appearance: none !important;
          appearance: none !important;
          font-size:20px !important;
          text-align:center !important;
          outline:none !important;
          box-shadow: none !important;
          color: #111827 !important;
          transition: box-shadow .12s, border-color .12s, transform .06s;
        }

        /* ensure placeholder visible */
        .fpv-card .fpv-code-row .fpv-code-input::placeholder { color: #9ca3af !important; opacity: 1 !important; }

        .fpv-card .fpv-code-row .fpv-code-input:focus{
          border-color: #2563eb !important;
          box-shadow: 0 8px 26px rgba(37,99,235,0.08) !important;
          background: #ffffff !important;
          transform: translateY(-1px);
        }

        .fpv-code-row{display:flex; justify-content:center; gap:20px; align-items:center; margin:26px 0 10px;}
        .fpv-helper{text-align:center; color:var(--muted); font-size:13px; margin-top:8px;}
        .fpv-resend{ color:var(--accent); cursor:pointer; text-decoration:underline; background:none; border:0; padding:0; font-weight:600; }

        .fpv-actions{display:flex; justify-content:flex-end; margin-top:20px;}
        .fpv-btn{min-width:120px; padding:10px 16px; border-radius:8px; border:1px solid #c7c7c7; background:white; color:var(--accent); cursor:pointer; font-weight:600;}
        .fpv-btn.primary{background:var(--accent); color:#fff; border:0;}

        @media (max-width:920px){
          .fpv-card{padding:28px; max-width:760px;}
          .fpv-card .fpv-code-row .fpv-code-input{ width:56px !important; height:48px !important; font-size:18px !important; }
        }
        @media (max-width:520px){
          .fpv-card{padding:18px; border-radius:14px;}
          .fpv-card .fpv-code-row .fpv-code-input{ width:48px !important; height:46px !important; font-size:18px !important; }
          .fpv-code-row{gap:12px;}
        }
      `}</style>

      <div className="fpv-page">
        <div className="fpv-card">
          <div className="fpv-back" onClick={() => navigate("/login")}>← Back to Login</div>

          {/* svg icon */}
          <svg className="fpv-icon" xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#0000F5" aria-hidden>
            <path d="M481-779.67q107.33 0 202.33 45.84 95 45.83 158 131.83 4.34 6.33 3.17 10.67-1.17 4.33-5.17 8-4 3.66-9.66 3.5Q824-580 819.33-586q-57.66-80.67-147.5-123.83Q582-753 481-753q-101 0-189.33 43.5-88.34 43.5-147 123.5-4.67 6.33-9.67 7.33t-9.67-2q-5-3-5.5-8.5t2.84-10.83q62-85.67 156.5-132.67 94.5-47 201.83-47Zm0 95.34q135.67 0 233 90 97.33 90 97.33 222.33 0 47.33-34.5 79.83t-83.5 32.5q-49.66 0-85.16-32.5T572.67-372q0-37-27.17-61.83-27.17-24.84-64.5-24.84t-64.83 24.84Q388.67-409 388.67-372q0 101.67 61.16 169.67Q511-134.33 604-107q7 2.33 9 6.67 2 4.33.67 9.66-1.34 5.67-5.34 8.67T598-81q-103.33-26-169.67-103.17Q362-261.33 362-372q0-48 35-80.67 35-32.66 84-32.66t84 32.66Q600-420 600-372q0 36.33 28 61.17Q656-286 693.33-286 730-286 757-310.83q27-24.84 27-61.17 0-120.67-89.33-202.33Q605.33-656 481.33-656T268-574.33q-89.33 81.66-89.33 202 0 24 5.16 61.66Q189-273 206.67-224.33 209-218 206.5-214t-7.17 6.33q-5.33 2.34-10.83.5-5.5-1.83-7.83-7.83-13.67-38.33-20.84-77.5-7.16-39.17-7.16-79.5 0-130.33 97.5-221.33t230.83-91Zm0-195.34q64.67 0 126.67 15.84 62 15.83 119 44.83 6.33 3 7.16 8 .84 5-1.5 9.33-2.33 4.34-7 7Q720.67-792 714-795q-54.33-27-113.17-42.17Q542-852.33 481-852.33q-60.67 0-118.67 14.16-58 14.17-111 43.17-6 3-10.33 1.17-4.33-1.84-7-6.5-2.67-4-2-8.84.67-4.83 5.33-7.83Q294-847.67 356-863.67t125-16Zm0 295q92.33 0 159 61.5T706.67-372q0 6.33-3.5 9.83t-9.84 3.5q-6 0-10-3.5t-4-9.83q0-79-58.83-132.5T481-558q-80.67 0-138.5 53.5T284.67-372q0 83.67 29 142.5t85.66 117.83Q404-107 403.67-102q-.34 5-4.34 9-3.33 3.33-9 4.33-5.66 1-10.33-4.33-58.33-60.67-90.5-126.17T257.33-372q0-89.67 65.67-151.17 65.67-61.5 158-61.5ZM480-386q6.33 0 9.83 4t3.5 10q0 79 57.67 130t133.67 51q7.33 0 18.33-1 11-1 23.67-3 6.33-1.33 10.5 1.83 4.16 3.17 5.5 8.17 1.33 5.33-1.34 9.33-2.66 4-8.66 5.34-18 5-31.5 5.5t-16.5.5q-88.34 0-153.17-59-64.83-59-64.83-148.67 0-6 3.5-10t9.83-4Z"/>
          </svg>

          <h2 className="fpv-title">Forget Password</h2>
          <p className="fpv-sub">Enter the 6-digit verification code sent to your email.</p>

          <form onSubmit={handleVerify} onPaste={handlePaste}>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <div style={{ marginBottom: 6, fontSize: 14, color: "#111827" }}>
                {email ? <span style={{opacity:0.9}}>Code sent to <strong>{email}</strong></span> : <span style={{opacity:0.9}}>No email provided</span>}
              </div>
            </div>

            <div className="fpv-code-row" role="group" aria-label="Enter verification code">
              {code.map((d, i) => (
                <input
                  key={i}
                  id={`fpv-code-${i}`}
                  className="fpv-code-input"
                  value={d}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  autoFocus={i === 0}
                  aria-label={`digit ${i+1}`}
                  autoComplete="one-time-code"
                  placeholder=""
                />
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              {verifyError && <div style={{ color: "#b91c1c", marginTop: 8 }}>{verifyError}</div>}
              {serverMsg && <div style={{ color: "#065f46", marginTop: 8 }}>{serverMsg}</div>}
            </div>

            <div className="fpv-helper">
              Haven't received it?{" "}
              <button type="button" className="fpv-resend" onClick={handleResend} disabled={!canResend || loading}>
                {canResend ? "Resend a new code" : `Resend in ${resendTimer}s`}
              </button>
            </div>

            <div className="fpv-actions" style={{ marginTop: 18 }}>
              <button type="button" className="fpv-btn" onClick={handleChangeEmail} style={{ marginRight: 12 }}>Change email</button>
              <button type="submit" className="fpv-btn primary" disabled={loading}>{loading ? "Verifying..." : "Submit"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
