import { useMemo, useState } from 'react';
import { reconcileUpload } from '../reconcileClient';
import ReasoningTimeline from './ReasoningTimeline';

const REQUIRED_FILES = ['facility', 'worker', 'gps', 'messages'];

export default function ReconcileDashboard() {
  const [files, setFiles] = useState({
    facility: null,
    worker: null,
    gps: null,
    messages: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(
    () => REQUIRED_FILES.every((key) => files[key] instanceof File),
    [files]
  );

  const handleFileChange = (key, event) => {
    const nextFile = event.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [key]: nextFile }));
  };

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);
    setError('');
    try {
      const payload = await reconcileUpload(files);
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-black text-white overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reconcile Shift</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Upload <code className="text-zinc-300">facility.csv</code>, <code className="text-zinc-300">worker.json</code>, <code className="text-zinc-300">gps.json</code>, and <code className="text-zinc-300">messages.txt</code>
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-sm font-medium transition-colors"
          >
            {loading ? 'Reconciling…' : 'Run Reconciliation'}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FileInput label="Facility CSV" accept=".csv,text/csv" file={files.facility} onChange={(e) => handleFileChange('facility', e)} />
          <FileInput label="Worker JSON" accept=".json,application/json" file={files.worker} onChange={(e) => handleFileChange('worker', e)} />
          <FileInput label="GPS JSON" accept=".json,application/json" file={files.gps} onChange={(e) => handleFileChange('gps', e)} />
          <FileInput label="Messages TXT" accept=".txt,text/plain" file={files.messages} onChange={(e) => handleFileChange('messages', e)} />
        </div>

        {error && (
          <div className="border border-red-700/40 bg-red-950/20 text-red-300 rounded p-3 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Hours" value={String(result.recommendation?.hours ?? '—')} />
              <StatCard label="Rate" value={`$${Number(result.recommendation?.hourly_rate ?? 0).toFixed(2)}`} />
              <StatCard label="Payout" value={`$${Number(result.recommendation?.payout ?? 0).toFixed(2)}`} />
              <StatCard label="Confidence" value={(result.confidence || '—').toUpperCase()} />
            </div>

            <section className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <h2 className="text-sm uppercase tracking-wide text-zinc-400">Explanation</h2>
              <p className="text-sm text-zinc-200 leading-relaxed">{result.explanation}</p>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <h2 className="text-sm uppercase tracking-wide text-zinc-400">Evidence</h2>
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <EvidenceRow label="Facility Hours" value={result.evidence?.facility_hours} />
                <EvidenceRow label="Worker Hours" value={result.evidence?.worker_hours} />
                <EvidenceRow label="GPS Hours" value={result.evidence?.gps_hours} />
                <EvidenceRow label="Agreement" value={result.evidence?.sources_agreement} />
                <EvidenceRow label="GPS Confirmed" value={String(result.evidence?.gps_on_site_confirmed)} />
                <EvidenceRow label="OT Approved" value={String(result.evidence?.overtime_approved)} />
              </div>
              {Array.isArray(result.evidence?.key_messages) && result.evidence.key_messages.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs uppercase text-zinc-500">Key Messages</div>
                  {result.evidence.key_messages.map((line, idx) => (
                    <div key={idx} className="text-xs text-zinc-300">{line}</div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-2">
              <h2 className="text-sm uppercase tracking-wide text-zinc-400">Flags</h2>
              {result.flags?.length ? (
                result.flags.map((flag, idx) => (
                  <div key={idx} className="text-sm text-amber-300">• {flag}</div>
                ))
              ) : (
                <div className="text-sm text-zinc-400">No flags.</div>
              )}
            </section>

            <ReasoningTimeline steps={result.reasoning_steps} />

            {(Array.isArray(result.confidence_suggestions) &&
              result.confidence_suggestions.length > 0 &&
              (result.confidence || '').toLowerCase() !== 'high') && (
              <section className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                <h2 className="text-sm uppercase tracking-wide text-zinc-400">Increase Confidence</h2>
                {result.confidence_suggestions.map((suggestion, idx) => (
                  <div key={idx} className="text-sm text-zinc-300">• {suggestion}</div>
                ))}
              </section>
            )}

            <details className="rounded border border-zinc-800 bg-zinc-950 p-4">
              <summary className="cursor-pointer text-sm text-zinc-300">Raw JSON</summary>
              <pre className="mt-3 bg-zinc-900 text-xs text-zinc-200 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function FileInput({ label, accept, file, onChange }) {
  return (
    <label className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2 block">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <input type="file" accept={accept} onChange={onChange} className="block w-full text-xs text-zinc-300" />
      <div className="text-xs text-zinc-500 truncate">{file ? file.name : 'No file selected'}</div>
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-lg text-zinc-100 mt-1">{value}</div>
    </div>
  );
}

function EvidenceRow({ label, value }) {
  return (
    <div className="text-zinc-300">
      <span className="text-zinc-500">{label}: </span>
      <span>{value === null || value === undefined ? '—' : String(value)}</span>
    </div>
  );
}
