import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

const REREAD_KEY = "allowRereads";
const READ_DATE_MODE_KEY = "readDateMode";

async function importDiaryFromCSV(file, user) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;

  const cols = header
    .match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
    .map(c => c.replace(/^"|"$/g, ""));

  const ref = collection(db, "users", user.uid, "diary");

  for (const row of rows) {
    const values = row
      .match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
      .map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"'));

    const entry = Object.fromEntries(cols.map((c, i) => [c, values[i]]));

    await addDoc(ref, {
      workKey: entry.workKey,
      title: entry.title,
      author: entry.author || "Unknown",
      coverId: entry.coverId ? Number(entry.coverId) : null,
      firstPublishYear: entry.firstPublishYear
        ? Number(entry.firstPublishYear)
        : null,
      notes: entry.notes || "",
      status: "read",
      createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
    });
  }
}

async function exportDiaryToCSV(user) {
  const ref = collection(db, "users", user.uid, "diary");
  const snap = await getDocs(ref);

  const rows = [
    [
      "workKey",
      "title",
      "author",
      "coverId",
      "firstPublishYear",
      "notes",
      "status",
      "createdAt"
    ]
  ];

  snap.forEach(doc => {
    const d = doc.data();
    rows.push([
      d.workKey,
      d.title,
      d.author,
      d.coverId ?? "",
      d.firstPublishYear ?? "",
      (d.notes || "").replace(/\n/g, " "),
      d.status ?? "read",
      d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : ""
    ]);
  });

  const csv = rows
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `booklog-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

export default function Settings() {
  const [allowRereads, setAllowRereads] = useState(
    () => localStorage.getItem(REREAD_KEY) === "true"
  );

  const [readDateMode, setReadDateMode] = useState(
    () => localStorage.getItem(READ_DATE_MODE_KEY) || "first"
  );

  const user = auth.currentUser;

  useEffect(() => {
    localStorage.setItem(REREAD_KEY, allowRereads ? "true" : "false");
  }, [allowRereads]);

  useEffect(() => {
    localStorage.setItem(READ_DATE_MODE_KEY, readDateMode);
  }, [readDateMode]);

  const handleLogout = async () => {
    await auth.signOut();
    location.reload();
  };

  return (
    <div className="settings container">
      <h2 className="settings-title">User Settings</h2>

      <div className="settings-card user-info-card">
        <div className="user-info-left">
          <table className="user-info-table">
            <tbody>
              <tr>
                <td className="label">Logged in as</td>
                <td className="value">{user?.email ?? "—"}</td>
              </tr>
              <tr>
                <td className="label">Login method</td>
                <td className="value">{user?.providerData[0]?.providerId ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="user-info-right">
          <button className="btn logout-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-left">Allow re-reading books</div>
          <div className="settings-row-right">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={allowRereads}
                onChange={() => setAllowRereads(v => !v)}
              />
              <span className="slider" />
            </label>
          </div>
          <div className="settings-row-bottom">
            If enabled, you can mark books as read multiple times in your diary.
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-left">Most recent read date</div>
          <div className="settings-row-right">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={readDateMode === "latest"}
                onChange={() => setReadDateMode(m => (m === "first" ? "latest" : "first"))}
              />
              <span className="slider" />
            </label>
          </div>
          <div className="settings-row-bottom">
            If enabled, books will be marked as read on the most recent date they were read when searching. Otherwise, the first read date will be used.
          </div>
          </div>
      </div>

      <div className="settings-card diary-data">
        <div className="diary-header">
          <h3 className="section-title">Import / Export</h3>

          <div className="diary-actions">
            <button className="btn btn-secondary" onClick={() => exportDiaryToCSV(user)}>
              Export CSV
            </button>

            <label className="file-upload">
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    importDiaryFromCSV(e.target.files[0], user);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>
        </div>

        <p className="muted">
          <span className="announcement">Goodreads import will be supported in a future update.</span>
        </p>
      </div>
    </div>
  );
}
