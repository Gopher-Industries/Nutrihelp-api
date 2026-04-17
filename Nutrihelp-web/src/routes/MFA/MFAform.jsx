"use client"

import { useState, useContext, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "./MFAform.css"
import { UserContext } from "../../context/user.context"

export default function MFAform() {
  const [codes, setCodes] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [error, setError] = useState("")

  const navigate = useNavigate()
  const location = useLocation()
  const { user, setCurrentUser } = useContext(UserContext)

  // prefer explicit email/password passed from previous route, otherwise use user.email (if available)
  const { email: locEmail, password: locPassword } = location.state || {}
  const email = locEmail || user?.email || ""
  const password = locPassword || ""

  // ---- OTP INPUT HANDLING ----
  const handleInputChange = (index, value) => {
    // accept only digits
    if (!/^\d*$/.test(value)) return

    const newCodes = [...codes]
    newCodes[index] = value.slice(-1)
    setCodes(newCodes)

    // move focus to next input when typing
    if (value && index < 5) {
      document.getElementById(`digit-${index + 1}`)?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codes[index] && index > 0) {
      document.getElementById(`digit-${index - 1}`)?.focus()
    }
    if (e.key === "ArrowLeft" && index > 0) {
      document.getElementById(`digit-${index - 1}`)?.focus()
    }
    if (e.key === "ArrowRight" && index < 5) {
      document.getElementById(`digit-${index + 1}`)?.focus()
    }
  }

  // allow paste of full code
  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData("text")
    const digits = pasted.replace(/\D/g, "").slice(0, 6).split("")
    if (digits.length === 0) return
    const newCodes = ["", "", "", "", "", ""]
    digits.forEach((d, i) => (newCodes[i] = d))
    setCodes(newCodes)
    // focus after last pasted digit (or last input)
    const focusIndex = Math.min(digits.length, 5)
    document.getElementById(`digit-${focusIndex}`)?.focus()
  }

  // ---- RESEND TIMER ----
  useEffect(() => {
    // start in disabled mode until timer reaches 0
    if (resendTimer > 0 && !canResend) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (resendTimer === 0) {
      setCanResend(true)
    }
  }, [resendTimer, canResend])

  // ---- SUBMIT (call old API logic) ----
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const code = codes.join("")
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.")
      return
    }

    if (!email || !password) {
      setError("Missing credentials (email/password).")
      return
    }

    setLoading(true)
    try {
      const mfa_token = code
      const resp = await fetch("https://localhost:443/api/login/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mfa_token }),
      })

      const data = await resp.json().catch(() => ({}))

      if (resp.ok) {
        // success: set current user and navigate
        if (data.user && typeof setCurrentUser === "function") {
          setCurrentUser(data.user)
        }
        navigate("/")
        // small user feedback (you can replace with toast)
        alert("MFA verification successful!")
      } else {
        // show error from server or generic message
        const errMsg = data.error || data.message || "Failed to verify MFA token"
        setError(errMsg)
        // optionally clear inputs on failure
        setCodes(["", "", "", "", "", ""])
        document.getElementById("digit-0")?.focus()
      }
    } catch (err) {
      console.error("Error verifying MFA token:", err)
      setError("Failed to verify MFA token. An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  // ---- RESEND (call backend endpoint and restart timer) ----
  const handleResend = async () => {
    if (!email) {
      setError("Cannot resend: missing email.")
      return
    }
    setError("")
    setCanResend(false)
    setResendTimer(60)
    setCodes(["", "", "", "", "", ""])
    document.getElementById("digit-0")?.focus()

    try {
      // call your resend endpoint (adjust path if backend differs)
      const resp = await fetch("https://localhost:443/api/login/resend-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (resp.ok) {
        // backend responded OK
        alert("Code resent to your email.")
      } else {
        const data = await resp.json().catch(() => ({}))
        const errMsg = data.error || "Failed to resend code"
        setError(errMsg)
      }
    } catch (err) {
      console.error("Resend failed:", err)
      setError("Failed to resend code. An error occurred.")
    }
  }

  return (
    <div className="mfa-container">
      <div className="mfa-wrapper">
        {/* ICON */}
        <div className="mfa-icon-container">
          <svg className="mfa-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
            <path d="M120-160v-112q0-34 17.5-62.5T184-378q62-31 126-46.5T440-440q20 0 40 1.5t40 4.5q-4 58 21 109.5t73 84.5v80H120ZM760-40l-60-60v-186q-44-13-72-49.5T600-420q0-58 41-99t99-41q58 0 99 41t41 99q0 45-25.5 80T790-290l50 50-60 60 60 60-80 80ZM440-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm300 80q17 0 28.5-11.5T780-440q0-17-11.5-28.5T740-480q-17 0-28.5 11.5T700-440q0 17 11.5 28.5T740-400Z" />
          </svg>
        </div>

        {/* HEADING */}
        <h1 className="mfa-title">Verify Your Identity</h1>

        {/* DESCRIPTION */}
        <p className="mfa-description">
          To keep your account secure, please enter the 6-digit verification code we sent to your registered email / mobile number.
        </p>

        {error && <div className="mfa-error">{error}</div>}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mfa-form" onPaste={handlePaste}>
          {/* OTP INPUTS */}
          <div className="mfa-inputs-container">
            {codes.map((code, index) => (
              <input
                key={index}
                id={`digit-${index}`}
                type="text"
                maxLength="1"
                value={code}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="mfa-input"
                inputMode="numeric"
                autoComplete="off"
              />
            ))}
          </div>

          {/* FOOTER WITH HELPER LEFT + BUTTON RIGHT */}
          <div className="mfa-footer-container">
            {/* LEFT TEXT */}
            <div className="mfa-helper-text">
              <p>It may take a minute to receive your code.</p>
              <p>
                Haven't received it?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend}
                  className={`mfa-resend-btn ${canResend ? "active" : "disabled"}`}
                >
                  {canResend ? "Resend a new code" : `Resend in ${resendTimer}s`}
                </button>
              </p>
            </div>

            {/* RIGHT BUTTON */}
            <button
              type="submit"
              disabled={codes.join("").length !== 6 || loading}
              className="mfa-submit-btn"
            >
              {loading ? "Verifying..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
