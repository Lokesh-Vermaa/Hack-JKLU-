import { useState } from 'react';

export default function RepoScanner({ onRepoScanned }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [results, setResults] = useState(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

  const normalizeSeverity = (severity = '') => severity.toLowerCase();

  const formatSeverity = (severity = '') => {
    const normalized = normalizeSeverity(severity);
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown';
  };

  const normalizeRepoResults = (data) => ({
    ...data,
    codeScan: data?.codeScan
      ? {
          ...data.codeScan,
          vulnerabilities: (data.codeScan.vulnerabilities || []).map((item) => ({
            ...item,
            severity: normalizeSeverity(item?.severity)
          }))
        }
      : null,
    dependencyScan: data?.dependencyScan
      ? {
          ...data.dependencyScan,
          dependencies: (data.dependencyScan.dependencies || []).map((item) => ({
            ...item,
            severity: normalizeSeverity(item?.severity)
          }))
        }
      : null
  });

  const runRepoScan = async () => {
    if (!uploadedFile) return;

    setIsScanning(true);
    setScanProgress(0);
    setResults(null);

    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        const newProgress = prev + Math.random() * 8;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch(`${API_BASE}/api/scan/repo`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Repo scan request failed');
      const data = normalizeRepoResults(await response.json());

      setResults(data);
      onRepoScanned?.(data);
    } catch (error) {
      setResults({ error: error.message });
    } finally {
      clearInterval(progressInterval);
      setScanProgress(100);

      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const getSeverityColor = (severity) => {
    switch (normalizeSeverity(severity)) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="inline-flex rounded-full bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300">
              REP
            </span>
            Repository Scanner
          </h2>
          <p className="text-sm mt-1 text-gray-400">
            Upload a ZIP archive of your project to scan all code files and dependencies for vulnerabilities
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="cursor-pointer px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">
            <span className="mr-2 rounded bg-gray-600 px-1.5 py-0.5 text-[10px] font-semibold">ZIP</span>
            Upload ZIP
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadedFile(file);
                  setResults(null);
                }
              }}
            />
          </label>
          {uploadedFile && (
            <span className="text-sm text-cyan-400">
              Selected: {uploadedFile.name}
              <button
                onClick={() => {
                  setUploadedFile(null);
                  setResults(null);
                }}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                x
              </button>
            </span>
          )}
          <button
            onClick={runRepoScan}
            disabled={isScanning || !uploadedFile}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold">SCAN</span>
            {isScanning ? 'Scanning...' : 'Scan Repository'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isScanning && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Scanning repository...</span>
            <span className="text-sm text-cyan-400">{Math.round(scanProgress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {results && !results.error && (
        <div className="space-y-6">
          {/* Overall Risk Score */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Overall Risk Assessment</h3>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-cyan-400">
                Risk Score: {results.overallRiskScore}/100
              </div>
              <div className="text-sm text-gray-400">
                Based on code and dependency vulnerabilities
              </div>
            </div>
          </div>

          {/* Code Scan Results */}
          {results.codeScan && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Code Vulnerabilities</h3>
              <div className="bg-gray-700 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-cyan-400">Files Scanned: {results.codeScan.filesScanned}</span>
                  <span className="text-cyan-400">Risk Score: {results.codeScan.riskScore}/100</span>
                </div>
              </div>

              {results.codeScan.vulnerabilities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">File</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Rule</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Issue</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Severity</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Line</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Info</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.codeScan.vulnerabilities.slice(0, 50).map((vulnerability, index) => (
                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-3 px-4 text-gray-300 font-mono text-sm">{vulnerability.file}</td>
                          <td className="py-3 px-4 text-gray-300">
                            {vulnerability.ruleId ? (
                              <a
                                href={vulnerability.docsUrl ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-300 hover:underline"
                              >
                                {vulnerability.ruleId}
                              </a>
                            ) : (
                              <span className="text-gray-300">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-300">{vulnerability.description || vulnerability.title}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase text-white ${getSeverityColor(vulnerability.severity)}`}>
                              {formatSeverity(vulnerability.severity)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{vulnerability.line || 'N/A'}</td>
                          <td className="py-3 px-4">
                            {vulnerability.docsUrl ? (
                              <a
                                href={vulnerability.docsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                              >
                                Docs
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No code vulnerabilities detected</p>
              )}
            </div>
          )}

          {/* Dependency Scan Results */}
          {results.dependencyScan && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Dependency Vulnerabilities</h3>
              <div className="bg-gray-700 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-cyan-400">Total Dependencies: {results.dependencyScan.totalDependencies}</span>
                  <span className="text-cyan-400">Vulnerable: {results.dependencyScan.vulnerableCount}</span>
                </div>
              </div>

              {results.dependencyScan.dependencies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Package</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Vulnerable Versions</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Severity</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Vulnerability</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">CWE</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-semibold">Fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.dependencyScan.dependencies.map((dependency, index) => (
                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                          <td className="py-3 px-4 font-medium text-white">{dependency.name}</td>
                          <td className="py-3 px-4 text-gray-300 font-mono text-sm">{dependency.version}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase text-white ${getSeverityColor(dependency.severity)}`}>
                              {formatSeverity(dependency.severity)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{dependency.title}</td>
                          <td className="py-3 px-4 text-gray-300">{dependency.cwe || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <div className="text-xs">
                              <div className="text-cyan-400 mb-1">{dependency.fix}</div>
                              {dependency.url && (
                                <a
                                  href={dependency.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-300 hover:underline"
                                >
                                  View Advisory
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No dependency vulnerabilities detected</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {results?.error && (
        <div className="bg-red-900/20 border border-red-500 p-4 rounded-lg">
          <h3 className="text-red-400 font-semibold mb-2">Scan Failed</h3>
          <p className="text-red-300">{results.error}</p>
        </div>
      )}
    </div>
  );
}
