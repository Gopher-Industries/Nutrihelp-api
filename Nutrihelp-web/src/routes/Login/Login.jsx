"use client"

import React, { useState, useContext, useEffect } from "react"
import { Eye, EyeOff, UserIcon } from "lucide-react"
import loginImage from "../../images/Nutrihelp.jpg"
import logoImage from "../../images/logos_black_icon.png"

// ADDED IMPORTS
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { UserContext } from "../../context/user.context"
import { useDarkMode } from "../DarkModeToggle/DarkModeContext"
import { supabase } from "../../supabaseClient"
import { useNavigate, useLocation } from "react-router-dom"

function startInactivityWatcher({ enabled, seconds = 30, onTimeout }) {
  if (window.__idleInterval) {
    clearInterval(window.__idleInterval)
    window.__idleInterval = null
  }

  const EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"]
  const KEY_LAST = "__idle:lastActivity"

  const removeAll = (resetFn) =>
    EVENTS.forEach((e) => window.removeEventListener(e, resetFn, { passive: true }))

  if (!enabled) {
    localStorage.removeItem(KEY_LAST)
    return
  }

  const resetActivity = () => {
    localStorage.setItem(KEY_LAST, String(Date.now()))
  }

  resetActivity()
  EVENTS.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }))

  window.__idleInterval = setInterval(() => {
    const last = parseInt(localStorage.getItem(KEY_LAST) || "0", 10)
    if (!last) return
    const idleMs = Date.now() - last
    if (idleMs >= seconds * 1000) {
      clearInterval(window.__idleInterval)
      window.__idleInterval = null
      removeAll(resetActivity)
      localStorage.removeItem(KEY_LAST)
      onTimeout?.()
    }
  }, 1000)
}

