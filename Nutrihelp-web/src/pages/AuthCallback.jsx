import { useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { toast } from "react-toastify"

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const handledRef = useRef(false) // prevents double execution

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    const handleAuth = async () => {
      try {
        const params = new URLSearchParams(location.search)
        const mode = params.get("mode") // signup | login
        const next = params.get("next") || "/home"

        const { data, error } = await supabase.auth.getSession()

        // No session → go to login
        if (error || !data?.session) {
          navigate("/login", { replace: true })
          return
        }

        // ==========================
        // SIGNUP FLOW (SSO)
        // ==========================
        if (mode === "signup") {
          // Kill session so no auto-login happens
          await supabase.auth.signOut()

          toast.success(
            "Account registered successfully. Please login to continue.",
            { autoClose: 4000 }
          )

          navigate("/login", { replace: true })
          return
        }

        // ==========================
        // LOGIN FLOW (SSO)
        // ==========================
        if (mode === "login" || !mode) {
          // Optional: store minimal session reference
          localStorage.setItem(
            "sso_session",
            JSON.stringify({
              provider: data.session.user.app_metadata?.provider,
              email: data.session.user.email,
            })
          )

          navigate(next, { replace: true })
          return
        }

        // ==========================
        // FALLBACK
        // ==========================
        navigate("/login", { replace: true })

      } catch (err) {
        console.error("Auth callback error:", err)
        navigate("/login", { replace: true })
      }
    }

    handleAuth()
  }, [navigate, location])

  return (
    <p style={{ padding: 16, fontSize: 14, color: "#555" }}>
      Completing authentication…
    </p>
  )
}
