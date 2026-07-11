'use client';

import React, { useState, useTransition } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, Play, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';

const SignatureHeroAnimation = dynamic(
  () => import('../components/signature-hero-animation').then(mod => mod.SignatureHeroAnimation),
  { ssr: false }
);
import { CSVPreview } from '../components/csv-preview';
import { ResultsDisplay } from '../components/results-display';

type Stage = 'upload' | 'preview' | 'importing' | 'results';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  
  // Progress state
  const [progress, setProgress] = useState({
    currentBatch: 0,
    totalBatches: 0,
    importedCount: 0,
    skippedCount: 0
  });

  // Results state
  const [results, setResults] = useState<{
    imported: any[];
    skipped: any[];
    totalImported: number;
    totalSkipped: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // React Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileName(file.name);
      setError(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('PapaParse warnings:', results.errors);
          }

          if (results.data.length === 0) {
            setError('This CSV appears to be empty or could not be parsed.');
            return;
          }

          setParsedRows(results.data);
          // Extract keys from the first row to determine headers
          const headers = Object.keys(results.data[0] as object);
          setCsvHeaders(headers);
          setStage('preview');
        },
        error: (err) => {
          setError(`Error parsing CSV: ${err.message}`);
        }
      });
    }
  });

  const handleLoadTestCsv = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName('GrowEasy_Sample_Leads.csv');
    setError(null);
    
    const mockCsvContent = `Lead Name,Email Address,Country Code,Phone Number,Company,City,State,Country,Lead Owner,Status,Notes
John Doe,john.doe@example.com,+91,9876543210,GrowEasy,Mumbai,Maharashtra,India,test@gmail.com,GOOD_LEAD_FOLLOW_UP,Client is asking to reschedule demo
Sarah Johnson,sarah.johnson@example.com,+91,9876543211,Tech Solutions,Bangalore,Karnataka,India,test@gmail.com,DID_NOT_CONNECT,"Person was busy, will try again next week"
Rajesh Patel,rajesh.patel@example.com,+91,9876543212,Startup Inc,Delhi,Delhi,India,test@gmail.com,BAD_LEAD,Not interested in our services
Priya Singh,priya.singh@example.com,+91,9876543213,Enterprise Corp,Pune,Maharashtra,India,test@gmail.com,SALE_DONE,"Deal closed, onboarding in progress"`;

    Papa.parse(mockCsvContent, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        setParsedRows(results.data);
        const headers = Object.keys(results.data[0] as object);
        setCsvHeaders(headers);
        setStage('preview');
      },
      error: (err) => {
        setError(`Error parsing mock CSV: ${err.message}`);
      }
    });
  };

  const handleDownloadSampleCsvTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const headers = [
      'Lead Name', 'Email Address', 'Country Code', 'Phone Number',
      'Company', 'City', 'State', 'Country', 'Lead Owner', 'Status', 'Notes'
    ];
    const data = [
      ['John Doe', 'john.doe@example.com', '+91', '9876543210', 'GrowEasy', 'Mumbai', 'Maharashtra', 'India', 'test@gmail.com', 'GOOD_LEAD_FOLLOW_UP', 'Client is asking to reschedule demo'],
      ['Sarah Johnson', 'sarah.johnson@example.com', '+91', '9876543211', 'Tech Solutions', 'Bangalore', 'Karnataka', 'India', 'test@gmail.com', 'DID_NOT_CONNECT', 'Person was busy, will try again next week'],
      ['Rajesh Patel', 'rajesh.patel@example.com', '+91', '9876543212', 'Startup Inc', 'Delhi', 'Delhi', 'India', 'test@gmail.com', 'BAD_LEAD', 'Not interested in our services'],
      ['Priya Singh', 'priya.singh@example.com', '+91', '9876543213', 'Enterprise Corp', 'Pune', 'Maharashtra', 'India', 'test@gmail.com', 'SALE_DONE', 'Deal closed, onboarding in progress']
    ];
    
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
      const escapedRow = row.map(val => `"${val.replace(/"/g, '""')}"`);
      csvContent += escapedRow.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'GrowEasy_Sample_Leads.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleConfirmImport = async () => {
    setStage('importing');
    setProgress({
      currentBatch: 0,
      totalBatches: Math.ceil(parsedRows.length / 25),
      importedCount: 0,
      skippedCount: 0
    });
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/import/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows: parsedRows })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream is not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the last partial line back to the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const dataContent = trimmed.slice(6).trim();
          if (!dataContent) continue;

          try {
            const event = JSON.parse(dataContent);

            if (event.type === 'progress') {
              setProgress({
                currentBatch: event.currentBatch,
                totalBatches: event.totalBatches,
                importedCount: event.importedCount,
                skippedCount: event.skippedCount
              });
            } else if (event.type === 'complete') {
              setResults(event.result);
              setStage('results');
            } else if (event.type === 'error') {
              throw new Error(event.message || 'An error occurred during mapping.');
            }
          } catch (jsonErr) {
            console.error('Error parsing SSE JSON:', jsonErr, trimmed);
          }
        }
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err.message || 'An unexpected connection error occurred.');
      setStage('preview');
    }
  };

  const handleReset = () => {
    setFileName('');
    setParsedRows([]);
    setCsvHeaders([]);
    setResults(null);
    setError(null);
    setStage('upload');
  };

  return (
    <main className="min-h-screen flex flex-col justify-between py-12 px-6 sm:px-12 lg:px-24">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex justify-between items-center pb-8 border-b border-line">
        <div className="flex items-center space-x-2.5">
          <div className="bg-ink text-paper h-8 w-8 rounded-lg flex items-center justify-center font-display font-semibold text-sm">
            SL
          </div>
          <span className="font-display font-bold text-base tracking-tight uppercase text-ink">
            Sortlead
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="border border-line px-2.5 py-1 rounded text-[10px] font-mono font-medium hover:bg-line/20 transition-all uppercase tracking-wider"
          >
            Theme: {isDarkMode ? 'Dark' : 'Light'}
          </button>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-match animate-pulse" />
            <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">
              Stateless AI Engine v1.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Flow Section */}
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col justify-center my-12">
        <AnimatePresence mode="wait">
          {stage === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
            >
              {/* Left Asymmetric Hero Copy */}
              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                  01 / Intelligent Ingestion
                </span>
                <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-[1.08] text-balance">
                  Any spreadsheet in.<br />Clean CRM data out.
                </h1>
                <p className="text-base text-ink-muted leading-relaxed font-sans max-w-xl">
                  Drop Facebook Ads exports, Google Ads leads sheets, or manual spreadsheets. 
                  Our stateless AI processes columns in batches, extracts entities, formats dates, 
                  checks validation schemas, and delivers clean, standardized CRM records.
                </p>

                {/* Dropzone trigger */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragActive
                      ? 'border-match bg-match/5'
                      : 'border-line hover:border-ink hover:bg-line/10'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <UploadCloud className="h-10 w-10 text-ink-muted/80" />
                    <div>
                      <p className="text-sm font-sans font-medium text-ink">
                        Drag and drop your lead CSV here, or <span className="underline">browse</span>
                      </p>
                      <p className="text-xs text-ink-muted mt-1 font-mono">
                        Any column names, layout, or formats. Max 10MB CSV.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                  <button
                    onClick={handleLoadTestCsv}
                    className="text-xs font-mono uppercase tracking-wider text-ink hover:text-ink-muted focus-ring px-3 py-2 rounded bg-line/20 border border-line font-bold"
                  >
                    Load GrowEasy Sample CSV
                  </button>
                  <button
                    onClick={handleDownloadSampleCsvTemplate}
                    className="text-xs font-mono uppercase tracking-wider text-ink hover:text-ink-muted focus-ring px-3 py-2 rounded bg-line/20 border border-line font-bold"
                  >
                    Download Sample CSV Template
                  </button>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 text-xs font-sans text-skip bg-skip/5 p-3 rounded-lg border border-skip/25">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Right Asymmetric Hero Signature Animation */}
              <div className="lg:col-span-5 flex justify-center">
                <SignatureHeroAnimation />
              </div>
            </motion.div>
          )}

          {stage === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                    02 / File Staged
                  </span>
                  <h2 className="text-2xl font-display font-semibold text-ink mt-1">
                    {fileName || 'spreadsheet.csv'}
                  </h2>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 border border-line rounded-lg text-xs font-mono uppercase font-bold text-ink hover:bg-line/20 transition-all focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-ink text-paper rounded-lg text-xs font-mono uppercase font-bold flex items-center hover:translate-y-[-2px] transition-all duration-150 focus-ring shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5 fill-current" /> Confirm import
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-xs font-sans text-skip bg-skip/5 p-3 rounded-lg border border-skip/25">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Render CSV Raw preview */}
              <CSVPreview data={parsedRows} headers={csvHeaders} />
            </motion.div>
          )}

          {stage === 'importing' && (
            <motion.div
              key="importing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="max-w-md mx-auto text-center space-y-8"
            >
              <span className="text-xs font-mono uppercase tracking-wider text-ink-muted block">
                03 / Aligning Fields
              </span>
              
              {/* Micro-Animation representing batches */}
              <div className="flex justify-center space-x-2.5">
                {Array.from({ length: Math.min(progress.totalBatches, 5) }).map((_, idx) => {
                  const resolved = progress.currentBatch > idx;
                  const active = progress.currentBatch === idx;
                  return (
                    <motion.div
                      key={idx}
                      animate={{
                        backgroundColor: resolved ? 'var(--match)' : active ? 'var(--ink)' : 'rgba(20,22,31,0.08)',
                        scale: active ? [1, 1.1, 1] : 1
                      }}
                      transition={{
                        repeat: active ? Infinity : 0,
                        duration: 1.2
                      }}
                      className="h-3 w-10 rounded-full border border-line"
                    />
                  );
                })}
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-display font-semibold text-ink">
                  AI mapping in progress...
                </h3>
                {/* Batch Progress Text matching signature motif */}
                <p className="text-sm text-ink-muted font-mono uppercase">
                  Batch {progress.currentBatch} of {progress.totalBatches} resolved
                </p>
                <div className="text-xs font-sans text-ink-muted/80">
                  Mapped {progress.importedCount} records • Skipped {progress.skippedCount} exclusions
                </div>
              </div>

              {/* Loader background progress track */}
              <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-match"
                  initial={{ width: '0%' }}
                  animate={{
                    width: `${
                      progress.totalBatches > 0
                        ? (progress.currentBatch / progress.totalBatches) * 100
                        : 0
                    }%`
                  }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}

          {stage === 'results' && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="border-b border-line pb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                  04 / Import Complete
                </span>
                <h2 className="text-2xl font-display font-semibold text-ink mt-1">
                  Extraction results
                </h2>
              </div>

              {/* Render the detailed virtualized results display */}
              <ResultsDisplay
                imported={results.imported}
                skipped={results.skipped}
                totalImported={results.totalImported}
                totalSkipped={results.totalSkipped}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Footer */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-line text-xs font-mono text-ink-muted gap-4">
        <span>© 2026 Sortlead Technologies Inc.</span>
        <div className="flex space-x-6">
          <span>Stateless Data Model</span>
          <span>Zero Retention Policy</span>
        </div>
      </footer>
    </main>
  );
}
