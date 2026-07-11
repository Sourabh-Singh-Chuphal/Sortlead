'use client';

import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CheckCircle2, AlertTriangle, Download, ArrowRight, User, Mail, Phone, Info } from 'lucide-react';

interface CrmRecord {
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: string;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
}

interface SkipRecord {
  row: any;
  reason: string;
}

interface ResultsDisplayProps {
  imported: CrmRecord[];
  skipped: SkipRecord[];
  totalImported: number;
  totalSkipped: number;
  onReset: () => void;
}

export function ResultsDisplay({
  imported,
  skipped,
  totalImported,
  totalSkipped,
  onReset
}: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = React.useState<'imported' | 'skipped'>('imported');
  const [selectedRecord, setSelectedRecord] = React.useState<CrmRecord | null>(null);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const activeCount = activeTab === 'imported' ? imported.length : skipped.length;

  const rowVirtualizer = useVirtualizer({
    count: activeCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Height of virtual rows
    overscan: 10
  });

  const handleDownloadCsv = () => {
    // Generate CSV for successfully imported CRM records
    const headers = [
      'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
      'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 'crm_note',
      'data_source', 'possession_time', 'description'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    imported.forEach(rec => {
      const row = headers.map(h => {
        const val = (rec as any)[h] || '';
        // Escape quotes and line breaks for CSV safety
        const escaped = String(val).replace(/"/g, '""').replace(/\n/g, '\\n');
        return `"${escaped}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `crm_imported_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'GOOD_LEAD_FOLLOW_UP':
        return 'bg-match/15 text-[#219665] border-match/30';
      case 'DID_NOT_CONNECT':
        return 'bg-review/15 text-[#c78216] border-review/30';
      case 'BAD_LEAD':
        return 'bg-skip/15 text-[#c94946] border-skip/30';
      case 'SALE_DONE':
        return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
      default:
        return 'bg-line text-ink-muted border-line';
    }
  };

  const getDataSourceLabel = (src?: string) => {
    if (!src) return '';
    // Format snake_case to Title Case or Keep lowercase as per spec
    return src;
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Stats Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Processed Card */}
        <div className="bg-ink text-paper p-5 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-xs font-mono uppercase tracking-wider text-paper-muted">01 / Summary</span>
          <div className="mt-4">
            <span className="text-4xl font-display font-semibold tracking-tight">
              {totalImported + totalSkipped}
            </span>
            <span className="text-sm font-sans block text-paper-muted mt-1">Total Spreadsheet Rows Analyzed</span>
          </div>
        </div>

        {/* Imported Success Card */}
        <div className="bg-paper border border-line p-5 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 text-match">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">02 / Success</span>
          <div className="mt-4">
            <span className="text-4xl font-display font-semibold tracking-tight text-ink">
              {totalImported}
            </span>
            <span className="text-sm font-sans block text-ink-muted mt-1">Successfully Mapped to CRM Schema</span>
          </div>
          {imported.length > 0 && (
            <button
              onClick={handleDownloadCsv}
              className="mt-4 inline-flex items-center text-xs font-mono uppercase tracking-wider text-ink hover:text-ink-muted font-bold focus-ring rounded"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Download Mapped CSV
            </button>
          )}
        </div>

        {/* Skipped Errors Card */}
        <div className="bg-paper border border-line p-5 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 text-skip">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">03 / Exclusions</span>
          <div className="mt-4">
            <span className="text-4xl font-display font-semibold tracking-tight text-ink">
              {totalSkipped}
            </span>
            <span className="text-sm font-sans block text-ink-muted mt-1">Records Skipped / Left Out</span>
          </div>
          <div className="mt-4 text-xs font-sans text-ink-muted">
            {totalSkipped > 0 ? 'Review skipped list for reasons' : 'Clean sheet! 0 errors.'}
          </div>
        </div>
      </div>

      {/* Main Results View */}
      <div className="bg-paper border border-line rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Navigation & Actions */}
        <div className="px-5 py-3 border-b border-line bg-paper flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex bg-line p-0.5 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('imported')}
              className={`px-4 py-1.5 rounded-md text-xs font-sans font-medium transition-all ${
                activeTab === 'imported'
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Ready for Import ({imported.length})
            </button>
            <button
              onClick={() => setActiveTab('skipped')}
              className={`px-4 py-1.5 rounded-md text-xs font-sans font-medium transition-all ${
                activeTab === 'skipped'
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Skipped Records ({skipped.length})
            </button>
          </div>

          <button
            onClick={onReset}
            className="text-xs font-mono uppercase font-bold text-ink hover:text-ink-muted border border-line px-3 py-1.5 rounded-lg bg-paper transition-all hover:bg-line/20"
          >
            Import Another CSV
          </button>
        </div>

        {/* Scrollable Virtualized Grid Area */}
        <div className="flex-1 min-h-[350px] relative">
          {activeCount === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[350px]">
              <span className="font-mono text-xs text-ink-muted uppercase tracking-wider">No Records Present</span>
              <p className="text-sm text-ink-muted mt-2 max-w-sm font-sans">
                {activeTab === 'imported'
                  ? 'No records met the minimum criteria to be mapped to the CRM schema.'
                  : 'All rows were mapped successfully! No skipped records found.'}
              </p>
            </div>
          ) : (
            <div
              ref={parentRef}
              className="h-[400px] overflow-auto custom-scrollbar"
              style={{ contain: 'strict' }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative'
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const isImported = activeTab === 'imported';
                  
                  if (isImported) {
                    const item = imported[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute left-0 w-full border-b border-line flex items-center justify-between px-5 hover:bg-line/10 transition-colors cursor-pointer group"
                        style={{
                          top: 0,
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`
                        }}
                        onClick={() => setSelectedRecord(item)}
                      >
                        {/* Sans-serif resolved output */}
                        <div className="flex items-center space-x-4 min-w-0 flex-1 pr-4">
                          <div className="h-8 w-8 rounded-full bg-ink/5 border border-line flex items-center justify-center flex-shrink-0 text-ink">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-sans font-medium text-sm text-ink truncate">
                                {item.name || 'Anonymous Lead'}
                              </span>
                              {item.company && (
                                <span className="font-sans text-xs text-ink-muted truncate max-w-[150px]">
                                  at {item.company}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 mt-0.5 text-xs text-ink-muted">
                              {item.email && (
                                <span className="flex items-center truncate">
                                  <Mail className="h-3 w-3 mr-1 flex-shrink-0 text-ink-muted/60" />
                                  {item.email}
                                </span>
                              )}
                              {item.mobile_without_country_code && (
                                <span className="flex items-center whitespace-nowrap">
                                  <Phone className="h-3 w-3 mr-1 flex-shrink-0 text-ink-muted/60" />
                                  {item.country_code || ''} {item.mobile_without_country_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mapped Fields & Badges */}
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          {item.data_source && (
                            <span className="hidden sm:inline-block border px-2 py-0.5 rounded text-[10px] font-mono text-ink-muted bg-line uppercase tracking-wider">
                              {getDataSourceLabel(item.data_source)}
                            </span>
                          )}
                          {item.crm_status && (
                            <span className={`border px-2.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase ${getStatusBadgeClass(item.crm_status)}`}>
                              {item.crm_status.replace(/_/g, ' ')}
                            </span>
                          )}
                          <ArrowRight className="h-4 w-4 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  } else {
                    const item = skipped[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute left-0 w-full border-b border-line flex flex-col justify-center px-5 hover:bg-line/10 transition-colors"
                        style={{
                          top: 0,
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2 text-xs font-sans text-skip font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{item.reason}</span>
                          </div>
                        </div>
                        {/* Monospace raw input data */}
                        <div className="mt-1 flex items-center space-x-2 text-[10px] font-mono text-ink-muted truncate">
                          <span className="text-ink font-bold flex-shrink-0">Raw Data:</span>
                          <span className="truncate bg-line/40 px-1 py-0.5 rounded">
                            {JSON.stringify(item.row)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Side Drawer Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-200">
          <div className="w-full max-w-lg bg-paper h-full shadow-2xl flex flex-col border-l border-line p-6 relative overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start border-b border-line pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">CRM Mapping Record Details</span>
                <h3 className="font-display font-semibold text-lg text-ink mt-1">
                  {selectedRecord.name || 'Anonymous Lead'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="font-mono text-xs uppercase text-ink hover:text-ink-muted border border-line px-2 py-1 rounded bg-line/20"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {/* Profile Card */}
              <div className="bg-line/10 p-4 rounded-xl space-y-2 border border-line">
                <div className="flex justify-between text-xs font-mono text-ink-muted">
                  <span>Status:</span>
                  {selectedRecord.crm_status ? (
                    <span className={`border px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase ${getStatusBadgeClass(selectedRecord.crm_status)}`}>
                      {selectedRecord.crm_status.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-paper-muted">None</span>
                  )}
                </div>
                <div className="flex justify-between text-xs font-mono text-ink-muted">
                  <span>Source:</span>
                  <span className="text-ink uppercase tracking-wide">{selectedRecord.data_source || 'None'}</span>
                </div>
                {selectedRecord.lead_owner && (
                  <div className="flex justify-between text-xs font-mono text-ink-muted">
                    <span>Lead Owner:</span>
                    <span className="text-ink">{selectedRecord.lead_owner}</span>
                  </div>
                )}
              </div>

              {/* Data Grid */}
              <div className="space-y-3">
                <h4 className="font-sans font-semibold text-xs text-ink uppercase tracking-wide">Extracted Schema Fields</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.entries(selectedRecord)
                    .filter(([key]) => key !== '_original_index')
                    .map(([key, val]) => (
                      <div key={key} className="border-b border-line pb-2 flex flex-col justify-start">
                        <span className="font-mono text-[10px] text-ink-muted">{key}</span>
                        <span className="font-sans text-sm text-ink font-medium mt-0.5 break-words">
                          {val === null || val === undefined || val === '' ? (
                            <span className="font-mono text-xs text-paper-muted italic">(blank)</span>
                          ) : (
                            String(val)
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
