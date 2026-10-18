// ios-app.jsx — iOS mobile variant of Read before you die
// Same editorial B&W aesthetic, mobile-native navigation patterns.
const { useState: useStateI, useMemo: useMemoI, useEffect: useEffectI, useRef: useRefI } = React;

const PHONE_W = 402;
const PHONE_H = 874;
const TOP_INSET = 60;        // status bar height
const TAB_H = 78;             // bottom tab bar + safe area
const HOME_INDICATOR = 34;

// ----- iOS-flavoured pill -----
function IPill({ children, solid=false, dim=false, style={} }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.12em',
      fontSize: 9.5, fontWeight: 500,
      padding:'2px 6px 1.5px',
      border:'1px solid #000',
      lineHeight: 1, height: 17,
      whiteSpace:'nowrap',
      background: solid ? '#000' : '#fff',
      color: solid ? '#fff' : '#000',
      opacity: dim ? 0.6 : 1,
      ...style,
    }}>{children}</span>
  );
}

// ----- Mini stars -----
function IStars({ value, size=12 }) {
  const isFive = value === 5;
  return (
    <span style={{display:'inline-flex', gap:1, fontSize: size, lineHeight:1, fontFamily:'var(--serif)'}}>
      {[1,2,3,4,5].map(n => {
        const filled = value >= n;
        const style = filled
          ? (isFive
            ? {
                background: 'linear-gradient(135deg, #c8932a 0%, #f6dc89 40%, #e9b94c 70%, #b58218 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
              }
            : { opacity: 1 })
          : { opacity: 0.18 };
        return <span key={n} style={style}>★</span>;
      })}
    </span>
  );
}

// ----- Tab bar -----
function TabBar({ active, onChange }) {
  const tabs = [
    {k:'home',    l:'Home'},
    {k:'to-read', l:'To Read'},
    {k:'read',    l:'Read'},
    {k:'authors', l:'Authors'},
  ];
  return (
    <div style={{
      position:'absolute', bottom: 0, left: 0, right: 0,
      height: TAB_H, paddingBottom: HOME_INDICATOR,
      borderTop:'1px solid #000',
      background:'#fff',
      display:'grid', gridTemplateColumns:'repeat(4, 1fr)',
      zIndex: 40,
    }}>
      {tabs.map(t => (
        <button key={t.k} onClick={() => onChange(t.k)}
          style={{
            border: 0, background:'transparent', padding:0, cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap: 4,
            color:'#000',
            borderRight: t.k === 'authors' ? 'none' : '1px solid #000',
          }}>
          <span style={{
            fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.1em',
            fontSize: 10.5, fontWeight: active===t.k ? 700 : 500,
            paddingBottom: 2,
            whiteSpace:'nowrap',
            borderBottom: active===t.k ? '1px solid #000' : '1px solid transparent',
          }}>{t.l}</span>
        </button>
      ))}
    </div>
  );
}

// ----- App nav title bar -----
function MobileTitleBar({ leading, title, trailing, subtitle }) {
  return (
    <div style={{
      paddingTop: TOP_INSET + 6,
      paddingBottom: 14,
      paddingLeft: 18,
      paddingRight: 18,
      borderBottom: '1px solid #000',
      background: '#fff',
      display: 'flex',
      flexDirection:'column',
      gap: 4,
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', minHeight: 22}}>
        <div style={{minWidth: 40}}>{leading}</div>
        <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.22em', fontSize: 10}}>{subtitle}</div>
        <div style={{minWidth: 40, textAlign:'right'}}>{trailing}</div>
      </div>
      <div style={{fontFamily:'var(--serif)', fontWeight:300, fontSize: 34, lineHeight:1, letterSpacing:'-0.015em'}}>{title}</div>
    </div>
  );
}

// ----- Mobile Cover (placeholder/img) -----
function MCover({ book, w, h, style={} }) {
  const [err, setErr] = useStateI(false);
  if (book.coverUrl && !err) {
    return <div style={{width:w, height:h, background:'#000', flexShrink:0, ...style}}>
      <img src={book.coverUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}} onError={()=>setErr(true)} loading="lazy" />
    </div>;
  }
  return (
    <div style={{
      width:w, height:h, background:'#000', color:'#fff',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding: w*0.1, textAlign:'center', flexShrink:0,
      ...style,
    }}>
      <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: Math.max(8, w*0.075), lineHeight:1.15, textWrap:'balance'}}>
        {(book.title||'').length > 60 ? book.title.slice(0,58)+'…' : book.title}
      </div>
      <div style={{width:'30%', height:1, background:'#fff', opacity:.4, margin: `${w*0.06}px 0`}} />
      <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize: Math.max(6, w*0.05), opacity:.7}}>
        {fullName(book)}
      </div>
    </div>
  );
}

