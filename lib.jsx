// lib.jsx — shared helpers, hooks, primitives
const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;

const TAGS = ['Classics','Psychology','Design','Comic Book','Poetry','Kids','Fiction','Non-fiction','History','Science','Biography','Philosophy','Art','Other'];
const LANGUAGES = ['Polish','English','French','German','Hebrew','Russian'];
const LANG_SHORT = { Polish:'PL', English:'EN', French:'FR', German:'DE', Hebrew:'HE', Russian:'RU' };

const STORAGE_KEY = 'rbyd:v1';
const SETTINGS_KEY = 'rbyd:settings';

function loadBooks() {
  const seed = window.SEED_BOOKS || [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // Migration: backfill coverUrl from seed for books that don't have one yet.
      // (Run once: skip if we've already done it.)
      const migrated = localStorage.getItem(STORAGE_KEY + ':covers-migrated');
      const migrated2 = localStorage.getItem(STORAGE_KEY + ':covers-migrated-v2');
      const migrated3 = localStorage.getItem(STORAGE_KEY + ':rejected-clean-v1');
      const migrated4 = localStorage.getItem(STORAGE_KEY + ':rejected-clean-v2');
      if (!migrated || !migrated2 || !migrated3 || !migrated4) {
        const seedById = new Map(seed.map(b => [b.id, b]));
        for (const b of stored) {
          if (!b.coverUrl) {
            const s = seedById.get(b.id);
            if (s && s.coverUrl) b.coverUrl = s.coverUrl;
          }
          // Clear rotten metadata from rejected siblings
          if (b.rejected) {
            if (b.rating !== null) b.rating = null;
            if (b.dateRead) b.dateRead = '';
            if (b.notes) b.notes = '';
          }
        }
        try { localStorage.setItem(STORAGE_KEY + ':covers-migrated', '1'); } catch(e) {}
        try { localStorage.setItem(STORAGE_KEY + ':covers-migrated-v2', '1'); } catch(e) {}
        try { localStorage.setItem(STORAGE_KEY + ':rejected-clean-v1', '1'); } catch(e) {}
        try { localStorage.setItem(STORAGE_KEY + ':rejected-clean-v2', '1'); } catch(e) {}
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch(e) {}
      }
      return stored;
    }
  } catch (e) {}
  return seed;
}
function saveBooks(books) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); } catch(e){} }
const DEFAULT_SETTINGS = {
  youtubeKey: 'AIzaSyBDRfpUj8U_jJEekZrcE--tq0uXa9h-bCQ',
};
function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch(e){ return { ...DEFAULT_SETTINGS }; }
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch(e){} }

// ------- App store (context) -------
const Store = createContext(null);
function useStore() { return useContext(Store); }

