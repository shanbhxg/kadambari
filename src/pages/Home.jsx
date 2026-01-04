import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc
} from "firebase/firestore";
import { coverUrl } from "../api/openlib";

export default function Home() {
  const [entries, setEntries] = useState([]);

  async function deleteEntry(entryId) {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    const uid = auth.currentUser.uid;
    await deleteDoc(doc(db, "users", uid, "diary", entryId));
  }

  useEffect(() => {
    if (!auth.currentUser) return;

    const ref = collection(db, "users", auth.currentUser.uid, "diary");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, snap => {
      setEntries(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    });

    return () => unsub();
  }, []);

  if (!entries.length) {
    return (
      <div className="empty-state">
        <p>Your diary is empty. Find a book and log your first entry!</p>
      </div>
    );
  }

  return (
    <div className="home">
      <h2>Your Diary</h2>

      {entries.map(e => (
        <div key={e.id} className="entry-card">
          <div className="entry-top">
            <img
              src={coverUrl(e.coverId)}
              alt={e.title}
              className="entry-poster"
            />

            <div className="entry-main">
              <div className="entry-title">{e.title}</div>

              <div className="entry-meta">
                <p>{e.author}</p>
                <p>{e.firstPublishYear ?? "—"}</p>
              </div>
            </div>

            <button
              className="entry-delete"
              onClick={() => deleteEntry(e.id)}
            >
              Delete
            </button>
          </div>

          <div className="entry-notes">
            <p>
              <strong>Read on:</strong>{" "}
              {e.createdAt?.toDate().toLocaleDateString() || "N/A"}
            </p>

            {e.notes && (
              <>
                <strong>Your Notes:</strong>
                <p className="entry-note-text">{e.notes}</p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