// ----- Mobile book row -----
function MBookRow({ book, onOpen, showRating, showDate }) {
  return (
    <div onClick={onOpen} style={{
      display:'grid', gridTemplateColumns:'46px 1fr', gap: 14,
      padding:'12px 18px',
      borderBottom:'1px solid #000',
      cursor:'pointer', background:'#fff',
    }}>
      <div><MCover book={book} w={46} h={66} /></div>
      <div style={{minWidth: 0}}>
        <div style={{fontFamily:'var(--serif)', fontSize: 17, lineHeight:1.15, fontWeight: 400, letterSpacing:'-0.005em'}}>{book.title}</div>
        <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize: 10.5, marginTop: 4, opacity:.8}}>{fullName(book)}</div>
        <div style={{display:'flex', gap: 6, alignItems:'center', marginTop: 6, flexWrap:'wrap'}}>
          {book.nobelPrize && <IPill>★ Nobel</IPill>}
          {book.toReadNext && <IPill solid>Next</IPill>}
          {showRating && book.rating && <IStars value={book.rating} />}
          {book.language && <IPill>{LANG_SHORT[book.language] || book.language}</IPill>}
          {showDate && book.dateRead && (
            <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize:9.5, opacity:.55}}>{yearRead(book.dateRead)}</span>
          )}
          {book.tags.slice(0,2).map(t => <IPill key={t}>{t}</IPill>)}
          {book.tags.length > 2 && <span style={{fontFamily:'var(--caps)', fontSize: 9.5, opacity:.55}}>+{book.tags.length-2}</span>}
        </div>
      </div>
    </div>
  );
}

// ----- Letter divider for mobile -----
function MLetterDivider({ letter, count, ...rest }) {
  return (
    <div {...rest} style={{
      display:'flex', alignItems:'baseline', gap: 12,
      padding:'24px 18px 8px',
      borderBottom:'1px solid #000',
      background:'#fff',
    }}>
      <span style={{fontFamily:'var(--serif)', fontSize: 36, lineHeight:0.85, fontWeight: 300, letterSpacing:'-0.02em'}}>{letter}</span>
      <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.2em', fontSize:10, opacity:.55}}>{count} {count===1?'title':'titles'}</span>
    </div>
  );
}