export default function Login() {
  // Existing UI state (unchanged)

  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState({ email: "", password: "" })

  // ADDED / MERGED logic state & context
  const [loading, setLoading] = useState(false)
  const { setCurrentUser } = useContext(UserContext)
  const { darkMode } = useDarkMode()
  const navigate = useNavigate()
  const API_BASE = "https://localhost:443"

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // validateLogin preserved but now calls handleSignIn on success (instead of alert)
  const validateLogin = async (e) => {
    e.preventDefault()
    let valid = true
    const newErrors = { email: "", password: "" }

    if (!validateEmail(email)) {
      newErrors.email = "Enter valid email"
      valid = false
    }

    if (password.trim() === "") {
      newErrors.password = "Password required"
      valid = false
    }

    setErrors(newErrors)

    if (valid) {
      // previously: alert("Login successful")
      // now: perform the real sign-in flow (keeps UI intact)
      await handleSignIn()
    }
  }

  // Handles user sign-in using backend authentication API.

  const handleSignIn = async () => {
    setLoading(true)

    try {
      // ✅ Use backend API for login (matches backend's bcrypt-based auth)
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const data = await res.json()

      // Handle MFA required (202 status) - redirect to MFA page
      if (res.status === 202) {
        toast.info(data.message || "MFA token sent to your email")
        navigate("/mfa", { state: { email: email.trim().toLowerCase(), password } })
        return
      }

      if (!res.ok) {
        toast.error(data.error || data.warning || "Invalid email or password")
        return
      }

      const user = data.user
      const token = data.token

      // ✅ Save session with JWT token
      const userSession = {
        id: user.user_id,
        email: user.email,
        name: user.name,
        token: token,
        provider: "email",
      }

      localStorage.setItem("user_session", JSON.stringify(userSession))
      localStorage.setItem("auth_token", token)

      // ✅ Set global context (if used)
      if (typeof setCurrentUser === "function") {
        setCurrentUser(userSession, rememberMe ? 60 * 60 * 1000 : 0)
      }

    // ✅ Optional inactivity logout
    startInactivityWatcher({
      enabled: !rememberMe,
      seconds: 30,
      onTimeout: async () => {
        await supabase.auth.signOut()
        localStorage.removeItem("user_session")
        setCurrentUser?.(null)
        toast.info("You were signed out due to inactivity.")
        navigate("/login")
      },
    })

    toast.success("Welcome back!")
    navigate("/home")

  } catch (err) {
    console.error("Login error:", err)
    toast.error("Unable to sign in. Please try again later.")
  } finally {
    setLoading(false)
  }
}

  // keep Google sign-in logic from old code (unchanged)
  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/home`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      })
    } catch (err) {
      console.error("Google sign-in error:", err)
      toast.error("Google sign-in failed. Please try again.")
    }
  }

  const handleForgotPasswordClick = () => {
    navigate("/forgotPassword")
  }

  useEffect(() => {
  if (location.state?.message) {
    toast.success(location.state.message, {
      position: "top-right",
      autoClose: 4000,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
    })
  }
}, [location.state])


  // UI (unchanged structure) 
  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5",
      padding: "20px",
      fontFamily: '"Poppins", sans-serif',
    },
    cardWrapper: {
      display: "flex",
      width: "100%",
      backgroundColor: "white",
      borderRadius: "28px",
      overflow: "hidden",
      boxShadow: "0 8px 35px rgba(0,0,0,0.18)",
      maxWidth: "1200px",
      animation: "fadeSlide 0.35s ease",
      height: "auto",
    },
    cardImage: {
      width: "40%",
      minHeight: "400px",
    },
    cardImageImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    cardForm: {
      width: "60%",
      padding: "45px 55px",
      overflowY: "auto",
    },
    logoBlock: {
      textAlign: "center",
      marginBottom: "14px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      width: "50px",
      marginBottom: "18px",
    },
    brandTitle: {
      fontSize: "22px",
      fontWeight: 600,
      margin: 0,
    },
    heading: {
      fontSize: "26px",
      marginBottom: "12px",
      fontWeight: 600,
      margin: "0 0 12px 0",
      textAlign: "center",
    },
    subtitle: {
      marginBottom: "22px",
      fontSize: "15px",
      color: "#555",
    },
    field: {
      marginBottom: "14px",
    },
    label: {
      fontSize: "14px",
      fontWeight: 600,
      marginBottom: "5px",
      display: "block",
      color: "#000",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: "8px",
      border: "2px solid black",
      fontSize: "15px",
      fontFamily: "inherit",
      boxSizing: "border-box",
      backgroundColor: "transparent",
      color: "#000",
    },
    passwordWrap: {
      position: "relative",
      width: "100%",
    },
    passwordInput: {
      width: "100%",
      padding: "12px 50px 12px 16px",
      borderRadius: "8px",
      border: "2px solid black",
      fontSize: "15px",
      fontFamily: "inherit",
      boxSizing: "border-box",
      backgroundColor: "transparent",
      color: "#000",
    },
    passwordToggle: {
      position: "absolute",
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      minWidth: "36px",
      minHeight: "36px",
      backgroundColor: "transparent",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      border: "none",
      padding: "0",
      color: "#666",
      transition: "all 0.2s ease",
    },
    checkboxInput: {
      width: "18px",
      height: "18px",
      cursor: "pointer",
      accentColor: "#000",
      display: "inline-block",
      marginTop: "1px",
    },
    error: {
      fontSize: "12px",
      color: "#ff0000",
      marginTop: "3px",
      margin: "3px 0 0 0",
    },
    rememberRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      margin: "10px 0 14px 0",
      flexWrap: "wrap",
      gap: "10px",
    },
    rememberCheck: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      fontSize: "14px",
      color: "#000",
      lineHeight: "1",
      userSelect: "none",
      paddingTop: "5px",
    },

    forgotLink: {
      fontSize: "14px",
      color: "black",
      textDecoration: "none",
      cursor: "pointer",
    },
    mainBtn: {
      width: "100%",
      padding: "12px",
      backgroundColor: "black",
      color: "white",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontSize: "15px",
      fontWeight: 600,
      marginBottom: "14px",
      fontFamily: "inherit",
      transition: "all 0.2s ease",
    },
    switchText: {
      marginBottom: "20px",
      fontSize: "14px",
    },
    switchLink: {
      color: "black",
      textDecoration: "underline",
      cursor: "pointer",
      fontWeight: 600,
    },
    divider: {
      textAlign: "center",
      margin: "8px 0 18px 0",
      position: "relative",
      fontSize: "14px",
    },
    dividerLine: {
      content: '""',
      position: "absolute",
      width: "42%",
      height: "1px",
      backgroundColor: "#ccc",
      top: "50%",
    },
    socialBox: {
      display: "flex",
      gap: "15px",
    },
    socialBtn: {
      flex: 1,
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid black",
      backgroundColor: "white",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 600,
      fontFamily: "inherit",
      transition: "all 0.3s ease",
      minHeight: "48px",
    },
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        input::placeholder {
          color: #888;
          opacity: 1;
          font-weight: 400;
        }

        input:focus {
          outline: none;
          border-color: #333;
          background-color: rgba(0,0,0,0.02);
        }

        /* REAL RESPONSIVE FIX */
        @media (max-width: 768px) {
          .card-wrapper {
            flex-direction: column !important;
            min-height: auto !important;
          }
          .card-image, 
          .card-form {
            width: 100% !important;
          }
          .card-image {
            height: 240px !important;
          }
          .card-form {
            padding: 30px 24px !important;
          }
        }

        @media (max-width: 480px) {
          .card-image { height: 180px !important; }
          .card-form { padding: 24px 16px !important; }
        }
      `}</style>

      <div style={styles.cardWrapper} className="card-wrapper">
        <div style={styles.cardImage} className="card-image">
          <img src={loginImage} style={styles.cardImageImg} alt="NutriHelp" />
        </div>

        <div style={styles.cardForm} className="card-form">
          <div style={styles.logoBlock}>
            <img src={logoImage} alt="Logo" style={styles.logo} />
            <h2 style={styles.brandTitle}>NutriHelp</h2>
          </div>

          <h1 style={styles.heading}>Welcome Back</h1>
          <p style={styles.subtitle}>Login to continue your personalized nutrition insights and wellness tracking.</p>

          <form onSubmit={validateLogin}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input type="email" style={styles.input}
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
              />
              {errors.email && <p style={styles.error}>{errors.email}</p>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  style={styles.passwordInput}
                  className="password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {errors.password && <p style={styles.error}>{errors.password}</p>}
            </div>

            <div style={styles.rememberRow}>
              <label style={styles.rememberCheck}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={styles.checkboxInput}
                />
                Remember Me
              </label>

              <a style={styles.forgotLink} onClick={handleForgotPasswordClick}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" style={styles.mainBtn} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={styles.switchText}>
            Don't have an account?
            <span
              style={styles.switchLink}
              onClick={() => navigate("/Signup")}
            >
              {" "}Create Account
            </span>
          </p>


          <div style={styles.divider}>
            <span style={{ backgroundColor: "white", padding: "0 8px", position: "relative", zIndex: 1 }}>
              or
            </span>
            <div style={{ ...styles.dividerLine, left: 0 }} />
            <div style={{ ...styles.dividerLine, right: 0 }} />
          </div>

          {/* Social Buttons */}
          <div style={styles.socialBox}>
            <button style={styles.socialBtn} className="social-btn" onClick={handleGoogleSignIn}>
              <span style={{ fontSize: "18px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  ></path>
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  ></path>
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  ></path>
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  ></path>
                </svg>
              </span>
            </button>
            <button style={styles.socialBtn} className="social-btn">
              <span style={{ fontSize: "18px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 50 50">
                  <path d="M 44.527344 34.75 C 43.449219 37.144531 42.929688 38.214844 41.542969 40.328125 C 39.601563 43.28125 36.863281 46.96875 33.480469 46.992188 C 30.46875 47.019531 29.691406 45.027344 25.601563 45.0625 C 21.515625 45.082031 20.664063 47.03125 17.648438 47 C 14.261719 46.96875 11.671875 43.648438 9.730469 40.699219 C 4.300781 32.429688 3.726563 22.734375 7.082031 17.578125 C 9.457031 13.921875 13.210938 11.773438 16.738281 11.773438 C 20.332031 11.773438 22.589844 13.746094 25.558594 13.746094 C 28.441406 13.746094 30.195313 11.769531 34.351563 11.769531 C 37.492188 11.769531 40.8125 13.480469 43.1875 16.433594 C 35.421875 20.691406 36.683594 31.78125 44.527344 34.75 Z M 31.195313 8.46875 C 32.707031 6.527344 33.855469 3.789063 33.4375 1 C 30.972656 1.167969 28.089844 2.742188 26.40625 4.78125 C 24.878906 6.640625 23.613281 9.398438 24.105469 12.066406 C 26.796875 12.152344 29.582031 10.546875 31.195313 8.46875 Z"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
