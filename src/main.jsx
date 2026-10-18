import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const DEFAULT_PARTS = [{ partNumber: 'MK1G4LL/A', label: 'iPhone Duo 512GB Star White (unlocked)' }];
const APPLE_PICKUP_URL = 'https://www.apple.com/shop/retail/pickup-message';

function getPickupStatus(payload, partNumber) {
  const stores = payload?.body?.content?.pickupMessage?.stores ?? [];
  return stores.map((store) => {
    const availability = store?.partsAvailability?.[partNumber];
    if (!availability) return null;
    return {
      storeName: store.storeName || store.storeNameForPickup || `Apple Store ${store.storeNumber || ''}`.trim(),
      storeNumber: store.storeNumber || '',
      status: availability.pickupDisplay || 'unknown',
      quote: availability.pickupSearchQuote || availability.messageTypes?.regular?.storePickupQuote || '',
      title: availability.messageTypes?.regular?.storePickupProductTitle || '',
    };
  }).filter(Boolean);
}

async function fetchPickup(part, postalCode) {
  const params = new URLSearchParams({ pl: 'true', 'mts.0': 'regular', location: postalCode, [`parts.0`]: part.partNumber });
  const url = `${APPLE_PICKUP_URL}?${params.toString()}`;
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Apple returned HTTP ${response.status}.`);
  const payload = await response.json();
  const stores = getPickupStatus(payload, part.partNumber);
  if (!stores.length) throw new Error('Apple responded, but no store availability data was found for this part number. Confirm the part number or try again later.');
  return { ...part, stores, checkedAt: new Date().toLocaleString(), error: null };
}

function App() {
  const [postalCode, setPostalCode] = useState('95336');
  const [intervalSeconds, setIntervalSeconds] = useState(120);
  const [parts, setParts] = useState(DEFAULT_PARTS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Ready to request live pickup availability from Apple.');
  const [newPart, setNewPart] = useState({ partNumber: '', label: '' });
  const [lastChecked, setLastChecked] = useState('Not checked yet');
  const [results, setResults] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  async function checkNow() {
    if (!/^\d{5}$/.test(postalCode)) {
      setMessage('Enter a valid 5-digit US ZIP code.');
      return;
    }
    if (!parts.length) {
      setMessage('Add at least one Apple part number before checking.');
      return;
    }
    setBusy(true);
    setMessage('Requesting live pickup data from Apple…');
    const nextResults = await Promise.all(parts.map(async part => {
      try { return await fetchPickup(part, postalCode); }
      catch (error) { return { ...part, stores: [], checkedAt: new Date().toLocaleString(), error: error?.message || 'Request failed.' }; }
    }));
    setResults(nextResults);
    setLastChecked(new Date().toLocaleString());
    const failures = nextResults.filter(item => item.error).length;
    if (failures === 0) setMessage('Live Apple pickup response received. Availability can change quickly; verify on Apple before ordering.');
    else if (nextResults.every(item => item.error && /fetch|network|failed to fetch|load failed|cors/i.test(item.error))) setMessage('The browser could not read Apple’s response. This is usually a CORS or network restriction; a small backend proxy may be needed. No sample data is being shown.');
    else setMessage(`${failures} model(s) could not be checked. See the error shown on each model. No sample data is being shown.`);
    setBusy(false);
  }

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => { checkNow(); }, Math.max(60, intervalSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, intervalSeconds, postalCode, parts]);

  function addPart() {
    const partNumber = newPart.partNumber.trim().toUpperCase();
    if (!partNumber) return;
    if (parts.some(part => part.partNumber === partNumber)) {
      setMessage('That part number is already in your list.');
      return;
    }
    setParts(old => [...old, { partNumber, label: newPart.label.trim() || partNumber }]);
    setNewPart({ partNumber: '', label: '' });
    setMessage('Model added. Click “Check live availability” to query Apple.');
  }

  function removePart(partNumber) {
    setParts(old => old.filter(part => part.partNumber !== partNumber));
    setResults(old => old.filter(item => item.partNumber !== partNumber));
  }

  return <main className="shell">
    <header className="hero">
      <div className="eyebrow">APPLE STORE MONITOR · LIVE FETCH TEST</div>
      <h1>Find your iPhone Duo sooner.</h1>
      <p>Request live Apple Store pickup availability by ZIP code. This version has no notifications and does not display fabricated stock results.</p>
      <div className="heroActions"><button onClick={checkNow} disabled={busy}>{busy ? 'Checking Apple…' : 'Check live availability'}</button><span className="muted">Last checked: {lastChecked}</span></div>
    </header>

    <div className="notice" role="status"><strong>Live request mode:</strong> the browser calls Apple’s public, undocumented pickup endpoint directly. Apple may block the request or the browser may reject it due to CORS. If that happens, the app will show an error rather than invent availability.</div>

    <section className="statusRow">
      <div className="statusCard"><span className="label">Data source</span><strong>Apple pickup endpoint</strong><small>Unofficial endpoint; not guaranteed stable.</small></div>
      <div className="statusCard"><span className="label">Auto-refresh</span><strong>{autoRefresh ? `On · ${intervalSeconds}s` : 'Off'}</strong><small>Runs only while this browser page is open.</small></div>
      <div className="statusCard"><span className="label">Notifications</span><strong>Off</strong><small>No email, SMS, or credentials.</small></div>
    </section>

    {message && <div className="notice" role="status">{message}</div>}

    <section className="panel">
      <div className="sectionHead"><div><div className="eyebrow">YOUR SEARCH</div><h2>Models and location</h2></div></div>
      <div className="formGrid">
        <label>US ZIP code<input value={postalCode} onChange={e => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" maxLength={5} /></label>
        <label>Refresh interval<select value={intervalSeconds} onChange={e => setIntervalSeconds(Number(e.target.value))}><option value={60}>Every 60 seconds</option><option value={120}>Every 2 minutes</option><option value={300}>Every 5 minutes</option><option value={600}>Every 10 minutes</option></select></label>
      </div>
      <label className="toggleLabel"><input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Automatically refresh while this page is open</label>
      <p className="hint">Keep refresh intervals reasonable. Apple may rate-limit or temporarily block repeated requests.</p>
      <h3>Apple part numbers</h3>
      <p className="hint">The default is MK1G4LL/A. Confirm that the part number matches your exact Duo color, storage, and configuration.</p>
      <div className="partsList">{parts.map(part => <div className="part" key={part.partNumber}><div><strong>{part.label}</strong><small>{part.partNumber}</small></div><button className="remove" onClick={() => removePart(part.partNumber)} aria-label={`Remove ${part.partNumber}`}>Remove</button></div>)}</div>
      <div className="addGrid"><label>Apple part number<input placeholder="e.g. MK1G4LL/A" value={newPart.partNumber} onChange={e => setNewPart(v => ({ ...v, partNumber: e.target.value }))} /></label><label>Label (optional)<input placeholder="Color / storage / carrier" value={newPart.label} onChange={e => setNewPart(v => ({ ...v, label: e.target.value }))} /></label><button className="secondary" onClick={addPart}>Add model</button></div>
    </section>

    <section className="panel">
      <div className="sectionHead"><div><div className="eyebrow">LIVE RESPONSES</div><h2>Pickup availability</h2></div><span className="pill">{results.length} model(s)</span></div>
      {!results.length && <p className="hint">No request has been made yet. Click “Check live availability” to query Apple.</p>}
      {results.map(item => <article className="result" key={item.partNumber}>
        <div className="resultTitle"><div><h3>{item.label}</h3><small>{item.partNumber}</small></div><a href="https://www.apple.com/shop/buy-iphone/" target="_blank" rel="noreferrer">Open Apple Store ↗</a></div>
        {item.error ? <div className="resultBox errorBox"><span className="label">Request error</span><p>{item.error}</p><small>This is not the same as “out of stock.” The live status is unknown.</small></div> : <div className="resultBox"><span className="label">Store results · checked {item.checkedAt}</span>{item.stores.map((store, i) => <div className="storeRow" key={`${store.storeNumber}-${i}`}><div><strong>{store.storeName}</strong><small>{store.quote || `Store number ${store.storeNumber || 'not supplied'}`}</small></div><span className={`pill ${String(store.status).toLowerCase() === 'available' ? 'available' : ''}`}>{store.status}</span></div>)}</div>}
      </article>)}
    </section>
    <footer>Unofficial personal availability checker · Not affiliated with Apple · Read-only requests only · No order is placed automatically.</footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