// ----- Home screen -----
function MHome({ books, openDetail, navigateTo }) {
  const next = books.find(b => b.toReadNext);
  const favs = useMemoI(() => books.filter(b => b.rating === 5)
    .sort((a,b) => (b.dateRead||'').localeCompare(a.dateRead||''))
    .slice(0, 12), [books]);
  const counts = useMemoI(() => ({
    read: books.filter(b => b.list==='read').length,
    toRead: books.filter(b => b.list==='to-read').length,
    nobel: books.filter(b => b.nobelPrize).length,
    five: books.filter(b => b.rating===5).length,
  }), [books]);

  return (
    <div style={{paddingBottom: TAB_H + 16}}>
      <MobileTitleBar
        subtitle="A private library"
        title={<span>Read <em>before you</em> die</span>}
        trailing={
          <a href="Read before you die.html" style={{
            fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize: 10,
            border:'1px solid #000', padding:'3px 7px 2px', color:'#000',
            textDecoration:'none', whiteSpace:'nowrap',
          }}>Desktop ↗</a>
        }
      />

      {/* Next up hero */}
      {next ? (
        <div onClick={() => openDetail(next)} style={{padding: '22px 18px', borderBottom:'1px solid #000', cursor:'pointer'}}>
          <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.3em', fontSize: 10, paddingBottom: 14, borderBottom:'1px solid #000', marginBottom: 16}}>
            № 01 · Next up · On the night-stand
          </div>
          <div style={{display:'grid', gridTemplateColumns:'128px 1fr', gap: 18, alignItems:'flex-start'}}>
            <MCover book={next} w={128} h={192} />
            <div>
              <div style={{fontFamily:'var(--serif)', fontWeight:300, fontSize: 26, lineHeight:1, letterSpacing:'-0.01em', textWrap:'balance'}}>{next.title}</div>
              <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: 15, marginTop: 8}}>by {fullName(next)}</div>
              <div style={{display:'flex', gap: 4, flexWrap:'wrap', marginTop: 12}}>
                {next.nobelPrize && <IPill>★ Nobel</IPill>}
                {next.tags.slice(0,3).map(t => <IPill key={t}>{t}</IPill>)}
              </div>
            </div>
          </div>
          <button style={{
            marginTop: 18, width:'100%', padding:'12px 14px',
            background:'#000', color:'#fff', border:'1px solid #000',
            fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em',
            fontSize: 11, fontWeight: 600, cursor:'pointer',
          }}>Open</button>
        </div>
      ) : (
        <div style={{padding:'40px 18px', textAlign:'center', borderBottom:'1px solid #000'}}>
          <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.3em', fontSize: 10}}>Empty night-stand</div>
          <div style={{fontFamily:'var(--serif)', fontWeight:300, fontSize: 26, marginTop: 12}}>Mark a book as next.</div>
        </div>
      )}

      {/* Stats strip */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:'1px solid #000'}}>
        {[['Read', counts.read], ['To read', counts.toRead], ['Nobel', counts.nobel], ['5★', counts.five]].map(([l,n], i) => (
          <div key={l} style={{
            padding:'16px 18px',
            borderRight: i % 2 === 0 ? '1px solid #000' : 'none',
            borderBottom: i < 2 ? '1px solid #000' : 'none',
          }}>
            <div style={{fontFamily:'var(--serif)', fontSize: 32, fontWeight: 300, lineHeight:0.95, letterSpacing:'-0.02em'}}>{n}</div>
            <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize:10, marginTop: 6, opacity:.8}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Favourites */}
      <div style={{padding:'22px 18px 14px', display:'flex', alignItems:'baseline', justifyContent:'space-between', borderBottom:'1px solid #000'}}>
        <div>
          <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.28em', fontSize: 9.5, marginBottom: 6}}>The Pantheon</div>
          <div style={{fontFamily:'var(--serif)', fontWeight: 300, fontSize: 32, lineHeight:1, letterSpacing:'-0.02em'}}>5 Stars</div>
        </div>
        <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize:10, opacity:.75}}>{counts.five} titles</div>
      </div>

      <div style={{
        display:'flex', gap: 14, overflowX:'auto', padding:'18px 18px 22px',
        scrollSnapType: 'x mandatory',
      }}>
        {favs.map(b => (
          <div key={b.id} onClick={() => openDetail(b)} style={{width: 130, flexShrink: 0, cursor:'pointer', scrollSnapAlign:'start'}}>
            <MCover book={b} w={130} h={195} />
            <div style={{fontFamily:'var(--serif)', fontSize: 15, lineHeight:1.15, marginTop: 8}}>{b.title}</div>
            <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.14em', fontSize: 9, opacity:.75, marginTop: 3}}>{fullName(b)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Shared list screen (To Read / Read) -----
function MListScreen({ kind, books, openDetail }) {
  const isRead = kind === 'read';
  const [q, setQ] = useStateI('');
  const [sortBy, setSortBy] = useStateI('surname');
  const [tagFilter, setTagFilter] = useStateI(null);
  const [langFilter, setLangFilter] = useStateI(null);
  const [onlyNobel, setOnlyNobel] = useStateI(false);
  const [showFilters, setShowFilters] = useStateI(false);
  const [letter, setLetter] = useStateI(null);
  const scrollRef = useRefI(null);

  const list = useMemoI(() => books.filter(b => b.list === kind), [books, kind]);

  const tagCounts = useMemoI(() => {
    const c = {}; list.forEach(b => b.tags.forEach(t => c[t] = (c[t]||0)+1)); return c;
  }, [list]);
  const langCounts = useMemoI(() => {
    const c = {}; list.forEach(b => { if (b.language) c[b.language] = (c[b.language]||0)+1; }); return c;
  }, [list]);

  const filtered = useMemoI(() => {
    let r = list;
    if (q) {
      const Q = q.toLowerCase();
      r = r.filter(b => (b.title||'').toLowerCase().includes(Q) || fullName(b).toLowerCase().includes(Q));
    }
    if (tagFilter)  r = r.filter(b => b.tags.includes(tagFilter));
    if (langFilter) r = r.filter(b => b.language === langFilter);
    if (onlyNobel)  r = r.filter(b => b.nobelPrize);
    if (sortBy === 'surname') r = sortBySurname(r);
    else if (sortBy === 'title')  r = [...r].sort((a,b) => (a.title||'').localeCompare(b.title||''));
    else if (sortBy === 'date')   r = [...r].sort((a,b) => (b.dateRead||'').localeCompare(a.dateRead||''));
    else if (sortBy === 'rating') r = [...r].sort((a,b) => (b.rating||0)-(a.rating||0));
    return r;
  }, [list, q, tagFilter, langFilter, onlyNobel, sortBy]);

  const lettersPresent = useMemoI(() => {
    const s = new Set();
    for (const b of list) {
      s.add(firstLetter(b.authorLast || b.authorFirst));
    }
    return s;
  }, [list]);
  const filteredLetterCounts = useMemoI(() => {
    const c = {};
    for (const b of filtered) {
      const k = firstLetter(b.authorLast || b.authorFirst);
      c[k] = (c[k]||0)+1;
    }
    return c;
  }, [filtered]);

  const grouped = sortBy === 'surname';
  const ALPHA_BAR = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

  const jumpTo = (L) => {
    const root = scrollRef.current;
    if (!root) return;
    const el = root.querySelector('[data-letter="' + L + '"]');
    if (el) {
      const top = el.offsetTop - 8;
      root.scrollTo({top, behavior: 'smooth'});
    }
  };

  let lastLetter = null;
  const rows = [];
  for (const b of filtered) {
    const L = firstLetter(b.authorLast || b.authorFirst);
    if (grouped && L !== lastLetter) {
      rows.push(<MLetterDivider key={'h-'+L} letter={L} count={filteredLetterCounts[L]||0} data-letter={L} />);
      lastLetter = L;
    }
    rows.push(<MBookRow key={b.id} book={b} onOpen={() => openDetail(b)} showRating={isRead} showDate={isRead} />);
  }

  return (
    <div ref={scrollRef} style={{height:'100%', overflow:'auto', position:'relative', paddingBottom: TAB_H + 8}}>
      <MobileTitleBar
        subtitle={isRead ? 'Finished' : 'Waiting'}
        title={isRead ? 'Read' : 'To Read'}
        trailing={
          <button onClick={() => setShowFilters(s => !s)} style={{
            border:'1px solid #000', background: showFilters ? '#000' : '#fff', color: showFilters ? '#fff' : '#000',
            padding:'3px 8px 2px',
            fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize: 10,
            cursor:'pointer',
          }}>Filter</button>
        }
      />

      {/* Search */}
      <div style={{padding:'10px 18px', borderBottom:'1px solid #000', background:'#fff'}}>
        <input type="search" placeholder="Search title or author…" value={q} onChange={e=>setQ(e.target.value)}
          style={{width:'100%', border:0, padding:'4px 0', fontFamily:'var(--body)', fontSize: 15, background:'transparent', outline:'none'}} />
      </div>

      {/* Sort */}
      <div style={{display:'flex', gap: 12, padding:'10px 18px', borderBottom:'1px solid #000', overflowX:'auto', background:'#fff'}}>
        <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.22em', fontSize:9.5, opacity:.55, alignSelf:'center', whiteSpace:'nowrap'}}>Sort</span>
        {(isRead
          ? [['surname','Surname'],['title','Title'],['date','Date'],['rating','Rating']]
          : [['surname','Surname'],['title','Title']]).map(([k,l]) => (
          <button key={k} onClick={() => setSortBy(k)} style={{
            fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize: 10.5,
            border: 0, background:'transparent',
            padding:'4px 0', cursor:'pointer', whiteSpace:'nowrap',
            borderBottom: sortBy===k ? '1px solid #000' : '1px solid transparent',
            fontWeight: sortBy===k ? 700 : 500,
          }}>{l}</button>
        ))}
      </div>

      {/* Filter chips (collapsible) */}
      {showFilters && (
        <div style={{display:'flex', gap: 6, padding:'12px 18px', borderBottom:'1px solid #000', flexWrap:'wrap', background:'#fff'}}>
          <button onClick={() => { setTagFilter(null); setOnlyNobel(false); setLangFilter(null); }}
            style={chipStyle(!tagFilter && !onlyNobel && !langFilter)}>All</button>
          <button onClick={() => setOnlyNobel(v=>!v)} style={chipStyle(onlyNobel)}>★ Nobel</button>
          {Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0,8).map(([t,n]) => (
            <button key={t} onClick={() => setTagFilter(tagFilter===t?null:t)} style={chipStyle(tagFilter===t)}>{t} <span style={{opacity:.5, marginLeft:3}}>{n}</span></button>
          ))}
          {Object.entries(langCounts).sort((a,b) => b[1]-a[1]).map(([l,n]) => (
            <button key={l} onClick={() => setLangFilter(langFilter===l?null:l)} style={chipStyle(langFilter===l)}>{LANG_SHORT[l]||l} <span style={{opacity:.5, marginLeft:3}}>{n}</span></button>
          ))}
        </div>
      )}

      {/* Alphabet jump bar */}
      {grouped && (
        <div style={{
          display:'flex', overflowX:'auto', padding:'6px 10px', borderBottom:'1px solid #000', background:'#fff', position:'sticky', top: 0, zIndex: 5, whiteSpace:'nowrap',
        }}>
          {ALPHA_BAR.map(L => (
            <button key={L} onClick={() => lettersPresent.has(L) && jumpTo(L)} disabled={!lettersPresent.has(L)}
              style={{
                fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.1em',
                fontSize: 11, padding:'4px 6px', border:0,
                background:'transparent', cursor: lettersPresent.has(L) ? 'pointer':'default',
                opacity: lettersPresent.has(L) ? 1 : 0.25,
                fontWeight: 600,
              }}>{L}</button>
          ))}
        </div>
      )}

      {/* List */}
      {rows.length > 0 ? rows : (
        <div style={{padding:'40px 18px', textAlign:'center'}}>
          <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize:11, opacity:.55}}>Nothing matches</div>
        </div>
      )}
    </div>
  );
}

