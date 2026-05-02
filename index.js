import React, { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'Όλα', emoji: '🍀' },
  { id: 'football', label: 'Ποδόσφαιρο', emoji: '⚽' },
  { id: 'basketball', label: 'Μπάσκετ', emoji: '🏀' },
  { id: 'volleyball', label: 'Βόλεϊ', emoji: '🏐' },
  { id: 'tickets', label: 'Εισιτήρια', emoji: '🎟️' },
];

// All RSS sources about Panathinaikos
const RSS_FEEDS = [
  { url: 'https://www.sport-fm.gr/rss/panathinaikos', source: 'sport-fm.gr', label: 'Sport FM' },
  { url: 'https://www.sdna.gr/feed/panathinaikos', source: 'sdna.gr', label: 'SDNA' },
  { url: 'https://www.gazzetta.gr/rss/panathinaikos', source: 'gazzetta.gr', label: 'Gazzetta' },
  { url: 'https://www.sport24.gr/rss/panathinaikos', source: 'sport24.gr', label: 'Sport24' },
  { url: 'https://www.pao.gr/feed', source: 'pao.gr', label: 'PAO FC Official' },
  { url: 'https://www.paobc.gr/feed', source: 'paobc.gr', label: 'PAO BC Official' },
  { url: 'https://feeds.feedburner.com/EuroleagueBasketball', source: 'euroleague.net', label: 'Euroleague' },
];

