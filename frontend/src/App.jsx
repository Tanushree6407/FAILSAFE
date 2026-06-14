import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

// ── Shared style atoms ────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", fontSize: 13, padding: "7px 10px",
  border: "1px solid #e5e7eb", borderRadius: 7,
  background: "#fff", color: "#111827",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

const btnPrimary = (disabled) => ({
  background: "#111827", color: "#fff", border: "none", borderRadius: 8,
  padding: "9px 18px", fontSize: 13, fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.55 : 1, fontFamily: "inherit",
});

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.1rem 1.25rem", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>{children}</p>;
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Badge({ children, color, bg, border }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: bg, color, border: `1px solid ${border}` }}>
      {children}
    </span>
  );
}

// ── Shared ML result components ───────────────────────────────────────────────
function RiskGauge({ prob }) {
  const pct   = Math.round(prob * 100);
  const color = pct >= 60 ? "#DC2626" : pct >= 40 ? "#D97706" : "#16A34A";
  const bg    = pct >= 60 ? "#FEF2F2" : pct >= 40 ? "#FFFBEB" : "#F0FDF4";
  const label = pct >= 60 ? "High risk" : pct >= 40 ? "Moderate risk" : "Low risk";
  const arc   = (pct / 100) * 251;
  return (
    <div style={{ textAlign: "center", padding: "1.25rem 0 0.5rem", background: bg, borderRadius: 10, margin: "0 0 1rem" }}>
      <svg viewBox="0 0 200 115" width="180" height="103">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${arc} 251`} style={{ transition: "stroke-dasharray 0.6s ease" }} />
        <text x="100" y="86" textAnchor="middle" fontSize="30" fontWeight="600" fill={color}>{pct}%</text>
        <text x="100" y="103" textAnchor="middle" fontSize="11" fill="#6b7280" letterSpacing="0.5">{label.toUpperCase()}</text>
      </svg>
    </div>
  );
}

function FactorBar({ name, shap }) {
  const abs   = Math.abs(shap);
  const isPos = shap > 0;
  const width = Math.min(100, (abs / 0.5) * 100);
  const color = isPos ? "#DC2626" : "#16A34A";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: "#374151", fontFamily: "monospace" }}>{name}</span>
        <span style={{ fontSize: 12, color, fontWeight: 500 }}>{isPos ? "+" : ""}{shap.toFixed(3)}</span>
      </div>
      <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
        <div style={{ width: `${width}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function Intervention({ text }) {
  const em   = text.slice(0, 2);
  const body = text.slice(2).trim();
  const styles = { "🔴": { bg: "#FEF2F2", border: "#FECACA" }, "🟡": { bg: "#FFFBEB", border: "#FDE68A" }, "🟢": { bg: "#F0FDF4", border: "#BBF7D0" }, "✅": { bg: "#F0FDF4", border: "#BBF7D0" } };
  const s = styles[em] || styles["✅"];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>{em}</span>
      <span style={{ fontSize: 13, color: "#1f2937", lineHeight: 1.5 }}>{body}</span>
    </div>
  );
}


// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [data, setData]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(""); setLoading(true);
    const body = new URLSearchParams({ username: data.email, password: data.password });
    const res  = await fetch(`${API}/auth/login`, { method: "POST", body });
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      onLogin(d.access_token, d.name, d.role);
    } else {
      setError("Incorrect email or password.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <div style={{ width: 360, padding: "0 1rem" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, background: "#111827", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>F</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>FAILSAFE</span>
          </div>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Student academic risk prediction</p>
        </div>
        <Card style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 14px" }}>Sign in to continue</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Email">
              <input style={inputStyle} placeholder="faculty@school.edu" value={data.email}
                onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
            </Field>
            <Field label="Password">
              <input type="password" style={inputStyle} placeholder="••••••••" value={data.password}
                onChange={e => setData(d => ({ ...d, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </Field>
            {error && <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading} style={{ ...btnPrimary(loading), marginTop: 4, width: "100%", padding: "9px 0" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </Card>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 14, textAlign: "center" }}>
          Faculty: faculty@school.edu / faculty123 &nbsp;·&nbsp; HOD: hod@school.edu / hod123
        </p>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Single Predict
// ═══════════════════════════════════════════════════════════════════════════════
const initialForm = {
  school: "GP", sex: "F", age: 17, address: "U", famsize: "GT3", Pstatus: "T",
  Medu: 2, Fedu: 2, Mjob: "other", Fjob: "other", reason: "course", guardian: "mother",
  traveltime: 1, studytime: 2, failures: 0,
  schoolsup: "no", famsup: "yes", paid: "no", activities: "no",
  nursery: "yes", higher: "yes", internet: "yes", romantic: "no",
  famrel: 3, freetime: 3, goout: 2, Dalc: 1, Walc: 1, health: 3, absences: 4,
  G1: "", G2: "", subject: "math",
};

const stageLabels = { early: "No grades yet", mid1: "First period grade (G1)", mid2: "Both grades (G1 + G2)" };

function SinglePredict({ token }) {
  const [stage, setStage]   = useState("early");
  const [form, setForm]     = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function predict() {
    setLoading(true); setError(""); setResult(null);
    try {
      const payload = {
        ...form,
        G1: form.G1 !== "" ? parseFloat(form.G1) : undefined,
        G2: form.G2 !== "" ? parseFloat(form.G2) : undefined,
      };
      const res = await fetch(`${API}/predict/${stage}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); setError(e.detail || "Prediction failed."); return; }
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const sel = (val, opts) => (
    <select value={val} style={inputStyle}>{opts.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}</select>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>

      {/* LEFT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <SectionLabel>Prediction stage</SectionLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {["early", "mid1", "mid2"].map(s => (
              <button key={s} onClick={() => { setStage(s); setError(""); }}
                style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: "7px 0", borderRadius: 7, border: "1px solid", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  background: stage === s ? "#111827" : "#fff", color: stage === s ? "#fff" : "#6b7280", borderColor: stage === s ? "#111827" : "#e5e7eb" }}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "8px 0 0" }}>{stageLabels[stage]}</p>
        </Card>

        <Card>
          <SectionLabel>Student details</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Subject">
              <select value={form.subject} onChange={e => setField("subject", e.target.value)} style={inputStyle}>
                <option value="math">Math</option>
                <option value="portuguese">Portuguese</option>
              </select>
            </Field>
            <Field label="School">
              <select value={form.school} onChange={e => setField("school", e.target.value)} style={inputStyle}>
                <option>GP</option><option>MS</option>
              </select>
            </Field>
            <Field label="Sex">
              <select value={form.sex} onChange={e => setField("sex", e.target.value)} style={inputStyle}>
                <option value="F">Female</option><option value="M">Male</option>
              </select>
            </Field>
            <Field label="Age">
              <input type="number" value={form.age} min={15} max={22} onChange={e => setField("age", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Absences">
              <input type="number" value={form.absences} min={0} max={93} onChange={e => setField("absences", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Past failures">
              <input type="number" value={form.failures} min={0} max={4} onChange={e => setField("failures", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Study time (1–4)">
              <input type="number" value={form.studytime} min={1} max={4} onChange={e => setField("studytime", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Goes out (1–5)">
              <input type="number" value={form.goout} min={1} max={5} onChange={e => setField("goout", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Family relations (1–5)">
              <input type="number" value={form.famrel} min={1} max={5} onChange={e => setField("famrel", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Health (1–5)">
              <input type="number" value={form.health} min={1} max={5} onChange={e => setField("health", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Wants higher edu?">
              <select value={form.higher} onChange={e => setField("higher", e.target.value)} style={inputStyle}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </Field>
            <Field label="Internet at home?">
              <select value={form.internet} onChange={e => setField("internet", e.target.value)} style={inputStyle}>
                <option value="yes">Yes</option><option value="no">No</option>
              </select>
            </Field>
          </div>

          {(stage === "mid1" || stage === "mid2") && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Grades</p>
              <div style={{ display: "grid", gridTemplateColumns: stage === "mid2" ? "1fr 1fr" : "1fr", gap: 10 }}>
                <Field label="G1 — First period (0–20)">
                  <input type="number" value={form.G1} min={0} max={20} onChange={e => setField("G1", e.target.value)} style={inputStyle} />
                </Field>
                {stage === "mid2" && (
                  <Field label="G2 — Second period (0–20)">
                    <input type="number" value={form.G2} min={0} max={20} onChange={e => setField("G2", e.target.value)} style={inputStyle} />
                  </Field>
                )}
              </div>
            </div>
          )}

          <button onClick={predict} disabled={loading} style={{ ...btnPrimary(loading), marginTop: 14, width: "100%", padding: "10px 0" }}>
            {loading ? "Analysing…" : "Run prediction →"}
          </button>
          {error && <p style={{ fontSize: 12, color: "#DC2626", margin: "8px 0 0" }}>{error}</p>}
        </Card>
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!result && !loading && (
          <Card style={{ textAlign: "center", padding: "3rem 1.5rem", border: "1.5px dashed #e5e7eb", background: "#fafafa" }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>📋</p>
            <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Results will appear here after you run a prediction.</p>
          </Card>
        )}
        {loading && (
          <Card style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Analysing student data…</p>
          </Card>
        )}
        {result && (
          <>
            <Card style={{ padding: "1rem 1.25rem 0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>
                    {result.subject} · {result.stage}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>
                    {result.is_at_risk ? "Student is at risk" : "Student is on track"}
                  </p>
                </div>
                <Badge color={result.is_at_risk ? "#DC2626" : "#16A34A"} bg={result.is_at_risk ? "#FEF2F2" : "#F0FDF4"} border={result.is_at_risk ? "#FECACA" : "#BBF7D0"}>
                  {result.is_at_risk ? "At risk" : "Safe"}
                </Badge>
              </div>
              <RiskGauge prob={result.risk_probability} />
            </Card>
            <Card>
              <SectionLabel>Top risk factors</SectionLabel>
              {result.top_factors.slice(0, 8).map((f, i) => <FactorBar key={i} name={f.feature} shap={f.shap} />)}
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "10px 0 0" }}>Red = increases risk · Green = reduces risk</p>
            </Card>
            <Card>
              <SectionLabel>Recommended interventions</SectionLabel>
              {result.interventions.map((iv, i) => <Intervention key={i} text={iv} />)}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — CSV Bulk Upload
// ═══════════════════════════════════════════════════════════════════════════════
function CsvUpload({ token }) {
  const [stage, setStage]     = useState("early");
  const [subject, setSubject] = useState("math");
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [expanded, setExpanded] = useState(null); // row index of expanded detail
  const fileRef = useRef();

  async function upload() {
    if (!file) { setError("Please select a CSV file."); return; }
    setLoading(true); setError(""); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/predict/csv/${stage}?subject=${subject}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Upload failed."); return; }
      setResult(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const statBox = (label, value, color = "#111827") => (
    <div style={{ flex: 1, textAlign: "center", padding: "14px 10px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
      <p style={{ fontSize: 24, fontWeight: 700, color, margin: "0 0 2px" }}>{value}</p>
      <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <Card>
        <SectionLabel>Upload settings</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <Field label="Subject">
            <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}>
              <option value="math">Math</option>
              <option value="portuguese">Portuguese</option>
            </select>
          </Field>
          <Field label="Stage">
            <select value={stage} onChange={e => setStage(e.target.value)} style={inputStyle}>
              <option value="early">Early — no grades</option>
              <option value="mid1">Mid-1 — G1 only</option>
              <option value="mid2">Mid-2 — G1 + G2</option>
            </select>
          </Field>
        </div>

        <Field label="CSV file (semicolon-separated)">
          <div
            onClick={() => fileRef.current.click()}
            style={{
              border: "1.5px dashed #d1d5db", borderRadius: 8, padding: "24px 16px",
              textAlign: "center", cursor: "pointer", background: file ? "#f0fdf4" : "#fafafa",
              transition: "background 0.15s",
            }}
          >
            <p style={{ fontSize: 22, margin: "0 0 6px" }}>{file ? "✅" : "📂"}</p>
            <p style={{ fontSize: 13, color: file ? "#16A34A" : "#6b7280", margin: 0, fontWeight: file ? 600 : 400 }}>
              {file ? file.name : "Click to choose a .csv file"}
            </p>
            {file && (
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => { setFile(e.target.files[0] || null); setResult(null); setError(""); }} />
        </Field>

        <div style={{ marginTop: 8, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 4px", fontWeight: 600 }}>Expected CSV columns</p>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontFamily: "monospace", lineHeight: 1.7 }}>
            school; sex; age; address; famsize; Pstatus; Medu; Fedu; Mjob; Fjob; reason; guardian;<br />
            traveltime; studytime; failures; schoolsup; famsup; paid; activities; nursery; higher;<br />
            internet; romantic; famrel; freetime; goout; Dalc; Walc; health; absences
            {stage !== "early" && <><br /><span style={{ color: "#f59e0b" }}>+ G1</span></>}
            {stage === "mid2"  && <span style={{ color: "#f59e0b" }}>; G2</span>}
            <br /><span style={{ color: "#94a3b8" }}>optional: student_ref; student_name; class_name</span>
          </p>
        </div>

        {error && <p style={{ fontSize: 12, color: "#DC2626", margin: "10px 0 0" }}>{error}</p>}

        <button onClick={upload} disabled={loading || !file}
          style={{ ...btnPrimary(loading || !file), marginTop: 14, width: "100%", padding: "10px 0" }}>
          {loading ? "Processing…" : `Run bulk prediction →`}
        </button>
      </Card>

      {loading && (
        <Card style={{ textAlign: "center", padding: "2.5rem" }}>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Running predictions on all rows…</p>
        </Card>
      )}

      {result && (
        <>
          {/* Summary stats */}
          <Card>
            <SectionLabel>Batch summary</SectionLabel>
            <div style={{ display: "flex", gap: 10, marginBottom: 0 }}>
              {statBox("Processed", result.processed)}
              {statBox("At risk", result.at_risk, "#DC2626")}
              {statBox("Safe", result.safe, "#16A34A")}
              {statBox("Errors", result.errors, result.errors > 0 ? "#D97706" : "#9ca3af")}
            </div>
            {result.processed > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(result.at_risk / result.processed) * 100}%`, height: "100%", background: "#DC2626", borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0", textAlign: "right" }}>
                  {Math.round((result.at_risk / result.processed) * 100)}% at risk across batch
                </p>
              </div>
            )}
          </Card>

          {/* Error details */}
          {result.error_details?.length > 0 && (
            <Card style={{ borderColor: "#FDE68A", background: "#FFFBEB" }}>
              <SectionLabel>Row errors ({result.error_details.length})</SectionLabel>
              {result.error_details.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: "#92400e", padding: "6px 0", borderBottom: i < result.error_details.length - 1 ? "1px solid #fde68a" : "none" }}>
                  <span style={{ fontWeight: 600 }}>Row {e.row}:</span> {e.error}
                </div>
              ))}
            </Card>
          )}

          {/* Results table */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid #f3f4f6" }}>
              <SectionLabel>Individual results</SectionLabel>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Row", "Student ref", "Risk %", "Status", "Interventions", ""].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <>
                      <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: expanded === i ? "#f9fafb" : "#fff" }}>
                        <td style={{ padding: "10px 14px", color: "#6b7280" }}>{r.row}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#111827" }}>{r.student_ref || <span style={{ color: "#d1d5db" }}>—</span>}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontWeight: 700, color: r.risk_probability >= 0.6 ? "#DC2626" : r.risk_probability >= 0.4 ? "#D97706" : "#16A34A" }}>
                            {Math.round(r.risk_probability * 100)}%
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <Badge
                            color={r.is_at_risk ? "#DC2626" : "#16A34A"}
                            bg={r.is_at_risk ? "#FEF2F2" : "#F0FDF4"}
                            border={r.is_at_risk ? "#FECACA" : "#BBF7D0"}>
                            {r.is_at_risk ? "At risk" : "Safe"}
                          </Badge>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#6b7280" }}>{r.interventions.length} action{r.interventions.length !== 1 ? "s" : ""}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <button onClick={() => setExpanded(expanded === i ? null : i)}
                            style={{ fontSize: 11, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                            {expanded === i ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {expanded === i && (
                        <tr key={`${i}-detail`} style={{ background: "#f9fafb" }}>
                          <td colSpan={6} style={{ padding: "10px 14px 14px" }}>
                            {r.top_factors && r.top_factors.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Top factors affecting performance</p>
                                {r.top_factors.slice(0, 8).map((f, j) => <FactorBar key={j} name={f.feature} shap={f.shap} />)}
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>Red = increases risk · Green = reduces risk</p>
                              </div>
                            )}
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Recommended interventions</p>
                            {r.interventions.map((iv, j) => <Intervention key={j} text={iv} />)}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — HOD Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
function HodDashboard({ token }) {
  const [summary, setSummary]         = useState(null);
  const [trend, setTrend]             = useState([]);
  const [topIv, setTopIv]             = useState([]);
  const [atRisk, setAtRisk]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [stageFilter, setStageFilter]     = useState("");
  const [expandedRow, setExpandedRow]     = useState(null);
  const [trendDays, setTrendDays]         = useState(30);

  const hdrs = { Authorization: `Bearer ${token}` };

  async function fetchAll(days = trendDays) {
    setLoading(true); setError("");
    try {
      const [s, tr, iv, ar] = await Promise.all([
        fetch(`${API}/hod/summary`,          { headers: hdrs }).then(r => r.json()),
        fetch(`${API}/hod/trend?days=${days}`,{ headers: hdrs }).then(r => r.json()),
        fetch(`${API}/hod/top-interventions`, { headers: hdrs }).then(r => r.json()),
        fetch(`${API}/hod/at-risk-list?limit=100${subjectFilter ? `&subject=${subjectFilter}` : ""}${stageFilter ? `&stage=${stageFilter}` : ""}`,
              { headers: hdrs }).then(r => r.json()),
      ]);
      setSummary(s); setTrend(tr); setTopIv(iv); setAtRisk(ar.results || []);
    } catch (e) { setError("Failed to load dashboard data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, [subjectFilter, stageFilter]);

  if (loading) return (
    <Card style={{ textAlign: "center", padding: "4rem" }}>
      <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Loading dashboard…</p>
    </Card>
  );

  if (error) return (
    <Card style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
      <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
      <button onClick={() => fetchAll()} style={{ ...btnPrimary(false), marginTop: 10 }}>Retry</button>
    </Card>
  );

  // Trend mini-chart
  const maxTotal = Math.max(...trend.map(t => t.total), 1);
  const chartH   = 80;
  const chartW   = 500;
  const pts      = trend.length;

  function statCard(label, value, sub, color = "#111827") {
    return (
      <Card style={{ flex: 1 }}>
        <p style={{ fontSize: 28, fontWeight: 700, color, margin: "0 0 2px", letterSpacing: "-0.02em" }}>{value}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 2px" }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{sub}</p>}
      </Card>
    );
  }

  const ivColors = { "🔴": "#DC2626", "🟡": "#D97706", "🟢": "#16A34A", "✅": "#16A34A" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Top stat row ── */}
      {summary && (
        <div style={{ display: "flex", gap: 12 }}>
          {statCard("Total predictions", summary.overall.total, null)}
          {statCard("At risk", summary.overall.at_risk, `${summary.overall.at_risk_pct}% of total`, "#DC2626")}
          {statCard("Safe", summary.overall.safe, null, "#16A34A")}
          {statCard("Interventions done", `${summary.interventions.done}/${summary.interventions.total}`,
            `${summary.interventions.completion_pct}% completion`, "#2563EB")}
        </div>
      )}

      {/* ── Subject breakdown + intervention status ── */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Card>
            <SectionLabel>By subject</SectionLabel>
            {["math", "portuguese"].map(subj => {
              const s = summary.by_subject[subj];
              const pct = s.total ? (s.at_risk / s.total) * 100 : 0;
              return (
                <div key={subj} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", textTransform: "capitalize" }}>{subj}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{s.at_risk} / {s.total} at risk ({s.at_risk_pct}%)</span>
                  </div>
                  <div style={{ height: 7, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct > 50 ? "#DC2626" : "#D97706", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </Card>

          <Card>
            <SectionLabel>Intervention status</SectionLabel>
            {summary && (() => {
              const iv = summary.interventions;
              const total = iv.total || 1;
              const bars = [
                { label: "Done",        value: iv.done,        color: "#16A34A" },
                { label: "In progress", value: iv.in_progress, color: "#2563EB" },
                { label: "Pending",     value: iv.pending,     color: "#D97706" },
              ];
              return bars.map(b => (
                <div key={b.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{b.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: b.color }}>{b.value}</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                    <div style={{ width: `${(b.value / total) * 100}%`, height: "100%", background: b.color, borderRadius: 3 }} />
                  </div>
                </div>
              ));
            })()}
          </Card>
        </div>
      )}

      {/* ── Trend chart ── */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <SectionLabel>Risk trend</SectionLabel>
          <div style={{ display: "flex", gap: 4 }}>
            {[7, 14, 30, 90].map(d => (
              <button key={d} onClick={() => { setTrendDays(d); fetchAll(d); }}
                style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5, border: "1px solid", cursor: "pointer", fontFamily: "inherit",
                  background: trendDays === d ? "#111827" : "#fff", color: trendDays === d ? "#fff" : "#6b7280", borderColor: trendDays === d ? "#111827" : "#e5e7eb" }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {trend.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "1.5rem 0", margin: 0 }}>No data in this period.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} style={{ width: "100%", minWidth: 300 }}>
              {/* Grid lines */}
              {[0, 0.5, 1].map(frac => (
                <line key={frac} x1={0} x2={chartW} y1={chartH * (1 - frac)} y2={chartH * (1 - frac)}
                  stroke="#f3f4f6" strokeWidth="1" />
              ))}
              {/* Total bars */}
              {trend.map((d, i) => {
                const x = (i / pts) * chartW;
                const bw = (chartW / pts) * 0.7;
                const h = (d.total / maxTotal) * chartH;
                return <rect key={`t${i}`} x={x} y={chartH - h} width={bw} height={h} fill="#e5e7eb" rx={2} />;
              })}
              {/* At-risk bars */}
              {trend.map((d, i) => {
                const x = (i / pts) * chartW;
                const bw = (chartW / pts) * 0.7;
                const h = (d.at_risk / maxTotal) * chartH;
                return <rect key={`r${i}`} x={x} y={chartH - h} width={bw} height={h} fill="#DC2626" rx={2} opacity={0.85} />;
              })}
              {/* X-axis labels — show first, middle, last */}
              {[0, Math.floor(pts / 2), pts - 1].filter(i => trend[i]).map(i => (
                <text key={i} x={(i / pts) * chartW + (chartW / pts) * 0.35} y={chartH + 16}
                  textAnchor="middle" fontSize="10" fill="#9ca3af">
                  {trend[i].date.slice(5)}
                </text>
              ))}
            </svg>
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, background: "#e5e7eb", borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Total</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, background: "#DC2626", borderRadius: 2, opacity: 0.85 }} />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>At risk</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Top interventions ── */}
      {topIv.length > 0 && (
        <Card>
          <SectionLabel>Most common interventions</SectionLabel>
          {topIv.slice(0, 8).map((iv, i) => {
            const em = iv.text.slice(0, 2);
            const color = ivColors[em] || "#9ca3af";
            const pct   = iv.total > 0 ? (iv.done / iv.total) * 100 : 0;
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#374151", flex: 1, lineHeight: 1.4 }}>{iv.text}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>{iv.done}/{iv.total} done</span>
                </div>
                <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, opacity: 0.7 }} />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* ── At-risk list ── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <SectionLabel>At-risk students</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} style={{ ...inputStyle, width: "auto", fontSize: 12 }}>
              <option value="">All subjects</option>
              <option value="math">Math</option>
              <option value="portuguese">Portuguese</option>
            </select>
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ ...inputStyle, width: "auto", fontSize: 12 }}>
              <option value="">All stages</option>
              <option value="early">Early</option>
              <option value="mid1">Mid-1</option>
              <option value="mid2">Mid-2</option>
            </select>
            <button onClick={() => fetchAll()} style={{ ...btnPrimary(false), padding: "6px 12px" }}>Refresh</button>
          </div>
        </div>

        {atRisk.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "2.5rem", margin: 0 }}>No at-risk students found for the selected filters.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Student", "Subject", "Stage", "Risk", "Actions", ""].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atRisk.map((p, i) => (
                  <>
                    <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: expandedRow === i ? "#f9fafb" : "#fff" }}>
                      <td style={{ padding: "10px 14px" }}>
                        {p.student?.name
                          ? <><span style={{ fontWeight: 600, color: "#111827" }}>{p.student.name}</span><br /><span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{p.student.ref}</span></>
                          : <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Anonymous</span>}
                        {p.student?.class_name && <span style={{ marginLeft: 6, fontSize: 11, color: "#6b7280" }}>({p.student.class_name})</span>}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#374151", textTransform: "capitalize" }}>{p.subject}</td>
                      <td style={{ padding: "10px 14px", color: "#374151", textTransform: "uppercase", fontSize: 12 }}>{p.stage}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontWeight: 700, color: p.risk_probability >= 0.7 ? "#DC2626" : "#D97706" }}>
                          {Math.round(p.risk_probability * 100)}%
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {p.action_summary && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {p.action_summary.done > 0 && <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>✓{p.action_summary.done}</span>}
                            {p.action_summary.in_progress > 0 && <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>●{p.action_summary.in_progress}</span>}
                            {p.action_summary.pending > 0 && <span style={{ fontSize: 11, color: "#D97706", fontWeight: 600 }}>○{p.action_summary.pending}</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                          style={{ fontSize: 11, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                          {expandedRow === i ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr key={`${i}-exp`} style={{ background: "#f9fafb" }}>
                        <td colSpan={6} style={{ padding: "10px 14px 14px" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Recommended interventions</p>
                          {p.interventions.map((iv, j) => <Intervention key={j} text={iv} />)}
                          <p style={{ fontSize: 11, color: "#d1d5db", margin: "8px 0 0" }}>
                            Predicted {new Date(p.predicted_at).toLocaleString()} · ID #{p.prediction_id}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// Root App
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [token, setToken]     = useState(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [tab, setTab]         = useState("predict");

  function handleLogin(t, name, role) {
    setToken(t); setUserName(name); setUserRole(role);
    setTab(role === "hod" ? "hod" : "predict");
  }

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  const tabs = [
    { id: "predict", label: "Single predict" },
    { id: "csv",     label: "Bulk CSV upload" },
    ...(userRole === "hod" ? [{ id: "hod", label: "HOD dashboard" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 1.5rem", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: "#111827", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>F</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>FAILSAFE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {userName && <span style={{ fontSize: 13, color: "#6b7280" }}>{userName}</span>}
          {userRole && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: userRole === "hod" ? "#EFF6FF" : "#F3F4F6", color: userRole === "hod" ? "#2563EB" : "#6b7280", border: `1px solid ${userRole === "hod" ? "#BFDBFE" : "#e5e7eb"}` }}>
              {userRole.toUpperCase()}
            </span>
          )}
          <button onClick={() => { setToken(null); setUserName(""); setUserRole(""); }}
            style={{ fontSize: 12, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 1.5rem" }}>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                fontSize: 13, fontWeight: 600, padding: "14px 16px", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#111827" : "transparent"}`,
                color: tab === t.id ? "#111827" : "#9ca3af", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 2px", letterSpacing: "-0.02em" }}>
            {tab === "predict" ? "Risk Prediction"   : tab === "csv" ? "Bulk CSV Upload" : "HOD Dashboard"}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            {tab === "predict" ? "Enter student data to predict academic risk and generate interventions."
              : tab === "csv"  ? "Upload a semicolon-separated CSV to run predictions on an entire class at once."
              : "Institution-wide risk overview, trends, and intervention tracking."}
          </p>
        </div>

        {tab === "predict" && <SinglePredict token={token} />}
        {tab === "csv"     && <CsvUpload     token={token} />}
        {tab === "hod"     && <HodDashboard  token={token} />}
      </div>
    </div>
  );
}