function chipStyle(active) {
  return {
    fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.12em',
    fontSize: 10.5, padding:'4px 9px 3px',
    border:'1px solid #000',
    background: active ? '#000' : '#fff',
    color: active ? '#fff' : '#000',
    cursor:'pointer',
    whiteSpace:'nowrap',
  };
}

// ----- Authors screen -----
function MAuthorsScreen({ books, openDetail }) {
  const [openAuthor, setOpenAuthor] = useStateI(null);
  const [q, setQ] = useStateI('');
  const [letter, setLetter] = useStateI(null);
  const scrollRef = useRefI(null);

  const byAuthor = useMemoI(() => {
    const map = new Map();
    for (const b of books) {
      const k = fullName(b);
      if (!map.has(k)) map.set(k, { name: k, surname: b.authorLast || b.authorFirst || '?', books: [], nobel: false });
      const e = map.get(k); e.books.push(b); if (b.nobelPrize) e.nobel = true;
    }
    return [...map.values()].sort((a,b) => (a.surname||'').localeCompare(b.surname||''));
  }, [books]);

  const filtered = useMemoI(() => {
    let r = byAuthor;
    if (q) { const Q = q.toLowerCase(); r = r.filter(a => a.name.toLowerCase().includes(Q)); }
    return r;
  }, [byAuthor, q]);

  const letters = useMemoI(() => {
    const s = new Set();
    for (const a of byAuthor) {
      s.add(firstLetter(a.surname));
    }
    return s;
  }, [byAuthor]);

  const ALPHA_BAR = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

  const jumpTo = (L) => {
    const root = scrollRef.current; if (!root) return;
    const el = root.querySelector('[data-letter="' + L + '"]');
    if (el) root.scrollTo({top: el.offsetTop - 8, behavior:'smooth'});
  };

  // Group by letter
  let lastL = null;
  const rows = [];
  for (const a of filtered) {
    const L = firstLetter(a.surname);
    if (L !== lastL) {
      rows.push(<MLetterDivider key={'h-'+L} letter={L} count={0} data-letter={L} />);
      lastL = L;
    }
    rows.push(
      <div key={a.name} onClick={() => setOpenAuthor(a)} style={{
        display:'flex', justifyContent:'space-between', alignItems:'baseline',
        padding:'12px 18px', borderBottom:'1px solid #000', cursor:'pointer',
      }}>
        <div style={{fontFamily:'var(--serif)', fontSize: 17}}>{a.name} {a.nobel && <span style={{marginLeft:6, fontSize:13}}>★</span>}</div>
        <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize: 9.5, opacity:.6}}>{a.books.length}</div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} style={{height:'100%', overflow:'auto', position:'relative', paddingBottom: TAB_H + 8}}>
      <MobileTitleBar subtitle="Dramatis personæ" title="Authors" />

      <div style={{padding:'10px 18px', borderBottom:'1px solid #000'}}>
        <input type="search" placeholder="Search authors…" value={q} onChange={e=>setQ(e.target.value)}
          style={{width:'100%', border:0, padding:'4px 0', fontFamily:'var(--body)', fontSize: 15, background:'transparent', outline:'none'}} />
      </div>

      <div style={{
        display:'flex', overflowX:'auto', padding:'6px 10px', borderBottom:'1px solid #000', background:'#fff', position:'sticky', top: 0, zIndex: 5, whiteSpace:'nowrap',
      }}>
        {ALPHA_BAR.map(L => (
          <button key={L} onClick={() => letters.has(L) && jumpTo(L)} disabled={!letters.has(L)}
            style={{
              fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.1em',
              fontSize: 11, padding:'4px 6px', border:0, background:'transparent',
              cursor: letters.has(L) ? 'pointer':'default',
              opacity: letters.has(L) ? 1 : 0.25, fontWeight: 600,
            }}>{L}</button>
        ))}
      </div>

      {rows}

      {/* Author detail sheet */}
      {openAuthor && (
        <div style={{
          position:'absolute', inset: 0, background:'#fff', zIndex: 80,
          overflow:'auto',
        }}>
          <div style={{
            paddingTop: TOP_INSET + 6, paddingBottom: 14, paddingLeft: 18, paddingRight: 18,
            borderBottom:'1px solid #000',
            display:'flex', flexDirection:'column', gap: 6,
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <button onClick={() => setOpenAuthor(null)} style={{
                fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize: 10,
                background:'transparent', border:0, cursor:'pointer',
              }}>← Back</button>
              <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.22em', fontSize: 10}}>Author</span>
              <span style={{minWidth: 40}} />
            </div>
            <div style={{fontFamily:'var(--serif)', fontWeight:300, fontSize: 28, lineHeight:1.05, letterSpacing:'-0.015em'}}>
              {openAuthor.name}{openAuthor.nobel && <span style={{marginLeft:8, fontSize:18}}>★</span>}
            </div>
            <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.2em', fontSize: 10, opacity:.7}}>{openAuthor.books.length} {openAuthor.books.length===1?'book':'books'}</div>
          </div>
          {openAuthor.books.map(b => (
            <MBookRow key={b.id} book={b} onOpen={() => { setOpenAuthor(null); openDetail(b); }} showRating showDate />
          ))}
          <div style={{height: TAB_H + 20}} />
        </div>
      )}
    </div>
  );
}