function StoreProvider({ children }) {
  const [books, setBooks] = useState(() => loadBooks());
  const [settings, setSettings] = useState(() => loadSettings());
  useEffect(() => { saveBooks(books); }, [books]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  const updateBook = useCallback((id, patch) => {
    setBooks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);
  const addBook = useCallback((book) => {
    const id = 'b' + Date.now() + Math.floor(Math.random()*999);
    setBooks(bs => [{ id, tags: [], list: 'to-read', toReadNext: false, nobelPrize: false, rating: null, notes: '', dateRead: '', language: '', audiobook: false, borrowed: false, borrowedFrom:'', coverUrl: '', authorFirst: '', authorLast: '', ...book }, ...bs]);
    return id;
  }, []);
  const removeBook = useCallback((id) => setBooks(bs => bs.filter(b => b.id !== id)), []);

  const NEXT_CAP = 6;
  // Add a book to the Next Up queue at the END. No-op if already in queue or queue full.
  const setNext = useCallback((id) => {
    setBooks(bs => {
      const inQ = bs.filter(b => b.toReadNext).length;
      const already = bs.find(b => b.id === id && b.toReadNext);
      if (already || inQ >= NEXT_CAP) return bs;
      const maxOrder = bs.reduce((m,b) => b.toReadNext && (b.nextOrder||0) > m ? b.nextOrder : m, 0);
      return bs.map(b => b.id === id ? { ...b, toReadNext: true, nextOrder: maxOrder + 1 } : b);
    });
  }, []);
  const removeFromNext = useCallback((id) => {
    setBooks(bs => bs.map(b => b.id === id ? { ...b, toReadNext: false, nextOrder: 0 } : b));
  }, []);
  // Reorder the queue: takes an array of ids in the desired order.
  const reorderNext = useCallback((orderedIds) => {
    setBooks(bs => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
      return bs.map(b => orderMap.has(b.id) ? { ...b, nextOrder: orderMap.get(b.id), toReadNext: true } : b);
    });
  }, []);

  // Mark a book as read: move to read list, set dateRead, optionally rating/notes,
  // and remove from Next Up queue since it's finished.
  const markAsRead = useCallback((id, { rating = null, notes = '' } = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    setBooks(bs => bs.map(b => b.id === id
      ? { ...b, list: 'read', dateRead: b.dateRead || today,
          rating: rating != null ? rating : b.rating,
          notes: notes ? notes : b.notes,
          toReadNext: false, nextOrder: 0 }
      : b));
  }, []);
  // Send a Read book back to To Read. Keep dateRead in the data (history) but it
  // won't display while on To Read.
  const unmarkAsRead = useCallback((id) => {
    setBooks(bs => bs.map(b => b.id === id ? { ...b, list: 'to-read' } : b));
  }, []);
  const bulkAdd = useCallback((arr) => {
    const now = Date.now();
    setBooks(bs => [
      ...arr.map((b, i) => ({
        id: 'b' + (now + i),
        tags: [], list: 'to-read', toReadNext: false, nobelPrize: false,
        rating: null, notes: '', dateRead: '', language: '',
        audiobook: false, borrowed: false, borrowedFrom: '', coverUrl: '',
        authorFirst: '', authorLast: '', ...b,
      })),
      ...bs,
    ]);
  }, []);
  const resetSeed = useCallback(() => {
    setBooks(window.SEED_BOOKS || []);
  }, []);

  const value = { books, setBooks, updateBook, addBook, removeBook, setNext, removeFromNext, reorderNext, markAsRead, unmarkAsRead, bulkAdd, resetSeed,
                  settings, setSettings, NEXT_CAP };
  return <Store.Provider value={value}>{children}</Store.Provider>;
}

// ------- Primitives -------

function Cover({ book, className='', style={} }) {
  const [err, setErr] = useState(false);
  const url = book.coverUrl;
  if (url && !err) {
    return (
      <div className={"cover " + className} style={style}>
        <img src={url} alt={book.title} onError={()=>setErr(true)} loading="lazy" />
      </div>
    );
  }
  // Placeholder — black with serif title
  const titleShort = (book.title || '').length > 80 ? book.title.slice(0, 78) + '…' : book.title;
  return (
    <div className={"cover placeholder " + className} style={style}>
      <div className="ph-title">{titleShort || 'Untitled'}</div>
      <div className="ph-rule" />
      <div className="ph-author">{(book.authorFirst ? book.authorFirst + ' ' : '') + (book.authorLast || '')}</div>
    </div>
  );
}

function Stars({ value, onChange, size=14 }) {
  const interactive = !!onChange;
  const isFive = value === 5;
  return (
    <div className={"stars " + (interactive ? 'interactive ':'') + (isFive ? 'five':'')} style={{fontSize: size+'px'}}>
      {[1,2,3,4,5].map(n => (
        <span key={n}
          className={"s " + (value >= n ? 'f':'e')}
          onClick={interactive ? (e) => { e.stopPropagation(); onChange(value === n ? 0 : n); } : undefined}
          title={interactive ? n + ' star' + (n>1?'s':'') : undefined}>
          {value >= n ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

function Pill({ children, solid=false, dim=false, title, style }) {
  return <span className={"pill" + (solid?' solid':'') + (dim?' dim':'')} title={title} style={style}>{children}</span>;
}

function NobelPill() {
  return <span className="pill" title="Nobel Prize laureate">★ Nobel</span>;
}

function AudioGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 14v-2a9 9 0 0118 0v2"/>
      <path d="M3 14v3a2 2 0 002 2h2v-7H5a2 2 0 00-2 2zM21 14v3a2 2 0 01-2 2h-2v-7h2a2 2 0 012 2z"/>
    </svg>
  );
}

function CloseX({ onClick }) {
  return (
    <button onClick={onClick} className="close" aria-label="Close">[ × Close ]</button>
  );
}

// ------- Helpers -------
function fullName(b) {
  if (b.authorFirst && b.authorLast) return b.authorFirst + ' ' + b.authorLast;
  return b.authorLast || b.authorFirst || 'Unknown';
}
function sortBySurname(books) {
  return [...books].sort((a,b) => (a.authorLast||'').localeCompare(b.authorLast||'') || (a.title||'').localeCompare(b.title||''));
}
function bySurnameInitial(b) {
  const s = (b.authorLast || b.authorFirst || '?').trim().toUpperCase();
  const c = s.charAt(0);
  return /[A-Z]/.test(c) ? c : '#';
}

// Open Library search
async function openLibrarySearch(q) {
  if (!q || q.length < 2) return [];
  const url = 'https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=10';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open Library search failed');
  const data = await res.json();
  return (data.docs || []).map(d => ({
    title: d.title,
    authorFirst: (d.author_name && d.author_name[0]) ? d.author_name[0].split(' ').slice(0,-1).join(' ') : '',
    authorLast:  (d.author_name && d.author_name[0]) ? d.author_name[0].split(' ').slice(-1)[0] : '',
    fullAuthor: d.author_name && d.author_name[0],
    year: d.first_publish_year,
    coverUrl: d.cover_i ? 'https://covers.openlibrary.org/b/id/' + d.cover_i + '-M.jpg' : '',
    coverUrlLarge: d.cover_i ? 'https://covers.openlibrary.org/b/id/' + d.cover_i + '-L.jpg' : '',
    key: d.key,
  }));
}

// Expose globals
Object.assign(window, {
  TAGS, LANGUAGES, LANG_SHORT,
  Store, StoreProvider, useStore,
  Cover, Stars, Pill, NobelPill, AudioGlyph, CloseX,
  fullName, sortBySurname, bySurnameInitial,
  openLibrarySearch,
});
