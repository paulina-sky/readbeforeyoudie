// pages.jsx — Home, ToRead, Read, Authors
const { useState: useStateP, useMemo: useMemoP, useEffect: useEffectP, useRef: useRefP } = React;

// -------- BookRow (shared by To Read / Read) --------
function BookRow({ book, mode, onOpen, onEdit, expanded, onExpand }) {
  const { setNext, updateBook, books, NEXT_CAP } = useStore();
  const isNext = book.toReadNext;
  const queueFull = useMemoP(() => books.filter((b) => b.toReadNext).length >= NEXT_CAP, [books, NEXT_CAP]);
  return (
    <>
      <div className={"book-row" + (isNext ? ' next' : '') + (expanded ? ' expanded' : '')} onClick={onOpen}>
        <div className="row-cover"><Cover book={book} /></div>
        <div className="row-main">
          <div className="row-title">
            {book.title}
            {isNext && <Pill solid title="Next up" style={{ marginLeft: 12 }}>Next</Pill>}
          </div>
          <div className="row-author">{fullName(book)}</div>
          <div className="row-meta">
            {book.nobelPrize && <NobelPill />}
            {book.language && <Pill>{LANG_SHORT[book.language] || book.language}</Pill>}
            {book.audiobook && <Pill><AudioGlyph /> Audio</Pill>}
            {book.borrowed && <Pill dim>From {book.borrowedFrom || '—'}</Pill>}
            {book.tags.map((t) => <Pill key={t}>{t}</Pill>)}
          </div>
        </div>
        <div className="row-right" onClick={(e) => e.stopPropagation()}>
          {mode === 'read' && <Stars value={book.rating || 0} onChange={(v) => updateBook(book.id, { rating: v || null })} size={18} />}
          {mode === 'read' && <div className="caps" style={{ fontSize: 11, letterSpacing: '0.18em', minWidth: 60, textAlign: 'right', opacity: .8 }}>{book.dateRead || '—'}</div>}
          <div className="row-actions">
            {mode === 'to-read' && !isNext &&
            <button
              className="btn tiny"
              onClick={() => setNext(book.id)}
              disabled={queueFull}
              title={queueFull ? `Queue is full (${NEXT_CAP} books). Remove one first.` : 'Add to Next Up queue'}>
              ★ Next</button>
            }
            <button className="btn tiny" onClick={onEdit}>Edit</button>
          </div>
        </div>
      </div>
      {expanded && mode === 'read' &&
      <div className="row-expand">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 36, paddingTop: 18 }}>
            <div>
              <div className="caps" style={{ fontSize: 10.5, letterSpacing: '0.2em', opacity: .55, marginBottom: 8 }}>Notes</div>
              {book.notes ?
            <div className="serif" style={{ fontSize: 18, lineHeight: 1.5, fontStyle: 'italic' }}>"{book.notes}"</div> :
            <div className="hint">No notes yet. Click Edit to add some.</div>}
            </div>
            <div style={{ borderLeft: '1px solid #000', paddingLeft: 22 }}>
              <div className="caps" style={{ fontSize: 10.5, letterSpacing: '0.2em', opacity: .55, marginBottom: 6 }}>Date read</div>
              <div className="serif" style={{ fontSize: 22 }}>{book.dateRead || '—'}</div>
              <div className="caps" style={{ fontSize: 10.5, letterSpacing: '0.2em', opacity: .55, marginTop: 18, marginBottom: 6 }}>Rating</div>
              <Stars value={book.rating || 0} size={18} />
              <div style={{ marginTop: 18 }}>
                <button className="btn tiny" onClick={onOpen}>Open detail →</button>
              </div>
            </div>
          </div>
        </div>
      }
    </>);

}

