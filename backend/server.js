const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const { exec } = require('child_process');
const { ESLint } = require('eslint');
const AdmZip = require('adm-zip');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 5000;

const historyFilePath = path.join(__dirname, 'scan-history.json');

const loadHistory = () => {
  try {
    if (!fs.existsSync(historyFilePath)) {
      fs.writeFileSync(historyFilePath, JSON.stringify([]), 'utf8');
      return [];
    }
    const content = fs.readFileSync(historyFilePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Failed to load history:', err);
    return [];
  }
};

const saveHistory = (history) => {
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save history:', err);
  }
};

const appendHistory = (entry) => {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 100) history.splice(100);
  saveHistory(history);
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Sample vulnerability data (fallback)
const sampleVulnerabilities = [
  {
    severity: 'High',
    title: 'SQL Injection',
    description: 'Potential SQL injection vulnerability detected',
    cwe: 'CWE-89',
    fix: 'Use parameterized queries or prepared statements',
    line: 10
  },
  {
    severity: 'Medium',
    title: 'Cross-Site Scripting (XSS)',
    description: 'Unescaped user input in HTML output',
    cwe: 'CWE-79',
    fix: 'Sanitize user input and use Content Security Policy',
    line: 25
  }
];

const eslint = new ESLint({
  overrideConfig: {
    env: { node: true, es2021: true },
    parserOptions: { ecmaVersion: 2021, sourceType: 'module' },
    plugins: ['security'],
    rules: {
      // Basic security-focused ESLint rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',
      'no-unsafe-finally': 'error',
      // ESLint Security plugin rules
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-require': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-unsafe-regex': 'warn'
    }
  },
  overrideConfigFile: null
});

// Sample dependencies data
const sampleDependencies = [
  {
    name: 'express',
    version: '4.18.2',
    severity: 'Low',
    description: 'Known vulnerability in older versions'
  },
  {
    name: 'lodash',
    version: '4.17.20',
    severity: 'Medium',
    description: 'Prototype pollution vulnerability'
  }
];

// API Routes
app.get('/api', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API root',
    routes: [
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/history' },
      { method: 'DELETE', path: '/api/history' },
      { method: 'POST', path: '/api/scan/code' },
      { method: 'POST', path: '/api/scan/dependencies' },
      { method: 'POST', path: '/api/scan/repo' },
      { method: 'GET', path: '/api/dashboard/stats' },
      { method: 'GET', path: '/docs' }
    ]
  });
});

