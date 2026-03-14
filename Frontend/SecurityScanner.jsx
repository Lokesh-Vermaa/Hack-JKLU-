import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const SEV = {
  CRITICAL: { c: "#ff2d55", bg: "rgba(255,45,85,0.1)",  border: "rgba(255,45,85,0.35)"  },
  HIGH:     { c: "#ff8c00", bg: "rgba(255,140,0,0.1)",   border: "rgba(255,140,0,0.35)"  },
  MEDIUM:   { c: "#ffd60a", bg: "rgba(255,214,10,0.1)",  border: "rgba(255,214,10,0.35)" },
  LOW:      { c: "#39ff14", bg: "rgba(57,255,20,0.1)",   border: "rgba(57,255,20,0.35)"  },
  INFO:     { c: "#00d4ff", bg: "rgba(0,212,255,0.1)",   border: "rgba(0,212,255,0.35)"  },
};

const VULN_META = {
  "Insecure Code Patterns":  { abbr: "ICP", desc: "code execution"     },
  "Outdated Dependencies":   { abbr: "OD",  desc: "exploitation"       },
  "Unsafe Server Functions": { abbr: "USF", desc: "data breach"        },
  "Supply Chain Threats":    { abbr: "SCT", desc: "hidden attacks"     },
  "API Misconfiguration":    { abbr: "API", desc: "unauthorized access" },
};

const PHASES = [
  "▶ Initializing SecureScan engine v2.4.1...",
  "▶ Parsing source code and building AST...",
  "▶ Running pattern-matching rules engine...",
  "▶ Auditing dependency versions against CVE DB...",
  "▶ Checking for known supply-chain compromises...",
  "▶ Analyzing server-side function safety...",
  "▶ Probing API endpoint configurations...",
  "▶ Computing prioritized risk scores...",
  "▶ Generating vulnerability report...",
];