const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (isNaN(diff)) return '—';
  if (diff < 60) return 'μόλις τώρα';
  if (diff < 3600) return `${Math.floor(diff / 60)} λεπτά πριν`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ώρες πριν`;
  return `${Math.floor(diff / 86400)} μέρες πριν`;
}

function getCategory(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('bc') || t.includes('μπάσκετ') || t.includes('basket') || t.includes('euroleague') || t.includes('nba')) return 'basketball';
  if (t.includes('βόλεϊ') || t.includes('volley')) return 'volleyball';
  if (t.includes('εισιτήρι') || t.includes('ticket')) return 'tickets';
  return 'football';
}

function getTag(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('μεταγραφ')) return { tag: 'ΜΕΤΑΓΡΑΦΗ', color: '#f59e0b' };
  if (t.includes('τραυματ')) return { tag: 'ΤΡΑΥΜΑΤΙΣΜΟΣ', color: '#ef4444' };
  if (t.includes('εισιτήρι') || t.includes('ticket')) return { tag: 'TICKET', color: '#22c55e' };
  if (t.includes('νίκη') || t.includes('αποτέλε') || t.includes('win')) return { tag: 'ΑΠΟΤΕΛΕΣΜΑ', color: '#22c55e' };
  if (t.includes('επίσημ') || t.includes('official')) return { tag: 'ΕΠΙΣΗΜΟ', color: '#8b5cf6' };
  if (t.includes('breaking') || t.includes('σπάει')) return { tag: 'BREAKING', color: '#ef4444' };
  return { tag: 'ΕΙΔΗΣΗ', color: '#3b82f6' };
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').trim();
}

export default function App() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lastUpdate, setLastUpdate] = useState('—');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [sourceStatus, setSourceStatus] = useState({});

  const fetchNews = useCallback(async () => {
    setScanning(true);
    const allItems = [];
    const status = {};

    await Promise.allSettled(
      RSS_FEEDS.map(async (feed) => {
        try {
          const res = await fetch(`${RSS2JSON}${encodeURIComponent(feed.url)}`);
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            status[feed.source] = 'ok';
            data.items.slice(0, 10).forEach((item, i) => {
              const text = (item.title || '') + ' ' + stripHtml(item.description || '');
              const { tag, color } = getTag(text);
              allItems.push({
                id: `${feed.source}-${i}-${Date.now()}`,
                category: getCategory(text),
                tag,
                tagColor: color,
                title: item.title || 'Χωρίς τίτλο',
                summary: stripHtml(item.description || '').slice(0, 150) + '...',
                fullContent: stripHtml(item.content || item.description || ''),
                source: feed.source,
                sourceLabel: feed.label,
                time: timeAgo(item.pubDate),
                pubDate: item.pubDate,
                link: item.link || '#',
                image: item.enclosure?.link || item.thumbnail || null,
                hot: i === 0,
              });
            });
          } else {
            status[feed.source] = 'empty';
          }
        } catch {
          status[feed.source] = 'error';
        }
      })
    );

    // Sort by date newest first
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    setSourceStatus(status);
    if (allItems.length > 0) setNews(allItems);
    setLoading(false);
    setScanning(false);
    setLastUpdate(new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  useEffect(() => {
    fetchNews();
    // Auto refresh every 15 minutes
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const filtered = activeCategory === 'all' ? news : news.filter(n => n.category === activeCategory);
  const okSources = Object.values(sourceStatus).filter(s => s === 'ok').length;

  return (
    <div style={{ minHeight: '100vh', background: '#080f08', color: '#e5e7eb', fontFamily: "'Barlow', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #1a3a1a; border-radius: 4px; }
        .card:hover { background: rgba(34,197,94,0.07) !important; transform: translateX(3px); }
        .card { transition: all 0.2s; cursor: pointer; }
        .cat { transition: all 0.15s; cursor: pointer; border: none; }
        .cat:hover { opacity: 0.8; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .blink { animation: blink 1.2s infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .spin { display:inline-block; animation: spin 1s linear infinite; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade { animation: fadeIn 0.3s ease forwards; }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .shimmer { background: linear-gradient(90deg,#0d1a0d 25%,#1a3a1a 50%,#0d1a0d 75%); background-size:800px 100%; animation:shimmer 1.5s infinite; border-radius:14px; height:80px; }
        .modal-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px; }
        .modal { background:#0d1a0d;border:1px solid #1a3a1a;border-radius:20px;max-width:640px;width:100%;max-height:85vh;overflow-y:auto;padding:24px; }
        .close-btn { cursor:pointer;background:#1a3a1a;border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center; }
        .close-btn:hover { background:#15803d; }
        .src-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
        @media(max-width:600px) { .ticker span { display:none; } .ticker span:first-child { display:inline; } }
      `}</style>

      {/* Ticker */}
      <div style={{ background: '#15803d', padding: '6px 20px', fontSize: '12px', color: '#fff', fontFamily: 'Barlow Condensed', letterSpacing: '1px', display: 'flex', gap: '24px', overflowX: 'auto', whiteSpace: 'nowrap' }} className="ticker">
        <span>🍀 PAOALERT</span>
        <span>⚽ ΠΑΟ FC</span>
        <span>🏀 ΠΑΟ BC</span>
        <span>🏐 ΒΟΛΕΪ</span>
        <span>🎟️ ΕΙΣΙΤΗΡΙΑ</span>
        <span>🌍 EUROLEAGUE</span>
        <span>🏆 CHAMPIONS LEAGUE</span>
      </div>

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#0d2a0d,#080f08)', borderBottom: '2px solid #15803d', padding: '16px 20px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg,#15803d,#4ade80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🍀</div>
            <div>
              <div style={{ fontFamily: 'Barlow Condensed', fontWeight: '900', fontSize: '28px', color: '#fff', lineHeight: 1 }}>
                PAO<span style={{ color: '#4ade80' }}>ALERT</span>
              </div>
              <div style={{ fontSize: '11px', color: '#4ade80', fontFamily: 'Barlow Condensed', letterSpacing: '2px' }}>
                <span className="blink">●</span> LIVE — {okSources}/{RSS_FEEDS.length} πηγές ενεργές
              </div>
            </div>
          </div>
          <button onClick={fetchNews} disabled={scanning} style={{ background: '#15803d', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', fontFamily: 'Barlow Condensed', cursor: scanning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: scanning ? 0.7 : 1 }}>
            <span className={scanning ? 'spin' : ''}>🔍</span>
            {scanning ? 'Σκανάρει...' : 'Ανανέωση'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '16px' }}>

        {/* Source status */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {RSS_FEEDS.map(f => (
            <div key={f.source} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'Barlow Condensed', color: sourceStatus[f.source] === 'ok' ? '#4ade80' : sourceStatus[f.source] === 'error' ? '#ef4444' : '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '6px', border: '1px solid #1a3a1a' }}>
              <div className="src-dot" style={{ background: sourceStatus[f.source] === 'ok' ? '#4ade80' : sourceStatus[f.source] === 'error' ? '#ef4444' : '#4b5563' }} />
              {f.label}
            </div>
          ))}
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} className="cat" onClick={() => setActiveCategory(cat.id)} style={{ background: activeCategory === cat.id ? '#15803d' : 'rgba(255,255,255,0.05)', color: activeCategory === cat.id ? '#fff' : '#9ca3af', padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', fontFamily: 'Barlow', border: `1px solid ${activeCategory === cat.id ? '#15803d' : '#1a3a1a'}` }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Status */}
        <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '14px', fontFamily: 'Barlow Condensed' }}>
          Τελευταία ενημέρωση: {lastUpdate} · {filtered.length} άρθρα · Αυτόματη ανανέωση κάθε 15 λεπτά
        </div>

        {/* Skeletons */}
        {loading && [...Array(5)].map((_, i) => <div key={i} className="shimmer" style={{ marginBottom: '8px' }} />)}

        {/* News */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4b5563', fontFamily: 'Barlow Condensed', fontSize: '16px' }}>
                Δεν βρέθηκαν νέα για αυτή την κατηγορία.
              </div>
            )}
            {filtered.map((item, i) => (
              <div key={item.id} className="card fade" onClick={() => setSelectedArticle(item)} style={{ background: item.hot ? 'rgba(34,197,94,0.05)' : '#0d1a0d', border: `1px solid ${item.hot ? '#1a5c1a' : '#131f13'}`, borderRadius: '14px', padding: '13px 15px', animationDelay: `${i * 0.03}s`, opacity: 0 }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '20px', marginTop: '1px' }}>{CATEGORIES.find(c => c.id === item.category)?.emoji || '🍀'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: item.tagColor, background: `${item.tagColor}15`, border: `1px solid ${item.tagColor}30`, padding: '2px 7px', borderRadius: '5px', fontFamily: 'Barlow Condensed', letterSpacing: '1px' }}>{item.tag}</span>
                      {item.hot && <span style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'Barlow Condensed', fontWeight: '700' }}>🔥 HOT</span>}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f3f4f6', marginBottom: '3px', lineHeight: '1.35', fontFamily: 'Barlow Condensed' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5', marginBottom: '6px' }}>{item.summary}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#4b5563', fontFamily: 'Barlow Condensed' }}>
                      <span>📎 {item.sourceLabel}</span>
                      <span>🕐 {item.time}</span>
                      <span style={{ color: '#4ade80' }}>▶ Διάβασε</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AdSense */}
        <div style={{ marginTop: '24px', background: '#0d1a0d', border: '1px dashed #1a3a1a', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#374151', fontSize: '12px', fontFamily: 'Barlow Condensed', letterSpacing: '1px' }}>
          [ GOOGLE ADSENSE ]
        </div>

        <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#1f2937', fontFamily: 'Barlow Condensed', letterSpacing: '1px' }}>
          PAOALERT.GR · ΟΛΑ ΤΑ ΝΕΑ ΤΟΥ ΠΑΝΑΘΗΝΑΪΚΟΥ LIVE
        </div>
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal fade" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: selectedArticle.tagColor, background: `${selectedArticle.tagColor}15`, border: `1px solid ${selectedArticle.tagColor}30`, padding: '2px 8px', borderRadius: '5px', fontFamily: 'Barlow Condensed', letterSpacing: '1px' }}>{selectedArticle.tag}</span>
                <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'Barlow Condensed' }}>📎 {selectedArticle.sourceLabel}</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedArticle(null)}>✕</button>
            </div>

            <h2 style={{ fontFamily: 'Barlow Condensed', fontWeight: '800', fontSize: '22px', color: '#fff', lineHeight: '1.3', marginBottom: '10px' }}>{selectedArticle.title}</h2>
            <div style={{ fontSize: '12px', color: '#4b5563', fontFamily: 'Barlow Condensed', marginBottom: '16px' }}>🕐 {selectedArticle.time}</div>

            {selectedArticle.image && (
              <img src={selectedArticle.image} alt="" style={{ width: '100%', borderRadius: '12px', marginBottom: '16px', maxHeight: '250px', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
            )}

            <div style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.7', marginBottom: '20px' }}>
              {selectedArticle.fullContent || selectedArticle.summary}
            </div>

            <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: '#15803d', color: '#fff', textAlign: 'center', padding: '12px', borderRadius: '12px', textDecoration: 'none', fontFamily: 'Barlow Condensed', fontWeight: '700', fontSize: '15px', letterSpacing: '0.5px' }}>
              Διάβασε ολόκληρο το άρθρο → {selectedArticle.source}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
