  "use client"

  import { useMemo, useRef, useState, useEffect } from "react"
  import profileLogo from "./NutriHelp-logos_black.png"


  /* ============ CONSTANTS ============ */

  const GOALS = [
    { id: "muscle", label: "Muscle Gain" },
    { id: "weightloss", label: "Weight Loss" },
    { id: "generalwell", label: "General Well-Being" },
    { id: "hypertension", label: "Hypertension Control" },
    { id: "hearthealth", label: "Heart Health" },
  ]

  const INITIAL_FORM = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    goals: [],
    avatar: null,
  }

  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "")
  const phoneOk = (p) => /^[0-9]{8,15}$/.test((p || "").replace(/\s/g, ""))

  /* ============ ISOLATED STYLES WITH RESPONSIVE DESIGN ============ */

  const getPageStyles = (width) => ({
    minHeight: "100vh",
    background: "#f6f6f8",
    padding:
      width < 480
        ? "12px 8px"        // small mobile
        : width < 768
        ? "16px 12px"       // mobile
        : width < 1024
        ? "24px 16px"       // iPad / tablet
        : "32px 24px",      // desktop
        boxSizing: "border-box",
      })

  const getWrapperStyles = (width) => ({
    maxWidth: "1200px",
    margin: "0 auto",
    display: width < 768 ? "flex" : "grid",
    flexDirection: width < 768 ? "column" : undefined,
    gridTemplateColumns:
    width < 768
      ? "1fr"                 // mobile
      : width < 1024
      ? "240px 1fr"           // iPad / tablet
      : "260px 1fr",          // desktop

      gap: width < 768 ? "20px" : width < 1024 ? "28px" : "40px",
    })

  const getSidebarStyles = (width) => ({
    background: "transparent",
    display: "flex",
    flexDirection: width < 768 ? "row" : "column",
    alignItems: width < 768 ? "center" : "center",
    gap: width < 768 ? "16px" : "24px",
    width: width < 768 ? "100%" : "auto",
    maxWidth: width < 768 ? "100%" : "260px",
    justifyContent: width < 768 ? "space-around" : "flex-start",
  })

  const getAvatarStyles = (width) => ({
    width: width < 768 ? 90 : width < 1024 ? 120 : 140,
    height: width < 768 ? 90 : width < 1024 ? 120 : 140,
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #e5e5e7",
    background: "#fff",
    flexShrink: 0,
  })

  const getSidebarTitleStyles = (width) => ({
    fontSize: width < 768 ? 14 : width < 1024 ? 16 : 18,
    fontWeight: 600,
    borderBottom: "3px solid #2f6fed",
    width: width < 768 ? "auto" : "100%",
    textAlign: width < 768 ? "center" : "center",
    paddingBottom: 8,
    color: "#000",
    whiteSpace: "nowrap",
  })

  const getGoalListStyles = (width) => ({
    width: width < 768 ? "auto" : "100%",
    display: "flex",
    flexDirection: width < 768 ? "row" : "column",
    gap: width < 768 ? 12 : 18,
    marginTop: width < 768 ? 0 : 8,
    flexWrap: width < 768 ? "wrap" : "nowrap",
  })

  const getGoalItemStyles = (width) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: width < 768 ? 12 : width < 1024 ? 13 : 14,
    color: "#555",
    cursor: "pointer",
    whiteSpace: "nowrap",
  })

  const getMainStyles = (width) => ({
    display: "flex",
    flexDirection: "column",
    gap: width < 768 ? 16 : width < 1024 ? 20 : 24,
  })

  const getCardStyles = (width) => ({
    background: "#fff",
    borderRadius: 12,
    padding: width < 768 ? 16 : width < 1024 ? 20 : 28,
    border: "1px solid #e5e5e7",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  })

  const getTitleStyles = (width) => ({
    fontSize: width < 768 ? 20 : width < 1024 ? 24 : 28,
    fontWeight: 700,
    marginBottom: width < 768 ? 16 : width < 1024 ? 20 : 24,
    color: "#000",
  })

  const getGrid2Styles = (width) => ({
    display: "grid",
    gridTemplateColumns: width < 768 ? "1fr" : "1fr 1fr",
    gap: width < 768 ? 16 : 20,
    marginBottom: width < 768 ? 16 : 20,
  })

  const getFieldStyles = (width) => ({
    display: "flex",
    flexDirection: "column",
    gap: 6,
  })

  const getLabelStyles = (width) => ({
    fontSize: width < 768 ? 12 : width < 1024 ? 12 : 13,
    fontWeight: 600,
    color: "#222",
    userSelect: "none",
  })

  const getInputStyles = (width) => ({
    height: width < 768 ? 40 : 44,
    padding: "0 14px",
    borderRadius: 22,
    border: "1px solid #cfcfd4",
    fontSize: width < 768 ? 13 : 14,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    background: "#ffffff",          
  })

  const getPhoneInputStyles = (width) => ({
    flex: 1,
    height: width < 768 ? 40 : 44,
    borderRadius: "0 22px 22px 0",
    border: "none",
    padding: "0 14px",
    fontSize: width < 768 ? 13 : 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",          
  })

    const getFileInputStyles = (width) => ({
    width: width < 768 ? 50 : 60,
    height: width < 768 ? 40 : 60, 
    width: "100%",                    
    borderRadius: 22,
    border: "1px solid #cfcfd4",
    fontSize: width < 768 ? 13 : 14,
    cursor: "pointer",
    fontFamily: "inherit",
    background: "#ffffff",
    display: "flex",               
    alignItems: "center",           
  })


  const getButtonStyles = (width) => ({
    marginTop: width < 768 ? 8 : 10,
    padding: width < 768 ? "10px 20px" : "12px 28px",
    borderRadius: 8,
    border: "none",
    background: "#2f6fed",
    color: "#fff",
    fontSize: width < 768 ? 13 : 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s ease",
    width: width < 768 ? "100%" : "auto",
  })

  const getButtonHoverStyles = (width) => ({
    ...getButtonStyles(width),
    background: "#1e54d9",
  })

  /* ============ CUSTOM RADIO STYLES ============ */