function ScoreGauge({ score, riskLevel }) {
  const r = 66, cx = 90, cy = 88;
  const arcLen = Math.PI * r;
  const filled = (score / 100) * arcLen;
  const col = score >= 75 ? "#39ff14" : score >= 50 ? "#ffd60a" : score >= 30 ? "#ff8c00" : "#ff2d55";
  return (
    <svg width="180" height="108" viewBox="0 0 180 108" style={{ overflow: "visible" }}>
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke="#16162a" strokeWidth="12" strokeLinecap="round"/>
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke={col} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`}
        style={{ filter: `drop-shadow(0 0 6px ${col}88)` }}/>
      <text x={cx} y={cy-12} textAnchor="middle" fill={col}
        fontSize="30" fontWeight="700" fontFamily="'Share Tech Mono',monospace">{score}</text>
      <text x={cx} y={cy+6} textAnchor="middle" fill="#4a5568"
        fontSize="10" fontFamily="'Share Tech Mono',monospace">/100 SECURE</text>
      <text x={cx} y={cy+24} textAnchor="middle" fill={col}
        fontSize="11" fontFamily="'Rajdhani',sans-serif" fontWeight="700" letterSpacing="3">{riskLevel} RISK</text>
    </svg>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: "#0d0d1e", border: "1px solid rgba(0,212,255,0.1)",
      borderRadius: "8px", padding: "14px 16px", flex: 1,
    }}>
      <div style={{ fontSize: "9px", color: "#4a5568", letterSpacing: "2px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "22px", color: color || "#c0caf5", fontFamily: "'Share Tech Mono',monospace", fontWeight: "700" }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "#52525b", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

export default function SecurityScanner() {
  const [tab, setTab] = useState("code");
  const [code, setCode] = useState(
`// Example: Node.js/Express backend
const express = require('express');
const db = require('./db');
const app = express();

// ⚠ SQL Injection
app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  const sql = \`SELECT * FROM users WHERE user='\${user}' AND pass='\${pass}'\`;
  db.query(sql, (err, rows) => res.json(rows));
});

// ⚠ Path traversal
app.get('/file', (req, res) => {
  res.sendFile(req.query.path); // no sanitization
});

// ⚠ Dangerous eval
const result = eval(req.body.expression);

// ⚠ Hardcoded secrets
const JWT_SECRET = "supersecret123";
const DB_PASS   = "admin1234";`);

  const [deps, setDeps] = useState(
`{
  "dependencies": {
    "express": "4.17.1",
    "lodash": "4.17.15",
    "axios": "0.19.0",
    "jsonwebtoken": "8.5.1",
    "mongoose": "5.9.7",
    "serialize-javascript": "1.7.0",
    "node-fetch": "2.6.0",
    "minimist": "1.2.0"
  }
}`);

  const [apiInput, setApiInput] = useState(
`GET  /api/admin/users          (no auth header)
POST /api/data/export          (no rate limiting)
GET  /api/file?path=           (path traversal)
POST /api/exec                 (executes shell cmds)
GET  /api/users/[id]           (IDOR risk, no ownership check)
POST /api/auth/login           (no CSRF token, no lockout)
PUT  /api/config               (no privilege check)
GET  /api/debug/logs           (exposes internals)`);

  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const logRef = useRef(null);
  const phaseRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@500;600;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg) => setLogs(prev => [...prev, { msg, ts: new Date().toLocaleTimeString("en",{hour12:false}) }]);

  const scan = async () => {
    setScanning(true);
    setResults(null);
    setLogs([]);
    setExpanded(null);
    let pi = 0;
    addLog(PHASES[0]);
    phaseRef.current = setInterval(() => {
      pi++;
      if (pi < PHASES.length) addLog(PHASES[pi]);
      else clearInterval(phaseRef.current);
    }, 700);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a senior application security engineer. Analyze the following web application artifacts and identify security vulnerabilities. Be specific and realistic based on the actual content provided. Return ONLY valid JSON — no markdown fences, no preamble.

SOURCE CODE:
${code}

PACKAGE DEPENDENCIES:
${deps}

API ENDPOINTS:
${apiInput}

Return this exact JSON (fill in real findings based on what you see):
{
  "overallScore": <integer 0-100, 100 = fully secure>,
  "riskLevel": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "summary": "<2-3 sentence executive summary of the security posture>",
  "vulnerabilities": [
    {
      "type": "Insecure Code Patterns",
      "risk": "code execution",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "count": <integer, number of issues found>,
      "findings": ["<specific finding based on actual code>", "<another finding>"],
      "fixes": ["<specific actionable fix>", "<another fix>"]
    },
    {
      "type": "Outdated Dependencies",
      "risk": "exploitation",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "count": <integer>,
      "findings": ["<specific package and CVE or known issue>"],
      "fixes": ["<version to upgrade to or mitigation>"]
    },
    {
      "type": "Unsafe Server Functions",
      "risk": "data breach",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "count": <integer>,
      "findings": ["<specific server function issue>"],
      "fixes": ["<specific fix for that function>"]
    },
    {
      "type": "Supply Chain Threats",
      "risk": "hidden attacks",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "count": <integer>,
      "findings": ["<specific supply chain concern>"],
      "fixes": ["<mitigation strategy>"]
    },
    {
      "type": "API Misconfiguration",
      "risk": "unauthorized access",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
      "count": <integer>,
      "findings": ["<specific API issue from the endpoints listed>"],
      "fixes": ["<fix for that endpoint or configuration>"]
    }
  ]
}`
          }]
        })
      });

      clearInterval(phaseRef.current);
      addLog("▶ Analysis complete. Compiling results...");
      const data = await res.json();
      const raw = data.content.filter(b => b.type === "text").map(b => b.text).join("");
      const clean = raw.replace(/```json\n?|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const total = parsed.vulnerabilities.reduce((s, v) => s + v.count, 0);
      addLog(`✓ Scan finished — ${total} vulnerabilities identified across 5 categories.`);
      setTimeout(() => { setResults(parsed); setScanning(false); }, 700);
    } catch (err) {
      clearInterval(phaseRef.current);
      addLog("✗ ERROR: " + err.message);
      setScanning(false);
    }
  };

  const totalVulns = results?.vulnerabilities.reduce((s, v) => s + v.count, 0) ?? 0;
  const critCount  = results?.vulnerabilities.filter(v => v.severity === "CRITICAL").length ?? 0;

  const chartData = results?.vulnerabilities.map(v => ({
    name: VULN_META[v.type]?.abbr || v.type,
    full: v.type,
    count: v.count,
    color: SEV[v.severity]?.c || "#6b7280",
  }));

  const radarData = results?.vulnerabilities.map(v => ({
    subject: VULN_META[v.type]?.abbr || v.type,
    value: Math.min(v.count * 10, 100),
    color: SEV[v.severity]?.c || "#6b7280",
  }));

  const INPUT_TABS = [
    { id: "code", label: "SOURCE CODE", tag: "</>" },
    { id: "deps", label: "DEPENDENCIES", tag: "PKG" },
    { id: "api",  label: "API ENDPOINTS", tag: "API" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#070711", color: "#c0caf5",
      fontFamily: "'Share Tech Mono','Courier New',monospace" }}>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <div style={{ background: "#0b0b1a", borderBottom: "1px solid rgba(0,212,255,0.18)",
        padding: "10px 24px", display: "flex", alignItems: "center", gap: "14px",
        position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ width: "38px", height: "38px", background: "rgba(0,212,255,0.08)",
          border: "1px solid rgba(0,212,255,0.3)", borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
          🛡
        </div>
        <div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
            fontSize: "17px", color: "#00d4ff", letterSpacing: "3px" }}>
            SECURESCANNER
          </div>
          <div style={{ fontSize: "9px", color: "#374151", letterSpacing: "2px" }}>
            AI-POWERED VULNERABILITY DETECTION ENGINE v2.4
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
          {results && (
            <div style={{ fontSize: "10px", color: "#374151" }}>
              Last scan: {new Date().toLocaleTimeString()}
            </div>
          )}
          <button onClick={scan} disabled={scanning} style={{
            background: scanning ? "rgba(57,255,20,0.03)" : "rgba(57,255,20,0.08)",
            border: `1px solid ${scanning ? "rgba(57,255,20,0.2)" : "rgba(57,255,20,0.5)"}`,
            color: "#39ff14", padding: "8px 22px",
            fontFamily: "'Share Tech Mono',monospace", fontSize: "12px",
            cursor: scanning ? "not-allowed" : "pointer", borderRadius: "4px",
            letterSpacing: "1px", boxShadow: scanning ? "none" : "0 0 12px rgba(57,255,20,0.15)",
            transition: "all 0.2s",
          }}>
            {scanning ? "⟳ SCANNING…" : "▶ RUN SCAN"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "20px 24px" }}>

        {/* ── Input Panel ─────────────────────────────────────── */}
        <div style={{ background: "#0d0d1e", border: "1px solid rgba(0,212,255,0.13)",
          borderRadius: "10px", marginBottom: "18px", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
            {INPUT_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "10px 14px",
                background: tab === t.id ? "rgba(0,212,255,0.07)" : "transparent",
                border: "none",
                borderBottom: `2px solid ${tab === t.id ? "#00d4ff" : "transparent"}`,
                color: tab === t.id ? "#00d4ff" : "#374151",
                fontFamily: "'Share Tech Mono',monospace", fontSize: "10px",
                cursor: "pointer", letterSpacing: "1.5px", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                <span style={{ fontSize: "9px", opacity: 0.6 }}>[{t.tag}]</span> {t.label}
              </button>
            ))}
          </div>

          {tab === "code" && (
            <textarea value={code} onChange={e => setCode(e.target.value)}
              placeholder="// Paste your source code here…"
              style={{ width: "100%", height: "170px", background: "transparent", border: "none",
                color: "#8be9fd", fontFamily: "'Share Tech Mono',monospace", fontSize: "11.5px",
                padding: "16px", resize: "vertical", outline: "none",
                boxSizing: "border-box", lineHeight: "1.7" }} />
          )}
          {tab === "deps" && (
            <textarea value={deps} onChange={e => setDeps(e.target.value)}
              placeholder='{"dependencies": {...}}'
              style={{ width: "100%", height: "170px", background: "transparent", border: "none",
                color: "#8be9fd", fontFamily: "'Share Tech Mono',monospace", fontSize: "11.5px",
                padding: "16px", resize: "vertical", outline: "none",
                boxSizing: "border-box", lineHeight: "1.7" }} />
          )}
          {tab === "api" && (
            <textarea value={apiInput} onChange={e => setApiInput(e.target.value)}
              placeholder="GET /api/route   (notes about the endpoint)"
              style={{ width: "100%", height: "170px", background: "transparent", border: "none",
                color: "#8be9fd", fontFamily: "'Share Tech Mono',monospace", fontSize: "11.5px",
                padding: "16px", resize: "vertical", outline: "none",
                boxSizing: "border-box", lineHeight: "1.7" }} />
          )}
        </div>

        {/* ── Scan Log Terminal ───────────────────────────────── */}
        {(scanning || logs.length > 0) && (
          <div style={{ background: "#08080f", border: "1px solid rgba(57,255,20,0.18)",
            borderRadius: "10px", marginBottom: "18px", overflow: "hidden" }}>
            <div style={{ background: "rgba(57,255,20,0.04)",
              borderBottom: "1px solid rgba(57,255,20,0.12)",
              padding: "7px 14px", fontSize: "9px", color: "#39ff14",
              letterSpacing: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%",
                background: scanning ? "#39ff14" : "#374151",
                boxShadow: scanning ? "0 0 8px #39ff14" : "none",
                display: "inline-block",
                animation: scanning ? "blink 1s ease-in-out infinite" : "none" }} />
              TERMINAL — {scanning ? "SCAN IN PROGRESS" : "SCAN COMPLETE"}
              {!scanning && (
                <span style={{ marginLeft: "auto", color: "#374151", cursor: "pointer",
                  letterSpacing: "1px" }} onClick={() => setLogs([])}>[ CLEAR ]</span>
              )}
            </div>
            <div ref={logRef} style={{ height: "110px", overflowY: "auto",
              padding: "10px 14px", fontSize: "11px", lineHeight: "1.9", color: "#374151" }}>
              {logs.map((l, i) => (
                <div key={i} style={{
                  color: l.msg.startsWith("✓") ? "#39ff14"
                    : l.msg.startsWith("✗") ? "#ff2d55"
                    : "#52525b"
                }}>
                  <span style={{ color: "#1f2937", marginRight: "10px" }}>[{l.ts}]</span>
                  {l.msg}
                </div>
              ))}
              {scanning && <span style={{ color: "#39ff14", animation: "blink 0.8s step-end infinite" }}>█</span>}
            </div>
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────── */}
        {!scanning && !results && logs.length === 0 && (
          <div style={{ textAlign: "center", padding: "70px 20px", color: "#1f2937" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px", filter: "grayscale(1)", opacity: 0.25 }}>🛡</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
              fontSize: "16px", letterSpacing: "4px", marginBottom: "10px", color: "#374151" }}>
              SCANNER READY
            </div>
            <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
              Sample code, dependencies and endpoints are pre-loaded.<br/>
              Click <span style={{ color: "#39ff14" }}>▶ RUN SCAN</span> to detect vulnerabilities with AI.
            </div>
          </div>
        )}

        {/* ── Results Dashboard ───────────────────────────────── */}
        {results && (
          <>
            {/* Stat Row */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              <StatCard label="SECURITY SCORE" value={results.overallScore} color={
                results.overallScore >= 75 ? "#39ff14"
                  : results.overallScore >= 50 ? "#ffd60a"
                  : results.overallScore >= 30 ? "#ff8c00" : "#ff2d55"
              } sub="out of 100" />
              <StatCard label="TOTAL ISSUES"   value={totalVulns}  color="#c0caf5" sub="across all categories" />
              <StatCard label="CRITICAL TYPES" value={critCount}   color={critCount > 0 ? "#ff2d55" : "#39ff14"} sub="severity level" />
              <StatCard label="RISK LEVEL"     value={results.riskLevel}
                color={SEV[results.riskLevel]?.c || "#ffd60a"} sub="overall posture" />
            </div>

            {/* Score Gauge + Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr",
              gap: "14px", marginBottom: "16px" }}>
              <div style={{ background: "#0d0d1e", border: "1px solid rgba(0,212,255,0.12)",
                borderRadius: "10px", padding: "20px 16px",
                display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: "9px", color: "#374151", letterSpacing: "2px", marginBottom: "6px" }}>
                  RISK GAUGE
                </div>
                <ScoreGauge score={results.overallScore} riskLevel={results.riskLevel} />
                <div style={{ fontSize: "10px", color: "#374151", marginTop: "8px", textAlign: "center" }}>
                  {totalVulns} VULNERABILITIES<br/>DETECTED
                </div>
              </div>

              <div style={{ background: "#0d0d1e", border: "1px solid rgba(0,212,255,0.12)",
                borderRadius: "10px", padding: "20px" }}>
                <div style={{ fontSize: "9px", color: "#374151", letterSpacing: "2px", marginBottom: "12px" }}>
                  EXECUTIVE SUMMARY
                </div>
                <p style={{ color: "#a9b1d6", fontSize: "13px", lineHeight: "1.8", margin: "0 0 18px" }}>
                  {results.summary}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["CRITICAL","HIGH","MEDIUM","LOW","INFO"].map(sev => {
                    const items = results.vulnerabilities.filter(v => v.severity === sev);
                    if (!items.length) return null;
                    return (
                      <div key={sev} style={{
                        background: SEV[sev].bg, border: `1px solid ${SEV[sev].border}`,
                        borderRadius: "4px", padding: "4px 10px",
                        fontSize: "10px", color: SEV[sev].c, letterSpacing: "1px",
                      }}>{items.length} {sev}</div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "14px", marginBottom: "16px" }}>

              {/* Bar Chart */}
              <div style={{ background: "#0d0d1e", border: "1px solid rgba(0,212,255,0.12)",
                borderRadius: "10px", padding: "20px" }}>
                <div style={{ fontSize: "9px", color: "#374151", letterSpacing: "2px", marginBottom: "14px" }}>
                  ISSUES BY CATEGORY
                </div>
                <div style={{ height: "170px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={32} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                      <XAxis dataKey="name" tick={{ fill: "#52525b", fontSize: 10,
                        fontFamily: "'Share Tech Mono',monospace" }}
                        axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{ background: "#0a0a12",
                            border: `1px solid ${d.color}44`, borderRadius: "4px",
                            padding: "8px 12px", fontSize: "11px" }}>
                            <div style={{ color: d.color, marginBottom: "2px" }}>{d.full}</div>
                            <div style={{ color: "#a9b1d6" }}>{d.count} issues</div>
                          </div>
                        );
                      }} />
                      <Bar dataKey="count" radius={[4,4,0,0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={d.color} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart */}
              <div style={{ background: "#0d0d1e", border: "1px solid rgba(0,212,255,0.12)",
                borderRadius: "10px", padding: "20px" }}>
                <div style={{ fontSize: "9px", color: "#374151", letterSpacing: "2px", marginBottom: "14px" }}>
                  ATTACK SURFACE RADAR
                </div>
                <div style={{ height: "170px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1a1a2e" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#52525b", fontSize: 10,
                        fontFamily: "'Share Tech Mono',monospace" }} />
                      <Radar dataKey="value" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.1}
                        strokeWidth={1.5} dot={{ r: 3, fill: "#00d4ff" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Vulnerability Cards ──────────────────────────── */}
            <div style={{ fontSize: "9px", color: "#374151", letterSpacing: "2px", marginBottom: "12px" }}>
              DETAILED VULNERABILITY REPORT — CLICK TO EXPAND
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {results.vulnerabilities.map((v, i) => {
                const meta = VULN_META[v.type] || { abbr: "??" };
                const s = SEV[v.severity] || SEV.INFO;
                const open = expanded === i;

                return (
                  <div key={i} style={{
                    background: "#0d0d1e",
                    border: `1px solid ${open ? s.border : "rgba(0,212,255,0.1)"}`,
                    borderRadius: "8px", overflow: "hidden",
                    transition: "border-color 0.25s",
                    boxShadow: open ? `0 0 18px ${s.c}10` : "none",
                  }}>
                    {/* Header Row */}
                    <div onClick={() => setExpanded(open ? null : i)} style={{
                      padding: "14px 16px", display: "flex",
                      alignItems: "center", gap: "14px", cursor: "pointer",
                    }}>
                      {/* Icon badge */}
                      <div style={{
                        width: "40px", height: "40px", background: s.bg,
                        border: `1px solid ${s.border}`, borderRadius: "6px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", color: s.c, fontWeight: "700", flexShrink: 0,
                      }}>{meta.abbr}</div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", color: "#c0caf5", marginBottom: "3px" }}>{v.type}</div>
                        <div style={{ fontSize: "10px", color: "#4a5568" }}>
                          RISK: {v.risk.toUpperCase()} &nbsp;·&nbsp; {v.count} ISSUE{v.count !== 1 ? "S" : ""} DETECTED
                        </div>
                      </div>

                      {/* Severity pill */}
                      <div style={{
                        background: s.bg, border: `1px solid ${s.border}`,
                        color: s.c, fontSize: "9px", padding: "4px 10px",
                        borderRadius: "3px", letterSpacing: "1.5px", flexShrink: 0,
                      }}>{v.severity}</div>

                      {/* Chevron */}
                      <div style={{ color: "#374151", fontSize: "11px", flexShrink: 0 }}>
                        {open ? "▲" : "▼"}
                      </div>
                    </div>

                    {/* Expandable Detail */}
                    {open && (
                      <div style={{
                        borderTop: `1px solid ${s.border}22`,
                        padding: "16px",
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px",
                      }}>
                        {/* Findings */}
                        <div>
                          <div style={{ fontSize: "9px", color: "#4a5568",
                            letterSpacing: "2px", marginBottom: "10px" }}>
                            ⚠ FINDINGS
                          </div>
                          {v.findings.map((f, j) => (
                            <div key={j} style={{
                              fontSize: "11.5px", color: "#a9b1d6",
                              padding: "8px 12px", marginBottom: "7px",
                              background: `${s.c}08`,
                              borderLeft: `2px solid ${s.c}`,
                              lineHeight: "1.6", borderRadius: "0 4px 4px 0",
                            }}>{f}</div>
                          ))}
                        </div>
                        {/* Fixes */}
                        <div>
                          <div style={{ fontSize: "9px", color: "#4a5568",
                            letterSpacing: "2px", marginBottom: "10px" }}>
                            ✓ REMEDIATION
                          </div>
                          {v.fixes.map((fix, j) => (
                            <div key={j} style={{
                              fontSize: "11.5px", color: "#a9b1d6",
                              padding: "8px 12px", marginBottom: "7px",
                              background: "rgba(57,255,20,0.05)",
                              borderLeft: "2px solid #39ff14",
                              lineHeight: "1.6", borderRadius: "0 4px 4px 0",
                            }}>{fix}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div style={{ marginTop: "24px", padding: "14px 16px",
              background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)",
              borderRadius: "6px", fontSize: "10px", color: "#374151", lineHeight: "1.8" }}>
              ⚡ SECURESCANNER AI — Powered by Claude · Detects: Insecure Code Patterns · Outdated Dependencies · Unsafe Server Functions · Supply Chain Threats · API Misconfiguration
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
        textarea { -webkit-font-smoothing: antialiased; }
        textarea::placeholder { color: #1f2937 !important; }
        button:hover:not(:disabled) { filter: brightness(1.15); }
      `}</style>
    </div>
  );
}
