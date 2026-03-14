'use client';

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import Navbar from '../components/Navbar';
import RiskScore from '../components/RiskScore';
import UploadRepo from '../components/UploadRepo';
import DependenciesScanner from '../components/DependenciesScanner';
import RepoScanner from '../components/RepoScanner';
import Dashboard from '../components/Dashboard';

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Vulnerability {
  severity: Severity;
  title: string;
  description: string;
  cwe?: string;
  fix?: string;
  line?: number;
  ruleId?: string;
  column?: number;
  docsUrl?: string;
  file?: string;
}

interface Dependency {
  name: string;
  version: string;
  severity: Severity;
  description: string;
  title?: string;
  cwe?: string;
  fix?: string;
  url?: string;
  cvss?: number;
}

type RawVulnerability = Omit<Vulnerability, 'severity'> & {
  severity?: string;
};

type RawDependency = Omit<Dependency, 'severity'> & {
  severity?: string;
};

interface CodeScanResult {
  vulnerabilities?: RawVulnerability[];
  riskScore?: number;
  filesScanned?: number;
}

interface DependencyScanResult {
  dependencies?: RawDependency[];
  totalDependencies?: number;
  vulnerableCount?: number;
}

interface RepoScanResult {
  codeScan?: CodeScanResult;
  dependencyScan?: DependencyScanResult | null;
  overallRiskScore?: number;
}

const DashboardTyped = Dashboard as ComponentType<{ vulnerabilities: Vulnerability[]; dependencies: Dependency[] }>;

const normalizeSeverity = (severity?: string): Severity => {
  switch ((severity || '').toLowerCase()) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
};

const normalizeVulnerability = (vulnerability: RawVulnerability): Vulnerability => ({
  severity: normalizeSeverity(vulnerability.severity),
  title: vulnerability.title || vulnerability.ruleId || 'Security issue detected',
  description: vulnerability.description || 'No description provided.',
  cwe: vulnerability.cwe,
  fix: vulnerability.fix,
  line: vulnerability.line,
  ruleId: vulnerability.ruleId,
  column: vulnerability.column,
  docsUrl: vulnerability.docsUrl,
  file: vulnerability.file
});

const normalizeDependency = (dependency: RawDependency): Dependency => ({
  name: dependency.name || 'Unknown package',
  version: dependency.version || 'Unknown version',
  severity: normalizeSeverity(dependency.severity),
  description: dependency.description || dependency.title || 'No description provided.',
  title: dependency.title,
  cwe: dependency.cwe,
  fix: dependency.fix,
  url: dependency.url,
  cvss: dependency.cvss
});

const normalizeVulnerabilities = (vulnerabilities: RawVulnerability[] = []): Vulnerability[] =>
  vulnerabilities.map(normalizeVulnerability);

const normalizeDependencies = (dependencies: RawDependency[] = []): Dependency[] =>
  dependencies.map(normalizeDependency);

const calculateRiskScore = (items: Vulnerability[]) =>
  Math.min(
    100,
    items.reduce((acc, item) => {
      if (item.severity === 'critical') return acc + 30;
      if (item.severity === 'high') return acc + 20;
      if (item.severity === 'medium') return acc + 10;
      return acc + 5;
    }, 0)
  );