// -------- HOME --------
function HomePage({ openDetail, openEdit, openAdd }) {
  const { books, reorderNext, removeFromNext, setNext, NEXT_CAP } = useStore();
  const [showPicker, setShowPicker] = useStateP(false);
  // Queue, ordered by nextOrder ascending
  const queue = useMemoP(() =>
  books.filter((b) => b.toReadNext).
  sort((a, b) => (a.nextOrder || 0) - (b.nextOrder || 0)),
  [books]);
  const next = queue[0];
  const queueRest = queue.slice(1);

  // Drag state for the small queue row (and hero)
  const [dragIdx, setDragIdx] = useStateP(null);
  const [overIdx, setOverIdx] = useStateP(null);
  const onDragStart = (idx) => (e) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    try {e.dataTransfer.setData('text/plain', String(idx));} catch (_) {}
  };
  const onDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIdx !== idx) setOverIdx(idx);
  };
  const onDragLeave = () => setOverIdx(null);
  const onDrop = (idx) => (e) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {setDragIdx(null);setOverIdx(null);return;}
    const newOrder = queue.map((b) => b.id);
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    reorderNext(newOrder);
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd = () => {setDragIdx(null);setOverIdx(null);};

  const [favLimit, setFavLimit] = useStateP(12);
  const allFavs = useMemoP(() =>
    books.filter((b) => b.rating === 5 && b.list === 'read' && !b.rejected).
    sort((a, b) => (b.dateRead || '').localeCompare(a.dateRead || '')),
    [books]);
  const favs = useMemoP(() => allFavs.slice(0, favLimit), [allFavs, favLimit]);

  const readCount = books.filter((b) => b.list === 'read').length;
  const toReadCount = books.filter((b) => b.list === 'to-read').length;
  const nobelCount = books.filter((b) => b.nobelPrize).length;
  const authorCount = new Set(books.map((b) => fullName(b))).size;
  const fiveCount = books.filter((b) => b.rating === 5 && b.list === 'read' && !b.rejected).length;

  return (
    <div className="container">
      {/* Hero */}
      {next ?
      <div
        className={"hero " + (overIdx === 0 && dragIdx !== 0 ? 'drop-target' : '') + (dragIdx === 0 ? 'dragging' : '')}
        onClick={() => openDetail(next)}
        style={{ cursor: 'pointer' }}
        draggable={queue.length > 1}
        onDragStart={onDragStart(0)}
        onDragOver={onDragOver(0)}
        onDragLeave={onDragLeave}
        onDrop={onDrop(0)}
        onDragEnd={onDragEnd}>
        
          <div className="hero-cover" onClick={(e) => {e.stopPropagation();openDetail(next);}}>
            <Cover book={next} style={{ height: '100%' }} />
          </div>
          <div className="hero-meta">
            <div className="eyebrow-row">
              <span className="eyebrow">№01 · Next up · On the night-stand</span>
              <button className="hero-remove" onClick={(e) => {e.stopPropagation();removeFromNext(next.id);}} title="Remove from queue" aria-label="Remove from queue">
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="8" y2="8" />
                  <line x1="8" y1="2" x2="2" y2="8" />
                </svg>
              </button>
            </div>
            <h1 className="display">{next.title}</h1>
            <div className="author">{fullName(next)}</div>
            <div className="tags">
              {next.nobelPrize && <NobelPill />}
              {next.tags.map((t) => <Pill key={t}>{t}</Pill>)}
              {next.borrowed && <Pill dim>Borrowed · {next.borrowedFrom || '—'}</Pill>}
            </div>
            {next.notes && <div className="quote">"{next.notes}"</div>}
          </div>
        </div> :

      <div className="hero-empty">
          <div className="caps" style={{ letterSpacing: '0.3em', fontSize: 11 }}>The night-stand is empty</div>
          <div className="display">Mark a book as next.</div>
          <div className="hint" style={{ maxWidth: 420, textAlign: 'center' }}>Open <em>To Read</em>, hover any title, and click "★ Next" to add it to your queue (up to {NEXT_CAP}).</div>
        </div>
      }

      {/* Queue: the next 2–6 in line */}
      {next && (
        <div className="queue-strip">
          <div className="queue-head">
            <div className="caps" style={{ letterSpacing: '0.32em', fontSize: 11, marginBottom: 4 }}>Then in line</div>
            <div className="meta" style={{ opacity: .55, fontSize: 11 }}>
              {queueRest.length} of {NEXT_CAP - 1}
              {queueRest.length > 1 ? ' · drag to reorder' : ''}
            </div>
          </div>
          <div className="queue-row">
            {queueRest.map((b, i) => {
              const idx = i + 1;
              return (
                <div
                  key={b.id}
                  className={"queue-card " + (overIdx === idx && dragIdx !== idx ? 'drop-target' : '') + (dragIdx === idx ? ' dragging' : '')}
                  draggable
                  onDragStart={onDragStart(idx)}
                  onDragOver={onDragOver(idx)}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop(idx)}
                  onDragEnd={onDragEnd}
                  onClick={() => openDetail(b)}
                  title={`#${idx + 1} · drag to reorder`}>
                  <div className="qc-num">№{String(idx + 1).padStart(2, '0')}</div>
                  <div className="qc-cover"><Cover book={b} /></div>
                  <div className="qc-title">{b.title}</div>
                  <div className="qc-author">{fullName(b)}</div>
                  <button className="qc-remove" onClick={(e) => {e.stopPropagation();removeFromNext(b.id);}} title="Remove from queue" style={{ width: "24px", height: "24px" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <line x1="2" y1="2" x2="8" y2="8" />
                      <line x1="8" y1="2" x2="2" y2="8" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {queue.length < NEXT_CAP && (
              <button className="queue-add" onClick={() => setShowPicker(true)} title="Add a book to the queue">
                <div className="qc-num" style={{opacity:.4}}>№{String(queueRest.length + 2).padStart(2,'0')}</div>
                <div className="qa-cover">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div className="qa-label">Add to queue</div>
              </button>
            )}
          </div>
        </div>
      )}

      {showPicker && (
        <QueuePicker
          onClose={() => setShowPicker(false)}
          onPick={(id) => { setNext(id); setShowPicker(false); }}
          onAddNew={() => { setShowPicker(false); openAdd && openAdd({ onSaved: (id) => setNext(id) }); }}
        />
      )}

      {/* Stats */}
      <div className="statstrip">
        <div className="stat"><div className="n">{books.length}</div><div className="l">In the library</div></div>
        <div className="stat"><div className="n">{readCount}</div><div className="l">Read</div></div>
        <div className="stat"><div className="n">{toReadCount}</div><div className="l">To Read</div></div>
        <div className="stat"><div className="n">{nobelCount}</div><div className="l">Nobel laureates</div></div>
        <div className="stat"><div className="n">{authorCount}</div><div className="l">Authors</div></div>
      </div>

      {/* Favourites */}
      <div className="section-head">
        <div>
          <div className="caps" style={{ letterSpacing: '0.32em', fontSize: 11, marginBottom: 10 }}>The Pantheon</div>
          <h2 className="display">5 Stars</h2>
        </div>
        <div className="meta">{fiveCount} titles · sorted by date read</div>
      </div>

      {favs.length === 0 ?
      <div className="hint" style={{ padding: '40px 0 80px' }}>No 5-star books yet. Get reading.</div> :

      <>
        <div className="fav-grid">
          {favs.map((b) =>
          <div className="fav-card" key={b.id} onClick={() => openDetail(b)} style={{ cursor: 'pointer' }}>
              <Cover book={b} />
              <div className="ft">{b.title}</div>
              <div className="fa">{fullName(b)}</div>
              <div className="fd">{b.dateRead || '—'}</div>
            </div>
          )}
        </div>
        {allFavs.length > favLimit && (
          <div className="load-more-wrap">
            <button className="btn" onClick={() => setFavLimit(n => n + 12)}>
              Load more <span style={{opacity:.5, marginLeft:6}}>· {allFavs.length - favLimit} remaining</span>
            </button>
          </div>
        )}
      </>
      }
    </div>);

}

// -------- TO READ --------
function ToReadPage({ openDetail, openEdit, openAdd, openImport }) {
  return <BookListPage mode="to-read"
  openDetail={openDetail} openEdit={openEdit}
  openAdd={openAdd} openImport={openImport} />;
}

// -------- READ --------
function ReadPage({ openDetail, openEdit, openAdd }) {
  return <BookListPage mode="read"
  openDetail={openDetail} openEdit={openEdit} openAdd={openAdd} />;
}

// -------- Letter section divider --------
function LetterDivider({ letter, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, paddingTop: 38, paddingBottom: 12, borderBottom: '1px solid #000', marginTop: 4 }}>
      <div className="serif" style={{ fontSize: 64, fontWeight: 300, lineHeight: 0.85, letterSpacing: '-0.02em' }}>{letter}</div>
      <div className="caps" style={{ fontSize: 11, letterSpacing: '0.22em', opacity: .55, paddingBottom: 6 }}>{count} {count === 1 ? 'title' : 'titles'}</div>
    </div>);

}

const ALPHA = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

// -------- Unified list page (To Read / Read) --------
function BookListPage({ mode, openDetail, openEdit, openAdd, openImport }) {
  const { books } = useStore();
  const isRead = mode === 'read';
  const [sortBy, setSortBy] = useStateP('surname');
  const [tagFilter, setTagFilter] = useStateP(null);
  const [langFilter, setLangFilter] = useStateP(null);
  const [onlyNobel, setOnlyNobel] = useStateP(false);
  const [q, setQ] = useStateP('');
  const [letter, setLetter] = useStateP(null);
  const [expanded, setExpanded] = useStateP({});
  const containerRef = useRefP(null);

  const list = useMemoP(() => books.filter((b) => b.list === mode), [books, mode]);

  const tagCounts = useMemoP(() => {
    const c = {};
    list.forEach((b) => b.tags.forEach((t) => c[t] = (c[t] || 0) + 1));
    return c;
  }, [list]);

  const langCounts = useMemoP(() => {
    const c = {};
    list.forEach((b) => {if (b.language) c[b.language] = (c[b.language] || 0) + 1;});
    return c;
  }, [list]);

  const filtered = useMemoP(() => {
    let r = list;
    if (q) {
      const Q = q.toLowerCase();
      r = r.filter((b) => (b.title || '').toLowerCase().includes(Q) || fullName(b).toLowerCase().includes(Q));
    }
    if (tagFilter) r = r.filter((b) => b.tags.includes(tagFilter));
    if (langFilter) r = r.filter((b) => b.language === langFilter);
    if (onlyNobel) r = r.filter((b) => b.nobelPrize);
    if (letter) r = r.filter((b) => {
      const c = (b.authorLast || b.authorFirst || '?').charAt(0).toUpperCase();
      return letter === '#' ? !/[A-Z]/.test(c) : c === letter;
    });

    if (sortBy === 'surname') r = sortBySurname(r);else
    if (sortBy === 'title') r = [...r].sort((a, b) => (a.title || '').localeCompare(b.title || ''));else
    if (sortBy === 'date') r = [...r].sort((a, b) => (b.dateRead || '').localeCompare(a.dateRead || ''));else
    if (sortBy === 'rating') r = [...r].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return r;
  }, [list, q, tagFilter, langFilter, onlyNobel, letter, sortBy]);

  // Letters present in the *unfiltered* list (so the jump bar shows everything you have)
  const lettersPresent = useMemoP(() => {
    const set = new Set();
    for (const b of list) {
      const c = (b.authorLast || b.authorFirst || '?').charAt(0).toUpperCase();
      set.add(/[A-Z]/.test(c) ? c : '#');
    }
    return set;
  }, [list]);

  // Letter counts within current filter
  const filteredLetterCounts = useMemoP(() => {
    const c = {};
    for (const b of filtered) {
      const ch = (b.authorLast || b.authorFirst || '?').charAt(0).toUpperCase();
      const k = /[A-Z]/.test(ch) ? ch : '#';
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [filtered]);

  const grouped = sortBy === 'surname';

  // Scroll spy: which letter section is the user currently on?
  // Uses IntersectionObserver. The letter whose divider is just below the sticky
  // filter panel is the "active" one.
  const [activeLetter, setActiveLetter] = useStateP(null);
  useEffectP(() => {
    if (!grouped) { setActiveLetter(null); return; }
    const headers = Array.from(document.querySelectorAll('[data-letter-anchor]'));
    if (!headers.length) return;

    // Track the topmost visible divider. We use boundingRect.top thresholds —
    // the active letter is the last one whose top has crossed the filter panel.
    const onScroll = () => {
      // Sticky panel sits at top:0 — measure its height to know the offset.
      const panel = document.querySelector('.filter-panel');
      const offset = (panel ? panel.getBoundingClientRect().height : 0) + 12;
      let current = null;
      for (const h of headers) {
        const top = h.getBoundingClientRect().top;
        if (top <= offset) current = h.dataset.letterAnchor;
        else break;
      }
      setActiveLetter(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [grouped, filtered.length]);

  // Scroll-to-letter jump
  const jumpTo = (L) => {
    setLetter(null);
    requestAnimationFrame(() => {
      const el = document.getElementById('lt-' + (L === '#' ? 'hash' : L));
      if (el) {
        const panel = document.querySelector('.filter-panel');
        const offset = (panel ? panel.getBoundingClientRect().height : 0) + 8;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  };

  // Render the rows, with letter dividers between groups when sorted by surname
  let lastLetter = null;
  const rendered = [];
  for (let i = 0; i < filtered.length; i++) {
    const b = filtered[i];
    const c = (b.authorLast || b.authorFirst || '?').charAt(0).toUpperCase();
    const L = /[A-Z]/.test(c) ? c : '#';
    if (grouped && L !== lastLetter) {
      rendered.push(
        <div key={'h-' + L} id={'lt-' + (L === '#' ? 'hash' : L)} data-letter-anchor={L}>
          <LetterDivider letter={L} count={filteredLetterCounts[L] || 0} />
        </div>
      );
      lastLetter = L;
    }
    rendered.push(
      <BookRow key={b.id} book={b} mode={mode}
      expanded={isRead ? !!expanded[b.id] : false}
      onOpen={() => openDetail(b)}
      onEdit={() => openEdit(b)}
      onExpand={isRead ? () => setExpanded((s) => ({ ...s, [b.id]: !s[b.id] })) : undefined} />
    );
  }

  const sortOptions = isRead
    ? [['surname','Surname'],['title','Title'],['date','Date Read'],['rating','Rating']]
    : [['surname','Surname'],['title','Title']];
  const currentSortLabel = (sortOptions.find(([k]) => k === sortBy) || sortOptions[0])[1];

  return (
    <div className="container" ref={containerRef}>
      <div className="section-head list-head">
        <div className="list-head-titles">
          <div className="eyebrow-line caps">
            <span>{list.length} {list.length === 1 ? 'title' : 'titles'}</span>
            <span className="bullet">·</span>
            <span>{isRead ? 'Finished' : 'Waiting'}</span>
          </div>
          <h2 className="display">{isRead ? 'Read' : 'To Read'}</h2>
        </div>
        <div className="list-head-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20 L16 16" />
          </svg>
          <input type="search" placeholder="Search title or author…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="filter-panel">
        <div className="filter-line">
          <span className="filter-label">Tag</span>
          <div className="filter-scroll">
            <button className={"filter-chip " + (!tagFilter && !onlyNobel && !langFilter ? 'active' : '')} onClick={() => {setTagFilter(null);setOnlyNobel(false);setLangFilter(null);}}>All</button>
            <button className={"filter-chip " + (onlyNobel ? 'active' : '')} onClick={() => setOnlyNobel(!onlyNobel)}>★ Nobel</button>
            {Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([l, n]) =>
              <button key={'L-'+l} className={"filter-chip " + (langFilter === l ? 'active' : '')} onClick={() => setLangFilter(langFilter === l ? null : l)}>{LANG_SHORT[l] || l} <span style={{ opacity: .5, marginLeft: 4 }}>{n}</span></button>
            )}
            {Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) =>
              <button key={t} className={"filter-chip " + (tagFilter === t ? 'active' : '')} onClick={() => setTagFilter(tagFilter === t ? null : t)}>{t} <span style={{ opacity: .5, marginLeft: 4 }}>{n}</span></button>
            )}
          </div>
        </div>

        <div className="filter-line">
          <span className="filter-label">Sort</span>
          <SortDropdown
            value={sortBy}
            label={currentSortLabel}
            options={sortOptions}
            onChange={setSortBy}
          />
          {grouped && (
            <div className="alpha-jump">
              <button className={"filter-chip alpha-all " + (!letter && !activeLetter ? 'active' : '')} onClick={() => { setLetter(null); window.scrollTo({top:0, behavior:'smooth'}); }}>All</button>
              {ALPHA.map((L) => {
                const has = lettersPresent.has(L);
                const isActive = activeLetter === L;
                return (
                  <button
                    key={L}
                    className={"alpha-letter" + (has ? ' has' : '') + (isActive ? ' active' : '')}
                    disabled={!has}
                    onClick={() => has && jumpTo(L)}
                  >{L}</button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {rendered}

      {filtered.length === 0 &&
      <div className="hint" style={{ padding: '48px 0' }}>Nothing matches. Try clearing filters.</div>
      }
    </div>);

}

// -------- SortDropdown — used in the filter panel --------
function SortDropdown({ value, label, options, onChange }) {
  const [open, setOpen] = useStateP(false);
  const ref = useRefP(null);
  useEffectP(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);
  return (
    <div className="sort-dropdown" ref={ref}>
      <button
        className={"filter-chip sort-chip " + (open ? 'open' : '')}
        onClick={() => setOpen(s => !s)}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: 6, opacity: 0.7}}>
          <path d="M2 4 L5 7 L8 4" />
        </svg>
      </button>
      {open && (
        <div className="sort-menu">
          {options.map(([k, l]) => (
            <button
              key={k}
              className={"sort-menu-item " + (value === k ? 'active' : '')}
              onClick={() => { onChange(k); setOpen(false); }}
            >{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// -------- AUTHORS --------
function AuthorsPage({ openDetail }) {
  const { books } = useStore();
  const [letter, setLetter] = useStateP(null);
  const [openAuthor, setOpenAuthor] = useStateP(null);

  const byAuthor = useMemoP(() => {
    const map = new Map();
    for (const b of books) {
      const key = fullName(b);
      if (!map.has(key)) map.set(key, { name: key, surname: b.authorLast || b.authorFirst || '?', books: [], nobel: false });
      const entry = map.get(key);
      entry.books.push(b);
      if (b.nobelPrize) entry.nobel = true;
    }
    return [...map.values()].sort((a, b) => (a.surname || '').localeCompare(b.surname || ''));
  }, [books]);

  const letters = useMemoP(() => {
    const set = new Set();
    for (const a of byAuthor) {
      const c = (a.surname || '?').charAt(0).toUpperCase();
      set.add(/[A-Z]/.test(c) ? c : '#');
    }
    return set;
  }, [byAuthor]);

  const filtered = useMemoP(() => {
    if (!letter) return byAuthor;
    return byAuthor.filter((a) => {
      const c = (a.surname || '?').charAt(0).toUpperCase();
      return letter === '#' ? !/[A-Z]/.test(c) : c === letter;
    });
  }, [byAuthor, letter]);

  return (
    <div className="container">
      <div className="section-head list-head">
        <div className="list-head-titles">
          <div className="eyebrow-line caps">
            <span>{byAuthor.length} {byAuthor.length === 1 ? 'author' : 'authors'}</span>
            <span className="bullet">·</span>
            <span>Dramatis personæ</span>
          </div>
          <h2 className="display">Authors</h2>
        </div>
      </div>

      <div className="filter-panel">
        <div className="filter-line">
          <div className="alpha-jump">
            <button className={"filter-chip alpha-all " + (!letter ? 'active' : '')} onClick={() => setLetter(null)}>All</button>
            {ALPHA.map((L) => {
              const has = letters.has(L);
              return (
                <button
                  key={L}
                  className={"alpha-letter" + (has ? ' has' : '') + (letter === L ? ' active' : '')}
                  disabled={!has}
                  onClick={() => has && setLetter(letter === L ? null : L)}
                >{L}</button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="author-grid">
        {(() => {
          const perCol = Math.ceil(filtered.length / 3);
          const cols = [
          filtered.slice(0, perCol),
          filtered.slice(perCol, perCol * 2),
          filtered.slice(perCol * 2)];

          // Interleave so grid (row-flow) renders as columns top-to-bottom
          const out = [];
          for (let r = 0; r < perCol; r++) {
            for (let c = 0; c < 3; c++) {
              if (cols[c][r]) out.push(cols[c][r]);
            }
          }
          return out;
        })().map((a) =>
        <div key={a.name} className={"author-row " + (a.nobel ? 'has-nobel' : '')} onClick={() => setOpenAuthor(a)}>
            <div className="name serif">{a.surname}{a.surname && a.name.replace(a.surname, '').trim() ? ', ' : ''}{a.name.replace(a.surname, '').trim()}</div>
            <div className="count">{a.books.length} {a.books.length === 1 ? 'book' : 'books'}</div>
          </div>
        )}
      </div>

      {openAuthor &&
      <div className="scrim" onClick={() => setOpenAuthor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="caps" style={{ fontSize: 11, letterSpacing: '0.22em', marginBottom: 8 }}>Author</div>
                <h3>{openAuthor.name} {openAuthor.nobel && <span style={{ fontSize: 20, marginLeft: 8 }}>★</span>}</h3>
              </div>
              <CloseX onClick={() => setOpenAuthor(null)} />
            </div>
            <div>
              {openAuthor.books.map((b) =>
            <div key={b.id} className="book-row" style={{ padding: '12px 0' }} onClick={() => {setOpenAuthor(null);openDetail(b);}}>
                  <div className="row-cover"><Cover book={b} /></div>
                  <div className="row-main">
                    <div className="row-title">{b.title}</div>
                    <div className="row-meta">
                      <Pill solid>{b.list === 'read' ? 'Read' : 'To read'}</Pill>
                      {b.rating && <Stars value={b.rating} size={14} />}
                      {b.language && <Pill>{LANG_SHORT[b.language] || b.language}</Pill>}
                      {b.tags.slice(0, 3).map((t) => <Pill key={t}>{t}</Pill>)}
                    </div>
                  </div>
                </div>
            )}
            </div>
          </div>
        </div>
      }
    </div>);

}

Object.assign(window, { HomePage, ToReadPage, ReadPage, AuthorsPage, BookRow });

// -------- QueuePicker: search To Read + add new --------
function QueuePicker({ onClose, onPick, onAddNew }) {
  const { books } = useStore();
  const [q, setQ] = useStateP('');
  const inputRef = useRefP(null);

  useEffectP(() => {
    inputRef.current && inputRef.current.focus();
  }, []);

  const candidates = useMemoP(() => {
    const list = books.filter(b => b.list === 'to-read' && !b.toReadNext);
    if (!q.trim()) return sortBySurname(list).slice(0, 50);
    const Q = q.trim().toLowerCase();
    return list
      .filter(b => (b.title||'').toLowerCase().includes(Q) || fullName(b).toLowerCase().includes(Q))
      .slice(0, 80);
  }, [books, q]);

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal queue-picker" style={{maxWidth: 640}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="caps" style={{fontSize:11, letterSpacing:'0.22em', marginBottom: 8}}>Add to queue</div>
            <h3 className="serif" style={{fontSize: 32, fontWeight: 300, letterSpacing:'-0.01em'}}>From the shelf</h3>
          </div>
          <CloseX onClick={onClose} />
        </div>

        <div className="qp-search">
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search title or author…"
          />
        </div>

        <div className="qp-list">
          {candidates.length === 0 ? (
            <div className="hint" style={{padding:'30px 4px'}}>
              {q ? 'Nothing matches.' : 'No books left on the To Read shelf.'}
            </div>
          ) : (
            candidates.map(b => (
              <button key={b.id} className="qp-row" onClick={() => onPick(b.id)}>
                <div className="qp-cover"><Cover book={b} /></div>
                <div className="qp-main">
                  <div className="qp-title">{b.title}</div>
                  <div className="qp-author">{fullName(b)}</div>
                </div>
                <div className="qp-add">Add</div>
              </button>
            ))
          )}
        </div>

        <div className="qp-foot">
          <span className="caps" style={{fontSize:10.5, letterSpacing:'0.22em', opacity:.55}}>Not here?</span>
          <button className="btn" onClick={onAddNew}>+ Add a new book</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { QueuePicker });