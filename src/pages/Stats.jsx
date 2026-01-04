import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const uid = auth.currentUser.uid;
      const snap = await getDocs(collection(db, "users", uid, "diary"));

      const entries = snap.docs
        .map(d => d.data())
        .filter(e => e.createdAt?.toDate)
        .map(e => ({ ...e, date: e.createdAt.toDate() }))
        .sort((a,b) => a.date - b.date);

      const byYear = {};
      const allAuthors = {};

      entries.forEach(e => {
        const y = e.date.getFullYear();
        const m = e.date.getMonth();

        byYear[y] ??= {
          entries: [],
          byMonth: {},
          yearCounts: Array(12).fill(0),
          authors: {}
        };

        const bucket = byYear[y];
        bucket.entries.push(e);
        bucket.yearCounts[m]++;

        const key = `${y}-${String(m + 1).padStart(2,"0")}`;
        bucket.byMonth[key] ??= [];
        bucket.byMonth[key].push(e);

        if (e.author) {
          bucket.authors[e.author] = (bucket.authors[e.author] || 0) + 1;
          allAuthors[e.author] = (allAuthors[e.author] || 0) + 1;
        }
      });

      setStats({
        entries,
        years: Object.keys(byYear).sort((a,b)=>b-a),
        byYear,
        allAuthors
      });
    }

    load();
  }, []);

  if (!stats) return <div className="stats-page">Loading…</div>;

  const isAll = yearFilter === "all";
  const visibleEntries = isAll
    ? stats.entries
    : stats.byYear[yearFilter].entries;

  const avgPerMonth = (() => {
    const months = new Set(
      visibleEntries.map(e =>
        `${e.date.getFullYear()}-${e.date.getMonth()}`
      )
    );
    return months.size
      ? (visibleEntries.length / months.size).toFixed(2)
      : "0";
  })();

  const barData = isAll
    ? stats.years.map(y => ({
        label: y,
        value: stats.byYear[y].entries.length
      }))
    : stats.byYear[yearFilter].yearCounts.map((v,i)=>({
        label: MONTHS[i],
        value: v
      }));

  const max = Math.max(...barData.map(b=>b.value),1);

  const topAuthors = Object.entries(
    isAll ? stats.allAuthors : stats.byYear[yearFilter].authors
  )
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);

  const firstLatest = isAll
    ? []
    : Object.entries(stats.byYear[yearFilter].byMonth).map(([m,list])=>({
        month: m,
        first: list[0],
        latest: list[list.length-1]
      }));

  return (
    <div className="stats-page">
      <h2>Stats</h2>

      <div className="year-switcher">
        <button
          className={yearFilter === "all" ? "active" : ""}
          onClick={() => setYearFilter("all")}
        >
          All
        </button>

        {stats.years.map(y => (
          <button
            key={y}
            className={yearFilter === y ? "active" : ""}
            onClick={() => setYearFilter(y)}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="stats-cards">
        <Card n={visibleEntries.length} l="Total books" />
        <Card n={avgPerMonth} l="Avg / month" />
      </div>

      <section className="stats-section">
        <h3>{isAll ? "Books per year" : `${yearFilter} by month`}</h3>
        <div className="bar-chart">
          {barData.map((b,i)=>(
            <div key={i} className="bar-col">
              <div
                className="bar"
                style={{ height: `${Math.max(8,(b.value/max)*120)}px` }}
                title={`${b.value} books`}
              />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {!isAll && (
        <section className="stats-section">
          <h3>First vs Last per month</h3>

          <div className="month-two-col">
            {Array.from({ length: 6 }).map((_, i) => {
              const left = firstLatest[i];
              const right = firstLatest[i + 6];

              return (
                <div key={i} className="month-row">
                  {[left, right].map(r =>
                    r ? (
                      <div key={r.month} className="month-shelf">
                        <div className="month-label">
                          {MONTHS[Number(r.month.split("-")[1]) - 1]}
                        </div>

                        <div className="poster-grid">
                          <div className="poster-item">
                            <img
                              src={
                                r.first.coverId
                                  ? `https://covers.openlibrary.org/b/id/${r.first.coverId}-M.jpg`
                                  : ""
                              }
                            />
                            <span>First</span>
                          </div>

                          <div className="poster-item">
                            <img
                              src={
                                r.latest.coverId
                                  ? `https://covers.openlibrary.org/b/id/${r.latest.coverId}-M.jpg`
                                  : ""
                              }
                            />
                            <span>Last</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="month-shelf empty" />
                    )
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="stats-section">
        <h3>Top authors</h3>
        {topAuthors.map(([a,c])=>(
          <Row key={a} l={a} r={c} />
        ))}
      </section>
    </div>
  );
}

const Card = ({ n, l }) => (
  <div className="stats-card">
    <div className="stats-num">{n}</div>
    <div className="stats-label">{l}</div>
  </div>
);

const Row = ({ l, r }) => (
  <div className="stats-row">
    <span>{l}</span>
    <span>{r}</span>
  </div>
);
