import { useState, useEffect } from "react";

const CATEGORIES = [
  { id: "all", label: "Όλα", emoji: "🍀" },
  { id: "football", label: "Ποδόσφαιρο", emoji: "⚽" },
  { id: "basketball", label: "Μπάσκετ", emoji: "🏀" },
  { id: "volleyball", label: "Βόλεϊ", emoji: "🏐" },
  { id: "tickets", label: "Εισιτήρια", emoji: "🎟️" },
];

// RSS feeds via rss2json (free CORS proxy for RSS)
const RSS_SOURCES = [
  {
    url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.sport-fm.gr/rss/panathinaikos",
    source: "sport-fm.gr",
    category: "football",
  },
  {
    url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.sdna.gr/feed/panathinaikos",
    source: "sdna.gr",
    category: "football",
  },
  {
    url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.gazzetta.gr/rss/panathinaikos",
    source: "gazzetta.gr",
    category: "football",
  },
];

// Fallback news when RSS fails
const FALLBACK_NEWS = [
  {
    id: "f1", category: "football", tag: "ΕΙΔΗΣΗ", tagColor: "#3b82f6",
    title: "Παναθηναϊκός — Τελευταία νέα από sport-fm.gr",
    summary: "Δεν ήταν δυνατή η φόρτωση αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.",
    source: "sport-fm.gr", time: "—", link: "https://www.sport-fm.gr",
  },
  {
    id: "f2", category: "basketball", tag: "ΕΙΔΗΣΗ", tagColor: "#8b5cf6",
    title: "ΠΑΟ BC — Τελευταία νέα από paobc.gr",
    summary: "Δεν ήταν δυνατή η φόρτωση αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.",
    source: "paobc.gr", time: "—", link: "https://www.paobc.gr",
  },
];

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "μόλις τώρα";
  if (diff < 3600) return `${Math.floor(diff / 60)} λεπτά πριν`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ώρες πριν`;
  return `${Math.floor(diff / 86400)} μέρες πριν`;
}

function getCategoryFromText(text) {
  const t = text.toLowerCase();
  if (t.includes("bc") || t.includes("μπάσκετ") || t.includes("basket") || t.includes("euroleague")) return "basketball";
  if (t.includes("βόλεϊ") || t.includes("volley")) return "volleyball";
  if (t.includes("εισιτήρι") || t.includes("ticket")) return "tickets";
  return "football";
}

function getTag(text) {
  const t = text.toLowerCase();
  if (t.includes("μεταγραφ")) return { tag: "ΜΕΤΑΓΡΑΦΗ", color: "#f59e0b" };
  if (t.includes("τραυματ")) return { tag: "ΤΡΑΥΜΑΤΙΣΜΟΣ", color: "#ef4444" };
  if (t.includes("εισιτήρι") || t.includes("ticket")) return { tag: "TICKET DROP", color: "#22c55e" };
  if (t.includes("νίκη") || t.includes("αποτέλε")) return { tag: "ΑΠΟΤΕΛΕΣΜΑ", color: "#22c55e" };
  if (t.includes("επίσημ")) return { tag: "ΕΠΙΣΗΜΟ", color: "#8b5cf6" };
  return { tag: "ΕΙΔΗΣΗ", color: "#3b82f6" };
}

export default function PaoAlert() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [lastScan, setLastScan] = useState("—");
  const [error, setError] = useState(false);

  async function fetchNews() {
    setScanning(true);
    setError(false);

    try {
      // Use a CORS-friendly RSS proxy
      const responses = await Promise.allSettled(
        RSS_SOURCES.map(src =>
          fetch(src.url).then(r => r.json()).then(data => ({ data, source: src.source, category: src.category }))
        )
      );

      const allItems = [];

      responses.forEach(result => {
        if (result.status === "fulfilled") {
          const { data, source } = result.value;
          if (data.items && data.items.length > 0) {
            data.items.slice(0, 8).forEach((item, i) => {
              const text = (item.title || "") + " " + (item.description || "");
              const { tag, color } = getTag(text);
              allItems.push({
                id: `${source}-${i}`,
                category: getCategoryFromText(text),
                tag,
                tagColor: color,
                title: item.title || "Χωρίς τίτλο",
                summary: item.description
                  ? item.description.replace(/<[^>]+>/g, "").slice(0, 120) + "..."
                  : "Διάβασε περισσότερα στην πηγή.",
                source,
                time: item.pubDate ? timeAgo(item.pubDate) : "—",
                link: item.link || "#",
                hot: i === 0,
              });
            });
          }
        }
      });

      if (allItems.length > 0) {
        // Sort by newest
        setNews(allItems);
      } else {
        setNews(FALLBACK_NEWS);
        setError(true);
      }
    } catch {
      setNews(FALLBACK_NEWS);
      setError(true);
    } finally {
      setLoading(false);
      setScanning(false);
      setLastScan(new Date().toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" }));
    }
  }

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  const filtered = activeCategory === "all" ? news : news.filter(n => n.category === activeCategory);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080f08",
      fontFamily: "'Barlow', sans-serif",
      color: "#e5e7eb",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1a3a1a; border-radius: 4px; }
        .news-card { transition: all 0.2s; cursor: pointer; }
        .news-card:hover { background: rgba(34,197,94,0.07) !important; transform: translateX(3px); }
        .cat-btn { transition: all 0.2s; cursor: pointer; border: none; }
        .cat-btn:hover { opacity: 0.85; }
        .scan-btn { transition: all 0.2s; cursor: pointer; border: none; }
        .scan-btn:hover:not(:disabled) { background: #16a34a !important; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .blink { animation: blink 1.2s infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .spin { animation: spin 1s linear infinite; display:inline-block; }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .slide-in { animation: slideIn 0.35s ease forwards; }
        @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
        .shimmer {
          background: linear-gradient(90deg, #0d1a0d 25%, #1a3a1a 50%, #0d1a0d 75%);
          background-size: 400px 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {/* Ticker bar */}
      <div style={{
        background: "#15803d", padding: "6px 20px",
        fontSize: "12px", color: "#fff",
        fontFamily: "Barlow Condensed", letterSpacing: "1px",
        display: "flex", gap: "30px", overflowX: "auto",
      }}>
        <span>🍀 PAOALERT.GR</span>
        <span>⚽ ΠΑΟ FC</span>
        <span>🏀 ΠΑΟ BC</span>
        <span>🏐 ΠΑΟ ΒΟΛΕΪ</span>
        <span>👟 ΓΥΝΑΙΚΕΙΟ</span>
        <span>🎟️ ΕΙΣΙΤΗΡΙΑ</span>
      </div>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #0d2a0d 0%, #080f08 100%)",
        borderBottom: "2px solid #15803d",
        padding: "18px 20px",
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "50px", height: "50px", borderRadius: "14px",
              background: "linear-gradient(135deg, #15803d, #4ade80)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px",
            }}>🍀</div>
            <div>
              <div style={{ fontFamily: "Barlow Condensed", fontWeight: "900", fontSize: "30px", color: "#fff", lineHeight: 1 }}>
                PAO<span style={{ color: "#4ade80" }}>ALERT</span>
              </div>
              <div style={{ fontSize: "11px", color: "#4ade80", fontFamily: "Barlow Condensed", letterSpacing: "2px" }}>
                <span className="blink">●</span> LIVE NEWS
              </div>
            </div>
          </div>

          <button
            className="scan-btn"
            onClick={fetchNews}
            disabled={scanning}
            style={{
              background: "#15803d", color: "#fff",
              padding: "10px 18px", borderRadius: "12px",
              fontSize: "13px", fontWeight: "700",
              fontFamily: "Barlow Condensed",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <span className={scanning ? "spin" : ""}>🔍</span>
            {scanning ? "Σκανάρει..." : "Ανανέωση"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>

        {/* Categories */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} className="cat-btn" onClick={() => setActiveCategory(cat.id)} style={{
              background: activeCategory === cat.id ? "#15803d" : "rgba(255,255,255,0.05)",
              color: activeCategory === cat.id ? "#fff" : "#9ca3af",
              padding: "8px 16px", borderRadius: "10px",
              fontSize: "13px", fontWeight: "600",
              fontFamily: "Barlow",
              border: activeCategory === cat.id ? "1px solid #15803d" : "1px solid #1a3a1a",
            }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Status bar */}
        <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "16px", fontFamily: "Barlow Condensed", letterSpacing: "0.5px" }}>
          {error
            ? "⚠️ Πρόβλημα φόρτωσης — δοκίμασε ανανέωση"
            : `Τελευταία ενημέρωση: ${lastScan} · ${filtered.length} άρθρα`
          }
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="shimmer" style={{ borderRadius: "14px", height: "90px" }} />
            ))}
          </div>
        )}

        {/* News */}
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#4b5563", fontFamily: "Barlow Condensed", fontSize: "16px" }}>
                Δεν βρέθηκαν νέα για αυτή την κατηγορία.
              </div>
            )}
            {filtered.map((item, i) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-card slide-in"
                style={{
                  display: "block", textDecoration: "none",
                  background: item.hot ? "rgba(34,197,94,0.05)" : "#0d1a0d",
                  border: `1px solid ${item.hot ? "#1a5c1a" : "#131f13"}`,
                  borderRadius: "14px", padding: "14px 16px",
                  animationDelay: `${i * 0.04}s`, opacity: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ fontSize: "20px", marginTop: "2px" }}>
                    {CATEGORIES.find(c => c.id === item.category)?.emoji || "🍀"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "10px", fontWeight: "700",
                        color: item.tagColor,
                        background: `${item.tagColor}15`,
                        border: `1px solid ${item.tagColor}30`,
                        padding: "2px 7px", borderRadius: "5px",
                        fontFamily: "Barlow Condensed", letterSpacing: "1px",
                      }}>{item.tag}</span>
                      {item.hot && <span style={{ fontSize: "11px", color: "#f59e0b", fontFamily: "Barlow Condensed", fontWeight: "700" }}>🔥 HOT</span>}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#f3f4f6", marginBottom: "4px", lineHeight: "1.35", fontFamily: "Barlow Condensed" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.5", marginBottom: "7px" }}>
                      {item.summary}
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#4b5563", fontFamily: "Barlow Condensed" }}>
                      <span>📎 {item.source}</span>
                      <span>🕐 {item.time}</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* AdSense placeholder */}
        <div style={{
          marginTop: "24px", background: "#0d1a0d",
          border: "1px dashed #1a3a1a", borderRadius: "12px",
          padding: "20px", textAlign: "center",
          color: "#374151", fontSize: "12px",
          fontFamily: "Barlow Condensed", letterSpacing: "1px",
        }}>
          [ GOOGLE ADSENSE — ΔΙΑΦΗΜΙΣΗ ]
        </div>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "11px", color: "#1f2937", fontFamily: "Barlow Condensed", letterSpacing: "1px" }}>
          PAOALERT.GR · ΟΛΑ ΤΑ ΝΕΑ ΤΟΥ ΠΑΝΑΘΗΝΑΪΚΟΥ
        </div>
      </div>
    </div>
  );
}