app.get('/docs', (req, res) => {
  const docsHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>API Docs</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0b0e14; color: #e2e8f0; margin: 0; padding: 24px; }
          h1 { margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 12px 10px; text-align:left; }
          th { background: rgba(148, 163, 184, 0.15); }
          tr:nth-child(even) { background: rgba(148, 163, 184, 0.08); }
          code { background: rgba(148, 163, 184, 0.12); padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Security Scanner API Docs</h1>
        <p>Available endpoints for the backend API.</p>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>GET</td><td><code>/api</code></td><td>API root listing routes</td></tr>
            <tr><td>GET</td><td><code>/docs</code></td><td>This documentation page</td></tr>
            <tr><td>GET</td><td><code>/api/health</code></td><td>Health check</td></tr>
            <tr><td>GET</td><td><code>/api/history</code></td><td>Retrieve scan history (persisted)</td></tr>
            <tr><td>DELETE</td><td><code>/api/history</code></td><td>Clear scan history</td></tr>
            <tr><td>POST</td><td><code>/api/scan/code</code></td><td>Scan provided code for vulnerabilities</td></tr>
            <tr><td>POST</td><td><code>/api/scan/dependencies</code></td><td>Scan dependencies (package.json) for issues</td></tr>
            <tr><td>POST</td><td><code>/api/scan/repo</code></td><td>Scan entire repository (ZIP) for code and dependency vulnerabilities</td></tr>
            <tr><td>GET</td><td><code>/api/dashboard/stats</code></td><td>Mock dashboard statistics</td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
  res.type('html').send(docsHtml);
});

app.get('/api/history', (req, res) => {
  const history = loadHistory();
  res.json({ history });
});

app.delete('/api/history', (req, res) => {
  saveHistory([]);
  res.json({ message: 'History cleared' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.post('/api/scan/code', async (req, res) => {
  const { code, filename } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing required `code` field in request body' });
  }

  const scanTime = new Date().toISOString();

  try {
    const lintResults = await eslint.lintText(code, {
      filePath: filename || 'input.js'
    });

    const vulnerabilities = [];

    lintResults.forEach((result) => {
      result.messages.forEach((msg) => {
        // Convert ESLint message to our vulnerability format
        vulnerabilities.push({
          severity: msg.severity === 2 ? 'High' : 'Medium',
          ruleId: msg.ruleId,
          title: msg.ruleId || 'Security issue detected',
          description: msg.message,
          line: msg.line,
          column: msg.column,
          fix: msg.fix ? msg.fix.text : undefined,
          docsUrl: msg.ruleId
            ? `https://eslint.org/docs/rules/${msg.ruleId}`
            : undefined
        });
      });
    });

    // Additional pattern-based detections (for things ESLint may not flag)
    const patterns = [
      {
        id: 'unsafe-innerhtml',
        title: 'Unsafe use of innerHTML',
        description: 'Assigning to innerHTML can lead to cross-site scripting (XSS) if user-controlled content is injected.',
        fix: 'Use safer DOM APIs like textContent or a templating library that auto-escapes user input.',
        regex: /innerHTML\s*=/i,
        severity: 'High'
      },
      {
        id: 'unsafe-document-write',
        title: 'Unsafe use of document.write',
        description: 'document.write can be abused to inject malicious scripts and is generally unsafe in modern web apps.',
        fix: 'Avoid document.write; use DOM manipulation or templating instead.',
        regex: /document\.write\s*\(/i,
        severity: 'High'
      },
      {
        id: 'unsafe-exec',
        title: 'Command execution via exec()',
        description: 'Using exec() can run arbitrary shell commands; do not execute user-provided input.',
        fix: 'Avoid exec(); use safer alternatives or validate/whitelist input before executing.',
        regex: /(?:\bexec\s*\(|child_process\.exec\s*\()/i,
        severity: 'High'
      }
    ];

    patterns.forEach((pattern) => {
      if (pattern.regex.test(code)) {
        vulnerabilities.push({
          severity: pattern.severity,
          ruleId: pattern.id,
          title: pattern.title,
          description: pattern.description,
          line: 1,
          column: 1,
          fix: pattern.fix,
          docsUrl: undefined
        });
      }
    });

    const highCount = vulnerabilities.filter(v => v.severity === 'High').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'Medium').length;
    const riskScore = Math.min(100, highCount * 40 + mediumCount * 20);

    const result = {
      vulnerabilities,
      riskScore,
      scanTime
    };

    appendHistory({
      id: Date.now().toString(),
      type: 'code',
      timestamp: scanTime,
      input: { snippet: code.slice(0, 500) },
      result
    });

    res.json(result);
  } catch (error) {
    console.error('Error during code scan:', error);

    // Fallback to the sample vulnerabilities if linting fails
    const result = {
      vulnerabilities: sampleVulnerabilities,
      riskScore: 75,
      scanTime
    };

    appendHistory({
      id: Date.now().toString(),
      type: 'code',
      timestamp: scanTime,
      input: { snippet: code.slice(0, 500) },
      result,
      error: error.message
    });

    res.status(500).json({
      error: 'Code scan failed',
      details: error.message,
      result
    });
  }
});

app.post('/api/scan/dependencies', upload.single('file'), async (req, res) => {
  let packageJsonContent = req.body.packageJson;

  if (req.file) {
    // Handle file upload
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.zip') {
      // Extract ZIP
      const zip = new AdmZip(filePath);
      const tempDir = path.join(os.tmpdir(), `extract-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      zip.extractAllTo(tempDir, true);

      // Find package.json
      const packageJsonPath = path.join(tempDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      } else {
        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'No package.json found in uploaded ZIP' });
      }

      // Clean up temp dir after getting content
      fs.rmSync(tempDir, { recursive: true, force: true });
    } else if (ext === '.json') {
      // Direct package.json upload
      packageJsonContent = fs.readFileSync(filePath, 'utf8');
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file type. Upload ZIP or JSON.' });
    }

    fs.unlinkSync(filePath); // Clean up uploaded file
  }

  if (!packageJsonContent || typeof packageJsonContent !== 'string') {
    return res.status(400).json({ error: 'Missing package.json content' });
  }

  const scanTime = new Date().toISOString();

  try {
    // Create a temporary directory for the audit
    const tempDir = path.join(os.tmpdir(), `audit-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Write package.json to temp dir
    const packageJsonPath = path.join(tempDir, 'package.json');
    fs.writeFileSync(packageJsonPath, packageJsonContent, 'utf8');

    // Run npm audit --json
    const { stdout } = await execAsync('npm audit --json', { cwd: tempDir });

    const auditResult = JSON.parse(stdout);

    // Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Process audit results
    const vulnerabilities = [];
    const advisories = auditResult.advisories || {};

    Object.values(advisories).forEach((advisory) => {
      vulnerabilities.push({
        name: advisory.module_name,
        version: advisory.vulnerable_versions,
        severity: advisory.severity.charAt(0).toUpperCase() + advisory.severity.slice(1),
        title: advisory.title,
        description: advisory.overview,
        cwe: advisory.cwe ? `CWE-${advisory.cwe}` : undefined,
        fix: advisory.recommendation || 'Update to a non-vulnerable version',
        url: advisory.url,
        cvss: advisory.cvss_score
      });
    });

    const totalDependencies = auditResult.metadata ? auditResult.metadata.totalDependencies : 0;
    const vulnerableCount = vulnerabilities.length;

    const result = {
      dependencies: vulnerabilities,
      totalDependencies,
      vulnerableCount,
      scanTime
    };

    appendHistory({
      id: Date.now().toString(),
      type: 'dependencies',
      timestamp: scanTime,
      input: { packageJsonSnippet: packageJsonContent.slice(0, 500) },
      result
    });

    res.json(result);
  } catch (error) {
    console.error('Error during dependency scan:', error);

    // Fallback to sample data if audit fails
    const result = {
      dependencies: sampleDependencies,
      totalDependencies: sampleDependencies.length,
      vulnerableCount: sampleDependencies.filter(d => d.severity !== 'Low').length,
      scanTime
    };

    appendHistory({
      id: Date.now().toString(),
      type: 'dependencies',
      timestamp: scanTime,
      input: { packageJsonSnippet: packageJsonContent.slice(0, 500) },
      result,
      error: error.message
    });

    res.status(500).json({
      error: 'Dependency scan failed',
      details: error.message,
      result
    });
  }
});

app.post('/api/scan/repo', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  if (ext !== '.zip') {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'Only ZIP files are supported for repo scanning' });
  }

  const scanTime = new Date().toISOString();

  try {
    // Extract ZIP
    const zip = new AdmZip(filePath);
    const tempDir = path.join(os.tmpdir(), `repo-scan-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    zip.extractAllTo(tempDir, true);

    // Find all JS/TS files
    const codeFiles = [];
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (stat.isFile() && /\.(js|ts|jsx|tsx)$/.test(file)) {
          codeFiles.push(filePath);
        }
      }
    };
    walkDir(tempDir);

    // Scan code files
    const allVulnerabilities = [];
    let totalRiskScore = 0;
    let fileCount = 0;

    for (const codeFile of codeFiles.slice(0, 20)) { // Limit to 20 files for performance
      try {
        const code = fs.readFileSync(codeFile, 'utf8');
        const relativePath = path.relative(tempDir, codeFile);
        const lintResults = await eslint.lintText(code, { filePath: relativePath });

        lintResults.forEach((result) => {
          result.messages.forEach((msg) => {
            allVulnerabilities.push({
              file: relativePath,
              severity: msg.severity === 2 ? 'High' : 'Medium',
              ruleId: msg.ruleId,
              title: msg.ruleId || 'Security issue detected',
              description: msg.message,
              line: msg.line,
              column: msg.column,
              fix: msg.fix ? msg.fix.text : undefined,
              docsUrl: msg.ruleId ? `https://eslint.org/docs/rules/${msg.ruleId}` : undefined
            });
          });
        });
        fileCount++;
      } catch (err) {
        console.error(`Error scanning ${codeFile}:`, err);
      }
    }

    // Scan dependencies if package.json exists
    let dependencyResults = null;
    const packageJsonPath = path.join(tempDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        const auditTempDir = path.join(os.tmpdir(), `audit-repo-${Date.now()}`);
        fs.mkdirSync(auditTempDir, { recursive: true });
        fs.writeFileSync(path.join(auditTempDir, 'package.json'), packageJsonContent, 'utf8');

        const { stdout } = await execAsync('npm audit --json', { cwd: auditTempDir });
        const auditResult = JSON.parse(stdout);

        const dependencies = [];
        const advisories = auditResult.advisories || {};
        Object.values(advisories).forEach((advisory) => {
          dependencies.push({
            name: advisory.module_name,
            version: advisory.vulnerable_versions,
            severity: advisory.severity.charAt(0).toUpperCase() + advisory.severity.slice(1),
            title: advisory.title,
            description: advisory.overview,
            cwe: advisory.cwe ? `CWE-${advisory.cwe}` : undefined,
            fix: advisory.recommendation || 'Update to a non-vulnerable version',
            url: advisory.url,
            cvss: advisory.cvss_score
          });
        });

        dependencyResults = {
          dependencies,
          totalDependencies: auditResult.metadata ? auditResult.metadata.totalDependencies : 0,
          vulnerableCount: dependencies.length
        };

        fs.rmSync(auditTempDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Dependency scan failed:', err);
      }
    }

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(filePath);

    // Calculate overall risk score
    const highCount = allVulnerabilities.filter(v => v.severity === 'High').length;
    const mediumCount = allVulnerabilities.filter(v => v.severity === 'Medium').length;
    const codeRiskScore = Math.min(100, highCount * 40 + mediumCount * 20);
    const depRiskScore = dependencyResults ? Math.min(100, dependencyResults.vulnerableCount * 25) : 0;
    totalRiskScore = Math.max(codeRiskScore, depRiskScore);

    const result = {
      codeScan: {
        vulnerabilities: allVulnerabilities,
        filesScanned: fileCount,
        riskScore: codeRiskScore
      },
      dependencyScan: dependencyResults,
      overallRiskScore: totalRiskScore,
      scanTime
    };

    appendHistory({
      id: Date.now().toString(),
      type: 'repo',
      timestamp: scanTime,
      input: { repoName: req.file.originalname },
      result
    });

    res.json(result);
  } catch (error) {
    console.error('Error during repo scan:', error);

    // Clean up on error
    try { fs.unlinkSync(filePath); } catch (cleanupError) { /* ignore cleanup failures */ }

    res.status(500).json({
      error: 'Repo scan failed',
      details: error.message
    });
  }
});

app.get('/api/dashboard/stats', (req, res) => {
  // Mock dashboard statistics
  res.json({
    totalScans: 150,
    vulnerabilitiesFound: 45,
    averageRiskScore: 67,
    scansToday: 12
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});