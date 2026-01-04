// src/api/openlibrary.js
const BASE = "https://openlibrary.org";

export async function searchBooks(query) {
  const res = await fetch(
    `${BASE}/search.json?q=${encodeURIComponent(query)}`
  );
  return res.json();
}

export function coverUrl(coverId, size = "M") {
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
    : "https://via.placeholder.com/150x220?text=No+Cover";
}