// ----- Book detail sheet (full-screen modal inside phone) -----
function MBookDetail({ book, onClose, onSetNext }) {
  const { settings } = useStore();
  const [summary, setSummary] = useStateI(book.aiSummary || '');
  const [aiLoading, setAiLoading] = useStateI(false);
  const [aiErr, setAiErr] = useStateI('');
  const { updateBook } = useStore();

  const generateSummary = async () => {
    setAiLoading(true); setAiErr('');
    try {
      const prompt = `Give me a compelling, spoiler-light 150-word summary of the book "${book.title}" by ${fullName(book)}. Focus on themes, atmosphere, and why a reader might love it. Do not include a preamble — just the summary prose.`;
      let text = '';
      if (window.claude && window.claude.complete) {
        text = await window.claude.complete(prompt);
      } else if (settings.anthropicKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{'content-type':'application/json','x-api-key':settings.anthropicKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
          body: JSON.stringify({model:'claude-sonnet-4-20250514', max_tokens:400, messages:[{role:'user',content:prompt}]}),
        });
        const data = await res.json();
        text = data.content?.[0]?.text || '';
      } else throw new Error('No API access');
      setSummary(text);
      updateBook(book.id, { aiSummary: text });
    } catch(e) { setAiErr(e.message); }
    setAiLoading(false);
  };

  return (
    <div style={{position:'absolute', inset: 0, background:'#fff', zIndex: 100, overflow:'auto', paddingBottom: TAB_H + 20}}>
      <div style={{
        paddingTop: TOP_INSET + 6, paddingBottom: 14, paddingLeft: 18, paddingRight: 18,
        borderBottom:'1px solid #000',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <button onClick={onClose} style={{
          fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize: 10,
          background:'transparent', border:0, cursor:'pointer',
        }}>← Back</button>
        <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.22em', fontSize: 10}}>{book.list==='read'?'Read':'On the shelf'}</span>
        <span style={{minWidth: 40}} />
      </div>

      <div style={{padding:'20px 18px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap: 14, borderBottom:'1px solid #000'}}>
        <MCover book={book} w={180} h={270} />
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'var(--serif)', fontWeight:300, fontSize: 28, lineHeight:1.05, letterSpacing:'-0.015em', textWrap:'balance'}}>{book.title}</div>
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: 16, marginTop: 6}}>by {fullName(book)}</div>
        </div>
        <div style={{display:'flex', gap: 6, flexWrap:'wrap', justifyContent:'center'}}>
          {book.nobelPrize && <IPill>★ Nobel</IPill>}
          {book.language && <IPill solid>{LANG_SHORT[book.language]||book.language}</IPill>}
          {book.audiobook && <IPill>Audio</IPill>}
          {book.tags.map(t => <IPill key={t}>{t}</IPill>)}
        </div>
        {book.list === 'read' && (
          <div style={{display:'flex', gap: 18, alignItems:'baseline', marginTop: 4}}>
            <IStars value={book.rating || 0} size={18} />
            {book.dateRead && <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize: 10.5, opacity:.7}}>{yearRead(book.dateRead)}</span>}
          </div>
        )}
      </div>

      {book.notes && (
        <div style={{padding:'18px 18px', borderBottom:'1px solid #000'}}>
          <div style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.22em', fontSize: 10, opacity:.55, marginBottom: 8}}>Notes</div>
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: 16, lineHeight:1.45}}>"{book.notes}"</div>
        </div>
      )}

      <div style={{padding:'18px 18px', display:'flex', flexDirection:'column', gap: 10}}>
        {book.list === 'to-read' && !book.toReadNext && (
          <button onClick={() => onSetNext(book.id)} style={primaryBtnStyle()}>★ Set as Next</button>
        )}
        <button onClick={generateSummary} disabled={aiLoading} style={secondaryBtnStyle()}>
          {aiLoading ? 'Generating…' : (summary ? 'Regenerate Summary' : 'Generate Summary')}
        </button>
      </div>

      {(summary || aiLoading || aiErr) && (
        <div style={{margin:'8px 18px 18px', border:'1px solid #000', padding:'14px 16px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', borderBottom:'1px solid #000', paddingBottom: 8, marginBottom: 10}}>
            <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.22em', fontSize: 10.5}}>AI Summary</span>
            <span style={{fontFamily:'var(--caps)', fontSize: 9, opacity:.5, letterSpacing:'0.16em'}}>Claude</span>
          </div>
          <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize: 15.5, lineHeight:1.45}}>
            {summary || (aiLoading ? 'Thinking…' : '')}
            {aiErr && !summary && <span style={{fontStyle:'normal', fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize: 10}}>{aiErr}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function primaryBtnStyle() {
  return {
    width:'100%', padding:'12px 14px', cursor:'pointer',
    background:'#000', color:'#fff', border:'1px solid #000',
    fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em',
    fontSize: 11, fontWeight: 600,
  };
}
function secondaryBtnStyle() {
  return {
    width:'100%', padding:'12px 14px', cursor:'pointer',
    background:'#fff', color:'#000', border:'1px solid #000',
    fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em',
    fontSize: 11, fontWeight: 600,
  };
}

// ----- Main iOS app shell -----
function IOSAppInner() {
  const [tab, setTab] = useStateI('home');
  const [detail, setDetail] = useStateI(null);
  const [edit, setEdit] = useStateI(null);
  const { books, setNext } = useStore();

  // Re-resolve live detail
  const liveDetail = useMemoI(() => detail ? books.find(b => b.id === detail.id) : null, [books, detail]);
  const liveEdit   = useMemoI(() => edit   ? books.find(b => b.id === edit.id)   : null, [books, edit]);

  const openDetail = (b) => setDetail(b);
  const onClose = () => setDetail(null);

  return (
    <div style={{width:'100%', height:'100%', position:'relative', background:'#fff', overflow:'hidden'}}>
      {tab === 'home'    && <div style={{height:'100%', overflow:'auto'}}><MHome books={books} openDetail={openDetail} navigateTo={setTab} /></div>}
      {tab === 'to-read' && <MListScreen kind="to-read" books={books} openDetail={openDetail} />}
      {tab === 'read'    && <MListScreen kind="read"    books={books} openDetail={openDetail} />}
      {tab === 'authors' && <MAuthorsScreen books={books} openDetail={openDetail} />}

      {liveDetail && (
        <MBookDetail
          book={liveDetail}
          onClose={onClose}
          onSetNext={(id) => { setNext(id); }}
        />
      )}

      <TabBar active={tab} onChange={(k) => { setDetail(null); setTab(k); }} />
    </div>
  );
}

// ----- Top-level: scale the phone to fit viewport -----
function IOSAppRoot() {
  const [scale, setScale] = useStateI(1);
  useEffectI(() => {
    const recompute = () => {
      const pad = 24;
      const sw = (window.innerWidth - pad*2) / PHONE_W;
      const sh = (window.innerHeight - pad*2) / PHONE_H;
      setScale(Math.min(1, sw, sh));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  return (
    <div style={{
      minHeight:'100vh', width:'100%',
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'#e8e6df',
      padding: 24, boxSizing: 'border-box',
    }}>
      <div style={{
        width: PHONE_W * scale, height: PHONE_H * scale,
        position:'relative',
      }}>
        <div style={{
          width: PHONE_W, height: PHONE_H,
          transform: `scale(${scale})`, transformOrigin: 'top left',
        }}>
          <IOSDevice width={PHONE_W} height={PHONE_H}>
            <IOSAppInner />
          </IOSDevice>
        </div>
      </div>
    </div>
  );
}

const iosRoot = ReactDOM.createRoot(document.getElementById('root'));
iosRoot.render(
  <StoreProvider>
    <IOSAppRoot />
  </StoreProvider>
);
