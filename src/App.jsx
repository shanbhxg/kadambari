import { useState, useEffect } from "react";
import AuthGate from "./components/AuthGate";
import { searchBooks, coverUrl } from "./api/openlib";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import DiaryEntryForm from "./components/DiaryEntryForm";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [readMap, setReadMap] = useState({});
  const [page, setPage] = useState("home");

  useEffect(() => {
    if (!auth?.currentUser) return;

    let cancelled = false;

    async function loadDiary() {
      const ref = collection(db, "users", auth.currentUser.uid, "diary");
      const snap = await getDocs(ref);
      const temp = {};

      snap.forEach(doc => {
        const d = doc.data();
        if (!d?.workKey || d.status !== "read" || !d.createdAt) return;

        const ts = d.createdAt?.toDate?.() ?? new Date(d.createdAt);
        if (isNaN(ts)) return;

        if (!temp[d.workKey]) temp[d.workKey] = [];
        temp[d.workKey].push(ts);
      });

      const mode = localStorage.getItem("watchDateMode") || "first";
      const map = {};

      Object.entries(temp).forEach(([key, dates]) => {
        const times = dates.map(d => +d);
        map[key] = new Date(
          mode === "latest" ? Math.max(...times) : Math.min(...times)
        );
      });

      if (!cancelled) setReadMap(map);
    }

    loadDiary();
    return () => { cancelled = true; };
  }, []);

  async function search() {
    if (!query.trim()) return;
    const r = await searchBooks(query);
    setResults(r.docs || []);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
  }

  const isSearching = results.length > 0;

  return (
    <AuthGate>
      <div className="container">
        <div className="app-header">
          <img
            src="/header.png"
            alt="Book Log"
            className="app-header-image"
          />

          <div className="app-nav">
            <button
              className={page === "home" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("home")}
            >
              <i className="fa-solid fa-book"></i>
            </button>
            <button
              className={page === "stats" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("stats")}
            >
              <i class="fa-solid fa-chart-simple"></i>
            </button>
            <button
              className={page === "settings" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("settings")}
            >
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>

        {page === "settings" ? (
          <Settings />
        ) : page === "stats" ? (
          <Stats />
        ) : (
          <>
            <div className="search-bar">
              <input
                className="input"
                placeholder="Search books..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
              />
              <button className="nav-btn" onClick={search}>🔍</button>
              {isSearching && (
                <button className="nav-btn" onClick={clearSearch}>❌</button>
              )}
            </div>

            {results
              .filter(b => b.cover_i)
              .map(b => (
                <div key={b.key} className="book-card">
                  <img
                    src={coverUrl(b.cover_i)}
                    alt={b.title}
                    className="book-poster"
                  />

                  <div className="book-content">
                    <div className="book-title-row">
                      <span className="book-title">{b.title}</span>
                      {readMap[b.key] && (
                        <span className="watched-badge">
                          📖{" "}
                          {readMap[b.key].toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit"
                          })}
                        </span>
                      )}
                    </div>

                    <div className="book-meta">
                      {b.author_name?.[0]} · {b.first_publish_year ?? "—"}
                    </div>

                    <DiaryEntryForm
                      user={auth.currentUser}
                      book={{
                        workKey: b.key,
                        title: b.title,
                        author: b.author_name?.[0] ?? "Unknown",
                        coverId: b.cover_i,
                        firstPublishYear: b.first_publish_year ?? null
                      }}
                    />
                  </div>
                </div>
              ))}

            {!isSearching && <Home />}
          </>
        )}
      </div>
    </AuthGate>
  );
}