const getRadioWrapStyles = () => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  padding: "6px 4px",
  touchAction: "manipulation",
})

const getRadioOuterStyles = (checked) => ({
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "2px solid #2f6fed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff",
  boxSizing: "border-box",
})

const getRadioInnerStyles = (checked) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: checked ? "#2f6fed" : "transparent",
})

  /* ============ COMPONENT ============ */

  export default function UserAccountPage() {
    const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024)
    const [form, setForm] = useState(INITIAL_FORM)
    const [touched, setTouched] = useState({})
    const [hoveredButton, setHoveredButton] = useState(null)
    const fileRef = useRef(null)

  useEffect(() => {
  const fetchProfile = async () => {
    try {
      const sessionRaw = localStorage.getItem("user_session")
      const token = localStorage.getItem("jwt_token")

      if (!sessionRaw || !token) {
        console.warn("JWT token missing")
        return
      }

      const session = JSON.parse(sessionRaw)

      const res = await fetch("https://localhost:443/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        console.error("Profile fetch failed", res.status)
        return
      }

      const data = await res.json()
      const profile = Array.isArray(data) ? data[0] : data

      setForm((prev) => ({
        ...prev,
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        email: profile.email || session.email,
        phone: profile.contact_number || "",
        goals: profile.goals ? [profile.goals] : [],
        avatar: profile.image_url ? { url: profile.image_url } : null,
      }))

    } catch (err) {
      console.error("Profile fetch error:", err)
    }
  }

  fetchProfile()
}, [])

    useEffect(() => {
      const handleResize = () => setWidth(window.innerWidth)
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }, [])

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

    const mark = (k) => setTouched((t) => ({ ...t, [k]: true }))

    const errors = useMemo(() => {
      const e = {}
      if (touched.firstName && !form.firstName) e.firstName = "Required"
      if (touched.email && !emailOk(form.email)) e.email = "Invalid email"
      if (touched.phone && !phoneOk(form.phone)) e.phone = "Invalid phone"
      if (touched.password && form.password.length < 6) e.password = "Min 6 chars"
      if (touched.confirm && form.confirm !== form.password) e.confirm = "Mismatch"
      return e
    }, [form, touched])

    const onPick = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      set("avatar", { file, url: URL.createObjectURL(file) })
    }

    const handleSaveChanges = () => {
      mark("firstName")
      mark("email")
      mark("phone")
      if (Object.keys(errors).length === 0) {
        alert("Changes saved!")
      }
    }

    const handleUpdatePassword = () => {
      mark("password")
      mark("confirm")
      if (Object.keys(errors).length === 0) {
        alert("Password updated!")
      }
    }

    return (
      <div style={getPageStyles(width)}>
        <div style={getWrapperStyles(width)}>
          {/* ===== SIDEBAR ===== */}
          <aside style={getSidebarStyles(width)}>
            <img
              src={form.avatar?.url || profileLogo}
              alt="User profile avatar"
              style={getAvatarStyles(width)}
            />

            <div
              style={{
                display: "flex",
                flexDirection: width < 768 ? "row" : "column",
                gap: width < 768 ? 12 : 24,
                alignItems: "center",
                width: width < 768 ? "auto" : "100%",
              }}
            >
              <div style={getSidebarTitleStyles(width)}>Account</div>

              <div style={getGoalListStyles(width)}>
                {GOALS.map((g) => (
                  <label
                    key={g.id}
                    style={getRadioWrapStyles()}
                    onClick={() => set("goals", [g.id])}
                  >
                    <span style={getRadioOuterStyles(form.goals.includes(g.id))}>
                      <span style={getRadioInnerStyles(form.goals.includes(g.id))} />
                    </span>

                      <span style={{ color: "#000", fontWeight: 500 }}>
                        {g.label}
                      </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <main style={getMainStyles(width)}>
            {/* Personal Details Section */}
            <section style={getCardStyles(width)}>
              <h2 style={getTitleStyles(width)}>Personal Details</h2>

              <div style={getGrid2Styles(width)}>
                <FormField
                  label="First Name"
                  value={form.firstName}
                  onChange={(v) => set("firstName", v)}
                  onBlur={() => mark("firstName")}
                  error={touched.firstName ? errors.firstName : undefined}
                  width={width}
                />
                <FormField label="Last Name" value={form.lastName} onChange={(v) => set("lastName", v)} width={width} />
              </div>

              <div style={getGrid2Styles(width)}>
                <FormField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  onBlur={() => mark("email")}
                  error={touched.email ? errors.email : undefined}
                  width={width}
                />
                <div style={getFieldStyles(width)}>
                  <label style={getLabelStyles(width)}>Number</label>

                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    onBlur={() => mark("phone")}
                    placeholder="Enter phone number"
                    style={getInputStyles(width)}
                  />

                  {touched.phone && errors.phone && (
                    <div style={{ fontSize: 12, color: "#e11d48", marginTop: 4 }}>
                      {errors.phone}
                    </div>
                  )}
                </div>

              </div>

              <div style={getFieldStyles(width)}>
                <label style={getLabelStyles(width)}>Upload Profile Picture</label>
                <input type="file" ref={fileRef} style={getFileInputStyles(width)} onChange={onPick} accept="image/*" />
              </div>

              <button
                style={hoveredButton === "save" ? getButtonHoverStyles(width) : getButtonStyles(width)}
                onMouseEnter={() => setHoveredButton("save")}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={handleSaveChanges}
              >
                Save Changes
              </button>
            </section>

            {/* Your Password Section */}
            <section style={getCardStyles(width)}>
              <h2 style={getTitleStyles(width)}>Your Password</h2>

              <div style={getGrid2Styles(width)}>
                <FormField
                  label="New Password"
                  type="password"
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  onBlur={() => mark("password")}
                  error={touched.password ? errors.password : undefined}
                  width={width}
                />
                <FormField
                  label="Repeat New Password"
                  type="password"
                  value={form.confirm}
                  onChange={(v) => set("confirm", v)}
                  onBlur={() => mark("confirm")}
                  error={touched.confirm ? errors.confirm : undefined}
                  width={width}
                />
              </div>

              <button
                style={hoveredButton === "password" ? getButtonHoverStyles(width) : getButtonStyles(width)}
                onMouseEnter={() => setHoveredButton("password")}
                onMouseLeave={() => setHoveredButton(null)}
                onClick={handleUpdatePassword}
              >
                Update Password
              </button>
            </section>
          </main>
        </div>
      </div>
    )
  }

  /* ============ FORM FIELD COMPONENT ============ */

  function FormField({ label, type = "text", value, onChange, onBlur, error, width }) {
    return (
      <div style={getFieldStyles(width)}>
        <label style={getLabelStyles(width)}>{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={getInputStyles(width)}
        />
        {error && <div style={{ fontSize: 12, color: "#e11d48", marginTop: 4 }}>{error}</div>}
      </div>
    )
  }