export default function Home() {
  const [currentPage, setCurrentPage] = useState('scanner');
  const [code, setCode] = useState('');
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const severityCounts = vulnerabilities.reduce(
    (acc, vuln) => {
      const sev = (vuln.severity || '').toLowerCase();
      if (sev === 'critical') acc.critical += 1;
      else if (sev === 'high') acc.high += 1;
      else if (sev === 'medium') acc.medium += 1;
      else if (sev === 'low') acc.low += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  const sampleCodes = {
    sql: `// SQL Injection Vulnerability
const express = require('express');
const mysql = require('mysql');

app.get('/user', (req, res) => {
  const userId = req.query.id;
  // VULNERABLE: Direct string concatenation in SQL query
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  db.query(query, (err, results) => {
    res.json(results);
  });
});`,
    xss: `// Cross-Site Scripting (XSS) Vulnerability
app.get('/search', (req, res) => {
  const searchTerm = req.query.q;
  // VULNERABLE: Unsanitized user input in HTML response
  res.send(\`
    <html>
      <body>
        <h1>Search Results for: \${searchTerm}</h1>
        <div id="results"></div>
      </body>
    </html>
  \`);
});`,
    auth: `// Broken Authentication Vulnerability
const bcrypt = require('bcrypt');

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // VULNERABLE: Weak password comparison
  const user = db.findUser(username);
  if (user && password === user.password) {
    // VULNERABLE: Predictable session token
    const token = Buffer.from(username).toString('base64');
    res.json({ token });
  }
});`,
    eval: `// Code Injection via eval()
app.post('/calculate', (req, res) => {
  const { expression } = req.body;
  // VULNERABLE: eval() with user input
  try {
    const result = eval(expression);
    res.json({ result });
  } catch (e) {
    res.status(400).json({ error: 'Invalid expression' });
  }
});`,
    path: `// Path Traversal Vulnerability
const fs = require('fs');
const path = require('path');

app.get('/file', (req, res) => {
  const filename = req.query.name;
  // VULNERABLE: No path validation
  const filePath = './uploads/' + filename;
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(404).send('Not found');
    res.send(data);
  });
});`
  };

  const vulnerabilityDb = {
    sql: {
      severity: 'critical',
      title: 'SQL Injection',
      description: 'User input is directly concatenated into SQL queries without sanitization, allowing attackers to manipulate database queries.',
      cwe: 'CWE-89',
      fix: `// SECURE: Use parameterized queries
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId], (err, results) => {
  res.json(results);
});`
    },
    xss: {
      severity: 'high',
      title: 'Cross-Site Scripting (XSS)',
      description: 'User-supplied data is rendered in HTML without proper encoding, enabling script injection attacks.',
      cwe: 'CWE-79',
      fix: `// SECURE: Sanitize and encode user input
const sanitizeHtml = require('sanitize-html');
const searchTerm = sanitizeHtml(req.query.q);
res.send(\`<h1>Search Results for: \${escapeHtml(searchTerm)}</h1>\`);`
    },
    auth: {
      severity: 'critical',
      title: 'Broken Authentication',
      description: 'Passwords stored/compared in plain text and predictable session tokens make authentication easily bypassable.',
      cwe: 'CWE-287',
      fix: `// SECURE: Use bcrypt for password comparison and JWT for tokens
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const isValid = await bcrypt.compare(password, user.hashedPassword);
if (isValid) {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}`
    },
    eval: {
      severity: 'critical',
      title: 'Code Injection (eval)',
      description: 'Using eval() with user input allows arbitrary code execution on the server.',
      cwe: 'CWE-94',
      fix: `// SECURE: Use a safe math expression parser
const mathjs = require('mathjs');

app.post('/calculate', (req, res) => {
  try {
    const result = mathjs.evaluate(req.body.expression);
    res.json({ result });
  } catch (e) {
    res.status(400).json({ error: 'Invalid expression' });
  }
});`
    },
    path: {
      severity: 'high',
      title: 'Path Traversal',
      description: 'Unsanitized file paths allow attackers to access files outside intended directories using ../ sequences.',
      cwe: 'CWE-22',
      fix: `// SECURE: Validate and normalize file paths
const safePath = path.normalize(filename).replace(/^(\\.\\.\\/)+/, '');
const filePath = path.join(__dirname, 'uploads', safePath);

if (!filePath.startsWith(path.join(__dirname, 'uploads'))) {
  return res.status(403).send('Forbidden');
}`
    }
  };

  const detectVulnerabilities = (code: string): Vulnerability[] => {
    const detected: Vulnerability[] = [];
    const lowerCode = code.toLowerCase();

    // SQL Injection patterns
    if (lowerCode.includes('select') && (lowerCode.includes('+') || lowerCode.includes('`'))) {
      detected.push(normalizeVulnerability({ ...vulnerabilityDb.sql, line: findLine(code, 'SELECT') }));
    }

    // XSS patterns
    if (lowerCode.includes('res.send') && lowerCode.includes('${')) {
      detected.push(normalizeVulnerability({ ...vulnerabilityDb.xss, line: findLine(code, 'res.send') }));
    }

    // Auth patterns
    if (lowerCode.includes('password') && lowerCode.includes('===')) {
      detected.push(normalizeVulnerability({ ...vulnerabilityDb.auth, line: findLine(code, 'password') }));
    }

    // eval() patterns
    if (lowerCode.includes('eval(')) {
      detected.push(normalizeVulnerability({ ...vulnerabilityDb.eval, line: findLine(code, 'eval') }));
    }

  // innerHTML patterns
  if (lowerCode.includes('innerhtml')) {
    detected.push(normalizeVulnerability({
      ...vulnerabilityDb.xss,
      title: 'Unsafe innerHTML assignment',
      description: 'Assigning untrusted data to innerHTML can lead to cross-site scripting.',
      fix: 'Use safe DOM APIs like textContent or a templating engine that escapes input.',
      line: findLine(code, 'innerHTML')
    }));
  }

  // document.write patterns
  if (lowerCode.includes('document.write')) {
    detected.push(normalizeVulnerability({
      ...vulnerabilityDb.xss,
      title: 'Unsafe document.write usage',
      description: 'document.write can be used to inject unsafe HTML and scripts into the page.',
      fix: 'Avoid document.write; build DOM nodes programmatically instead.',
      line: findLine(code, 'document.write')
    }));
  }

  // exec() / child_process.exec patterns
  if (lowerCode.includes('child_process.exec') || lowerCode.includes('exec(')) {
    detected.push(normalizeVulnerability({
      ...vulnerabilityDb.auth,
      title: 'Command execution (exec) detected',
      description: 'Executing shell commands from code can allow arbitrary command execution if input is not fully controlled.',
      fix: 'Avoid exec(); use safe APIs or validate/whitelist all inputs before running commands.',
      line: findLine(code, 'exec')
    }));
  }

    return detected;
  };

  const findLine = (code: string, pattern: string) => {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(pattern.toLowerCase())) {
        return i + 1;
      }
    }
    return 1;
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    }
  };

  const runScan = async (sourceCode = code) => {
    if (isScanning || !sourceCode.trim()) return;

    // Ensure we have the latest backend status
    await checkBackendHealth();

    setIsScanning(true);
    setScanProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 200);

    try {
      const response = await fetch(`${API_BASE}/api/scan/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: sourceCode })
      });

      if (!response.ok) throw new Error('Scan request failed');

      const data: CodeScanResult = await response.json();
      const normalizedVulnerabilities = normalizeVulnerabilities(data.vulnerabilities || []);

      setVulnerabilities(normalizedVulnerabilities);
      setRiskScore(
        typeof data.riskScore === 'number'
          ? data.riskScore
          : calculateRiskScore(normalizedVulnerabilities)
      );
    } catch {
      // Fall back to local detection if backend is unavailable
      const detectedVulns = detectVulnerabilities(sourceCode);
      setVulnerabilities(detectedVulns);
      setRiskScore(calculateRiskScore(detectedVulns));
    } finally {
      clearInterval(progressInterval);
      setScanProgress(100);

      await new Promise(resolve => setTimeout(resolve, 300));

      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const loadSample = (type: keyof typeof sampleCodes) => {
    setCode(sampleCodes[type]);
  };

  const clearCode = () => {
    setCode('');
    setVulnerabilities([]);
    setRiskScore(0);
  };

  const handleDependenciesScanned = (deps: Dependency[]) => {
    setDependencies(normalizeDependencies(deps));
  };

  useEffect(() => {
    checkBackendHealth();

    const interval = setInterval(checkBackendHealth, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-end gap-3 mb-6">
          <span className="text-sm text-gray-400">Backend:</span>
          <span
            className={`text-sm font-semibold ${
              backendOnline === null
                ? 'text-yellow-400'
                : backendOnline
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {backendOnline === null
              ? 'Checking...'
              : backendOnline
              ? 'Online'
              : 'Offline'}
          </span>
        </div>
        {currentPage === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Code Editor Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Code Scanner</h2>

                {/* Sample Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-gray-400">Load Sample:</span>
                  {Object.keys(sampleCodes).map((type) => (
                    <button
                      key={type}
                      onClick={() => loadSample(type as keyof typeof sampleCodes)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>

                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Paste your code here to scan for vulnerabilities..."
                  className="w-full h-64 bg-gray-900 border border-gray-600 rounded p-4 text-green-400 font-mono text-sm"
                />

                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => {
                      void runScan();
                    }}
                    disabled={isScanning}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded"
                  >
                    {isScanning ? 'Scanning...' : 'Run Security Scan'}
                  </button>
                  <button
                    onClick={clearCode}
                    className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded"
                  >
                    Clear
                  </button>
                </div>

                {/* Progress Bar */}
                {isScanning && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-cyan-400 mt-1">{Math.round(scanProgress)}%</p>
                  </div>
                )}
              </div>

              {/* Vulnerabilities */}
              <div className="space-y-4">
                {vulnerabilities.length === 0 && !isScanning && code && (
                  <div className="bg-green-900 p-6 rounded-lg text-center">
                    <h3 className="text-xl font-bold text-green-400">No Vulnerabilities Detected</h3>
                    <p className="text-gray-300">Your code appears to be secure!</p>
                  </div>
                )}

                {vulnerabilities.map((vuln, index) => (
                  <div key={index} className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                        vuln.severity === 'critical' ? 'bg-red-600' :
                        vuln.severity === 'high' ? 'bg-orange-600' :
                        vuln.severity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                      }`}>
                        {vuln.severity}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{vuln.title}</h4>
                        <p className="text-gray-300 mb-4">{vuln.description}</p>
                        <details className="cursor-pointer">
                          <summary className="text-cyan-400 hover:underline">View Recommended Fix</summary>
                          <pre className="mt-3 p-4 bg-gray-900 rounded text-sm overflow-x-auto">
                            {vuln.fix}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <RiskScore score={riskScore} counts={severityCounts} />
              <UploadRepo
                onFileContentUploaded={(file: { name: string; content: string | null }) => {
                  if (file?.content) {
                    setCode(file.content);
                    setVulnerabilities([]);
                    setRiskScore(0);
                    void runScan(file.content);
                  }
                }}
              />
            </div>
          </div>
        )}

        {currentPage === 'dashboard' && (
          <DashboardTyped
            vulnerabilities={vulnerabilities}
            dependencies={dependencies}
          />
        )}

        {currentPage === 'dependencies' && (
          <DependenciesScanner onDependenciesScanned={handleDependenciesScanned} />
        )}

        {currentPage === 'repo' && (
          <RepoScanner onRepoScanned={(data: RepoScanResult) => {
            const repoVulnerabilities = normalizeVulnerabilities(data.codeScan?.vulnerabilities || []);
            const repoDependencies = normalizeDependencies(data.dependencyScan?.dependencies || []);

            setVulnerabilities(repoVulnerabilities);
            setDependencies(repoDependencies);
            setRiskScore(
              typeof data.overallRiskScore === 'number'
                ? data.overallRiskScore
                : typeof data.codeScan?.riskScore === 'number'
                ? data.codeScan.riskScore
                : calculateRiskScore(repoVulnerabilities)
            );
          }} />
        )}
      </main>
    </div>
  );
}
