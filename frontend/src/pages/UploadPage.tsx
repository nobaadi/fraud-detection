import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { transactionsApi } from '../api';
import { Upload, FileText, CheckCircle, AlertCircle, Download, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: transactionsApi.upload,
  });

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setFileError(`"${file.name}" is not a CSV file. Please upload a .csv file.`);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    uploadMutation.reset();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleSubmit() {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  }

  function downloadSample() {
    const csv = [
      'transaction_id,user_id,timestamp,amount,merchant,merchant_category,location,latitude,longitude,device_type',
      'TXN000001,U00001,2024-06-15T10:30:00,45.99,Amazon,E-commerce,New York,40.7128,-74.0060,mobile_ios',
      'TXN000002,U00001,2024-06-15T11:05:00,320.00,Best Buy,Electronics,Los Angeles,34.0522,-118.2437,desktop_chrome',
      'TXN000003,U00002,2024-06-15T09:15:00,12.50,Starbucks,Food & Beverage,Chicago,41.8781,-87.6298,mobile_android',
      'TXN000004,U00002,2024-06-15T09:20:00,2500.00,CryptoExchange Pro,Cryptocurrency,Tokyo,35.6762,139.6503,unknown_device',
      'TXN000005,U00003,2024-06-15T14:00:00,89.99,Netflix,Entertainment,Houston,29.7604,-95.3698,tablet_ios',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const isSuccess = uploadMutation.isSuccess;
  const isError = uploadMutation.isError;
  const isPending = uploadMutation.isPending;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#c9a46c', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Data Ingestion
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1 }}>
          Upload Transaction{' '}
          <span className="serif" style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
            Data
          </span>
        </h1>
        <p style={{ fontSize: 13, color: '#7a7a8a', marginTop: 6 }}>
          Upload a CSV file to trigger automated fraud analysis
        </p>
      </div>

      {/* Model info */}
      <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(201,164,108,0.06)',
        border:'1px solid rgba(201,164,108,0.16)', display:'flex', gap:12 }}>
        <span style={{ fontSize:14, marginTop:1 }}>⚙</span>
        <div>
          <p style={{ fontSize:12, fontWeight:600, color:'#e2c090', margin:'0 0 3px' }}>How scoring works</p>
          <p style={{ fontSize:12, color:'#7a7a8a', margin:0, lineHeight:1.6 }}>
            An ensemble of Isolation Forest, Logistic Regression, and Random Forest scores each transaction.
            Initial labels are derived from anomaly detection. When you mark transactions as{' '}
            <span style={{ color:'#fca5a5' }}>Confirmed Fraud</span> or{' '}
            <span style={{ color:'#6ee7b7' }}>False Positive</span> in the Investigate view,
            those verified labels retrain the supervised models — improving accuracy over time.
          </p>
        </div>
      </div>

      {/* Format reference */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Required CSV Format</h2>
          <button
            onClick={downloadSample}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            <Download className="w-3 h-3" />
            Download Sample
          </button>
        </div>
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.22)',
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: '#93c5fd', lineHeight: 1.5 }}>
            The sample CSV is only an example for quick testing. You can upload your own transaction CSV as long as it includes the required columns below.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-600">
                {['transaction_id', 'user_id', 'timestamp', 'amount', 'merchant', 'merchant_category', 'location', 'latitude*', 'longitude*', 'device_type'].map((col) => (
                  <th key={col} className="text-left pb-2 pr-4 table-header">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-500">
                <td className="pt-2 pr-4 font-mono">TXN001</td>
                <td className="pt-2 pr-4 font-mono">U001</td>
                <td className="pt-2 pr-4 font-mono">2024-01-15T10:30:00</td>
                <td className="pt-2 pr-4">45.99</td>
                <td className="pt-2 pr-4">Amazon</td>
                <td className="pt-2 pr-4">E-commerce</td>
                <td className="pt-2 pr-4">New York</td>
                <td className="pt-2 pr-4">40.71</td>
                <td className="pt-2 pr-4">-74.00</td>
                <td className="pt-2">mobile_ios</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">* latitude and longitude are optional but improve location anomaly detection.</p>
      </div>

      {/* Drop zone */}
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer',
          dragOver
            ? 'border-brand bg-brand/10'
            : selectedFile
            ? 'border-success/50 bg-success-muted/30'
            : 'border-surface-600 hover:border-slate-500 bg-surface-800'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {selectedFile ? (
          <div className="space-y-3">
            <FileText className="w-10 h-10 text-success mx-auto" />
            <p className="text-white font-medium">{selectedFile.name}</p>
            <p className="text-xs text-slate-500">{selectedFile.size >= 1024 * 1024 ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : `${(selectedFile.size / 1024).toFixed(1)} KB`}</p>
            <button
              className="text-xs text-slate-500 hover:text-danger transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); uploadMutation.reset(); }}
            >
              <X className="w-3 h-3 inline mr-1" />Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className={clsx('w-10 h-10 mx-auto', dragOver ? 'text-brand-light' : 'text-slate-500')} />
            <div>
              <p className="text-white font-medium">Drop your CSV file here</p>
              <p className="text-sm text-slate-500 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-slate-600">CSV format only • sample file is optional</p>
          </div>
        )}
      </div>

      {/* File type error */}
      {fileError && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10,
          background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle style={{ width:15, height:15, color:'#ef4444', flexShrink:0 }} />
          <span style={{ fontSize:12, color:'#fca5a5' }}>{fileError}</span>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !isSuccess && (
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className={clsx(
            'w-full py-3 rounded-xl font-semibold text-sm transition-all',
            isPending
              ? 'bg-brand/50 text-white/50 cursor-not-allowed'
              : 'bg-brand hover:bg-brand-dark text-white'
          )}
        >
          {isPending ? 'Analyzing transactions...' : 'Upload & Analyze'}
        </button>
      )}

      {/* Processing status */}
      {isPending && (
        <div className="card border-brand/20 bg-brand/5">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">Processing transactions...</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Engineering fraud signals and running ML models. This may take a moment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {isSuccess && uploadMutation.data && (
        <div className="card border-success/30 bg-success-muted/30">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-success-light">Analysis Complete</p>
              <p className="text-xs text-slate-300 mt-1">
                <strong>{uploadMutation.data.records_ingested}</strong> transactions ingested and scored.
              </p>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                Status: {uploadMutation.data.processing_status}
              </p>
              <div className="flex gap-3 mt-4">
                <Link to="/dashboard" className="btn-primary text-xs">View Dashboard</Link>
                <Link to="/alerts" className="btn-ghost text-xs">View Alerts</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="card border-danger/30 bg-danger-muted/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-danger-light">Upload Failed</p>
              <p className="text-xs text-slate-400 mt-1">
                {(uploadMutation.error as any)?.response?.data?.detail ?? 'An error occurred. Please check the file format and try again.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
