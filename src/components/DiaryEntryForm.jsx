import { useState } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, serverTimestamp, allowRereads } from "../firebase";

export default function DiaryEntryForm({ user, book }) {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("read");
  async function save() {
    const ref = collection(db, "users", user.uid, "diary");
    if (status === "read") {
      const q = query(ref, where("workKey", "==", book.workKey));     
      const snap = await getDocs(q);

    
      if (!allowRereads() && !snap.empty) {
        const existing = snap.docs[0].data();
        const ts = existing.createdAt;
        const readDate =
          ts?.toDate?.().toLocaleDateString(undefined, {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }) ?? "an unknown date";
        alert(
          `This book is already in your diary. You first read it on ${readDate}. Your settings are set to not allow rereads.`
        );
        setNotes("");
        return;
      }
    }
    await addDoc(ref, {
      workKey: book.workKey,
      title: book.title,
      author: book.author,
      coverId: book.coverId ?? null,
      firstPublishYear: book.firstPublishYear ?? null,
      notes,
      status,
      createdAt: status === "read" ? serverTimestamp() : null,
    });

    setNotes("");
    alert("Saved!");
  }

  return (
    <div className="diary-form">
      <select
        className="input mt-8"
        value={status}
        onChange={e => setStatus(e.target.value)}
      >
        <option value="read">Read</option>
        <option value="reading">Reading</option>
        <option value="tbr">Want to Read</option>
        <option value="interested">Interested</option>
        <option value="paused">Paused</option>
      </select>
      <textarea
        className="diary-textarea"
        placeholder="Notes..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <button className="btn diary-add-btn" onClick={save}>
        Add
      </button>
    </div>
  );
}
