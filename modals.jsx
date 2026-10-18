// modals.jsx — Add/Edit drawer, Detail view, Settings, Import
const { useState: useStateM, useEffect: useEffectM, useMemo: useMemoM, useRef: useRefM, useCallback: useCallbackM } = React;

// Format an ISO date (YYYY-MM-DD) into a short editorial string like "23 May 2026"
function formatLentDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
window.formatLentDate = formatLentDate;

// -------- Tiny inline input to add a custom tag to a book --------
function NewTagInput({ existing, onAdd }) {
  const [open, setOpen] = useStateM(false);
  const [val, setVal] = useStateM('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (open && ref.current) ref.current.focus();
  }, [open]);
  const commit = () => {
    const trimmed = val.trim();
    if (!trimmed) { setOpen(false); return; }
    // Normalise to title-case, dedupe
    const norm = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!existing.includes(norm)) onAdd(norm);
    setVal('');
    setOpen(false);
  };
  if (!open) {
    return (
      <button type="button" className="filter-chip tag-add" onClick={() => setOpen(true)} title="Add a custom tag">
        + Add tag
      </button>
    );
  }
  return (
    <input
      ref={ref}
      type="text"
      className="tag-input"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { setVal(''); setOpen(false); }
      }}
      placeholder="New tag…"
      maxLength={24}
    />
  );
}

// -------- Fields shared by the Edit drawer and the Mark-as-Read form --------
function FormatPicker({ value, onChange }) {
  return (
    <div className="tag-picker">
      {FORMATS.map(f => (
        <button key={f.id} type="button"
          className={"filter-chip " + (value.includes(f.id) ? 'active' : '')}
          onClick={() => onChange(value.includes(f.id) ? value.filter(x => x !== f.id) : [...value, f.id])}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

function YearReadInput({ value, onChange }) {
  return (
    <input
      type="number"
      min="1900"
      max={new Date().getFullYear() + 1}
      step="1"
      value={yearRead(value)}
      onChange={e => {
        const v = e.target.value;
        // Cap at 4 digits — input type="number" lets users type more
        if (v.length > 4) return;
        onChange(v);
      }}
      placeholder="e.g. 2024" />
  );
}

function LanguageSelect({ value, onChange }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">—</option>
      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
    </select>
  );
}

// -------- Add / Edit drawer --------
function BookForm({ book, onClose, onSaved, onOpenImport }) {
  const { addBook, updateBook, removeBook, setNext, books } = useStore();
  const isNew = !book || !book.id;

  const exportLibrary = () => {
    const data = JSON.stringify(books, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'read-before-you-die-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  };
  const [draft, setDraft] = useStateM(book || {
    title: '', authorFirst: '', authorLast: '',
    list: 'to-read', tags: [], nobelPrize: false,
    dateRead: '', rating: null, notes: '', language: '',
    audiobook: false, formats: [], lent: false, lentTo: '', lentOn: '',
    coverUrl: '',
  });
  const [searchQ, setSearchQ] = useStateM('');
  const [results, setResults] = useStateM([]);
  const [searching, setSearching] = useStateM(false);
  const [searchErr, setSearchErr] = useStateM('');

  const upd = (patch) => setDraft(d => ({ ...d, ...patch }));

  const runSearch = useCallbackM(async (q) => {
    setSearching(true);
    setSearchErr('');
    try {
      const r = await openLibrarySearch(q);
      setResults(r);
    } catch(e) {
      setSearchErr('Search failed. Try manual entry below.');
      setResults([]);
    }
    setSearching(false);
  }, []);

  const pickResult = (r) => {
    upd({
      title: r.title,
      authorFirst: r.authorFirst || '',
      authorLast: r.authorLast || '',
      coverUrl: r.coverUrlLarge || r.coverUrl || '',
    });
    setResults([]);
    setSearchQ('');
  };

  const save = () => {
    if (!draft.title.trim()) return;
    let savedId;
    if (isNew) savedId = addBook(draft);
    else { updateBook(draft.id, draft); savedId = draft.id; }
    if (onSaved) onSaved(savedId);
    onClose();
  };
  const del = () => {
    // Removal triggers a toast with Undo via the store; no confirm() dialog needed.
    removeBook(draft.id);
    onClose();
  };

  return (
    <div className="drawer" role="dialog">
      <div className="drawer-head">
        <div className="caps drawer-eyebrow">{isNew ? 'Add book' : 'Edit book'}</div>
        <CloseX onClick={onClose} />
      </div>

      <div className="drawer-body">
      {isNew && (
        <div style={{marginBottom: 28}}>
          <label className="label" style={{marginBottom:8}}>Search Open Library</label>
          <div style={{display:'flex', gap:12, alignItems:'flex-end'}}>
            <input
              type="search"
              placeholder="e.g. The Magic Mountain"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(searchQ); }} />
            <button className="btn" onClick={() => runSearch(searchQ)} disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {searchErr && <div className="hint" style={{marginTop:10}}>{searchErr}</div>}
          {results.length > 0 && (
            <div style={{marginTop: 16, maxHeight: 280, overflow:'auto', border:'1px solid #000'}}>
              {results.map((r, i) => (
                <div key={i} style={{display:'grid', gridTemplateColumns:'48px 1fr auto', gap:14, padding:'10px 12px', borderBottom: i===results.length-1?'none':'1px solid #000', alignItems:'center'}}>
                  <div style={{width:48, height:64}}>
                    <Cover book={{title:r.title, authorLast:r.authorLast, authorFirst:r.authorFirst, coverUrl:r.coverUrl}} />
                  </div>
                  <div>
                    <div className="serif" style={{fontSize: 17, lineHeight:1.15}}>{r.title}</div>
                    <div className="caps" style={{fontSize:10.5, opacity:.8, marginTop:4}}>{r.fullAuthor || ''} {r.year ? '· ' + r.year : ''}</div>
                  </div>
                  <button className="btn tiny" onClick={() => pickResult(r)}>Use</button>
                </div>
              ))}
            </div>
          )}
          <div style={{margin: '24px 0 4px', display:'flex', alignItems:'center', gap:14}}>
            <span style={{flex:1, height:1, background:'#000', opacity:.4}} />
            <span className="caps" style={{fontSize:10.5, letterSpacing:'0.22em', opacity:.65}}>or add manually</span>
            <span style={{flex:1, height:1, background:'#000', opacity:.4}} />
          </div>
          {onOpenImport && (
            <div style={{display:'flex', justifyContent:'center', gap: 10, marginTop: 16, flexWrap:'wrap'}}>
              <button type="button" className="btn tiny" onClick={onOpenImport}>↑ Bulk import from JSON</button>
              <button type="button" className="btn tiny" onClick={exportLibrary}>↓ Export library</button>
            </div>
          )}
        </div>
      )}

      <div className="form-grid">
        <label className="full">
          <span>Title</span>
          <input type="text" value={draft.title} onChange={e => upd({title: e.target.value})} />
        </label>
        <label>
          <span>Author — first name</span>
          <input type="text" value={draft.authorFirst} onChange={e => upd({authorFirst: e.target.value})} />
        </label>
        <label>
          <span>Author — surname</span>
          <input type="text" value={draft.authorLast} onChange={e => upd({authorLast: e.target.value})} />
        </label>
        <label className="full">
          <span>Cover image URL <em className="hint" style={{marginLeft:8}}>optional</em></span>
          <input type="text" value={draft.coverUrl} onChange={e => upd({coverUrl: e.target.value})} placeholder="https://covers.openlibrary.org/…" />
        </label>
        <label className="full">
          <span>Tags</span>
          <div className="tag-picker">
            {Array.from(new Set([...TAGS, ...draft.tags])).map(t => (
              <button key={t} type="button"
                className={"filter-chip " + (draft.tags.includes(t)?'active':'')}
                onClick={() => upd({tags: draft.tags.includes(t) ? draft.tags.filter(x=>x!==t) : [...draft.tags, t]})}>
                {t}
              </button>
            ))}
            <NewTagInput
              existing={draft.tags}
              onAdd={(t) => upd({ tags: [...draft.tags, t] })}
            />
          </div>
        </label>
        <label className="full">
          <span>Flags</span>
          <div className="checkrow">
            <label>
              <input type="checkbox" checked={draft.nobelPrize} onChange={e => upd({nobelPrize: e.target.checked})} />
              <span>Nobel laureate</span>
            </label>
            <label>
              <input type="checkbox" checked={draft.lent} onChange={e => {
                const checked = e.target.checked;
                upd({
                  lent: checked,
                  // Pre-fill today's date when first toggled on
                  lentOn: checked ? (draft.lentOn || new Date().toISOString().slice(0,10)) : '',
                });
              }} />
              <span>Lent</span>
            </label>
          </div>
        </label>
        {draft.lent && (
          <>
            <label>
              <span>Lent to</span>
              <input type="text" value={draft.lentTo} onChange={e => upd({lentTo: e.target.value})} placeholder="Name" />
            </label>
            <label>
              <span>Lent on</span>
              <input type="date" value={draft.lentOn} onChange={e => upd({lentOn: e.target.value})} />
            </label>
          </>
        )}

        <label className="full">
          <span>Format</span>
          <FormatPicker value={bookFormats(draft)}
            onChange={(formats) => upd({ formats, audiobook: formats.includes('audiobook') })} />
        </label>

        {draft.list === 'read' && (
          <>
            <label>
              <span>Year read</span>
              <YearReadInput value={draft.dateRead} onChange={(v) => upd({ dateRead: v })} />
            </label>
            <label>
              <span>Language</span>
              <LanguageSelect value={draft.language} onChange={(v) => upd({ language: v })} />
            </label>
            <label className="full">
              <span>Rating</span>
              <Stars value={draft.rating || 0} onChange={(v) => upd({rating: v || null})} size={24} />
            </label>
            <label className="full">
              <span>Notes</span>
              <textarea rows={4} value={draft.notes} onChange={e => upd({notes: e.target.value})} placeholder="What did you think?" />
            </label>
          </>
        )}
      </div>
      </div>

      <div className="drawer-foot">
        <div style={{display:'flex', gap:8}}>
          {!isNew && <button className="btn" onClick={del}>Delete</button>}
          {!isNew && draft.list==='to-read' && !draft.toReadNext && (
            <button className="btn" onClick={() => { setNext(draft.id); onClose(); }}>★ Set as Next</button>
          )}
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn solid" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

// -------- Mark-as-Read celebration sub-modal --------
function MarkAsReadCelebration({ book, onClose, onConfirm }) {
  const [rating, setRating] = useStateM(book.rating || 0);
  const [notes, setNotes] = useStateM(book.notes || '');
  const [formats, setFormats] = useStateM(bookFormats(book));
  const [year, setYear] = useStateM(yearRead(book.dateRead) || String(new Date().getFullYear()));
  const [language, setLanguage] = useStateM(book.language || '');
  const [stage, setStage] = useStateM('celebrate'); // 'celebrate' → 'form'

  React.useEffect(() => {
    const t = setTimeout(() => setStage('form'), 1500);
    return () => clearTimeout(t);
  }, []);

  // Esc key = cancel (consistent with native form behavior)
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    onConfirm({ rating: rating || null, notes, formats, language,
                dateRead: year || String(new Date().getFullYear()) });
    onClose();
  };

  return (
    <div className="celebrate-scrim" onClick={onClose}>
      <div className="celebrate-card" onClick={e => e.stopPropagation()}>
        <button className="celebrate-close" onClick={onClose} aria-label="Cancel" title="Cancel">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <line x1="3" y1="3" x2="11" y2="11" />
            <line x1="11" y1="3" x2="3" y2="11" />
          </svg>
        </button>
        {stage === 'celebrate' ? (
          <div className="celebrate-stage">
            <div className="confetti">
              {Array.from({length: 14}).map((_, i) => (
                <span key={i} className={"dot d" + i} />
              ))}
            </div>
            <svg className="check-draw" viewBox="0 0 100 100" width="120" height="120">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#000" strokeWidth="1.5" className="check-ring" />
              <path d="M 30 52 L 45 67 L 72 38" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="check-mark" />
            </svg>
            <div className="celebrate-title serif">Onto the shelf.</div>
            <div className="celebrate-sub">{book.title}</div>
          </div>
        ) : (
          <div className="celebrate-form">
            <div className="caps" style={{fontSize:11, letterSpacing:'0.28em', opacity:.6, marginBottom: 6}}>How was it?</div>
            <h3 className="serif" style={{fontSize:36, fontWeight:300, lineHeight:1.05, letterSpacing:'-0.01em', marginBottom: 6}}>{book.title}</h3>
            <div className="serif" style={{fontStyle:'italic', fontSize:18, opacity:.7, marginBottom: 26}}>{fullName(book)}</div>

            <div className="form-grid celebrate-fields">
              <label className="full">
                <span>Format</span>
                <FormatPicker value={formats} onChange={setFormats} />
              </label>
              <label>
                <span>Year read</span>
                <YearReadInput value={year} onChange={setYear} />
              </label>
              <label>
                <span>Language</span>
                <LanguageSelect value={language} onChange={setLanguage} />
              </label>
            </div>

            <div className="celebrate-rating">
              <Stars value={rating} onChange={setRating} size={32} />
              <div className="caps" style={{fontSize:10.5, letterSpacing:'0.22em', opacity:.5, marginTop: 6}}>
                {rating ? `${rating} of 5` : 'Tap a star'}
              </div>
            </div>

            <label className="full" style={{marginTop: 22}}>
              <span style={{fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.18em', fontSize: 11, opacity:.65, display:'block', marginBottom: 8}}>A thought (optional)</span>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What stayed with you?" />
            </label>

            <div className="celebrate-actions">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn solid" onClick={save}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------- Book detail view (AI summary + YouTube) --------
function BookDetail({ book, onClose, onEdit }) {
  const { updateBook, setNext, markAsRead, unmarkAsRead } = useStore();
  const { settings } = useStore();
  const [summary, setSummary] = useStateM(book.aiSummary || '');
  const [aiLoading, setAiLoading] = useStateM(false);
  const [aiErr, setAiErr] = useStateM('');
  const [yt, setYt] = useStateM(book.ytResult || null);
  const [ytLoading, setYtLoading] = useStateM(false);
  const [ytErr, setYtErr] = useStateM('');
  const [showCelebrate, setShowCelebrate] = useStateM(false);

  const generateSummary = async () => {
    setAiLoading(true); setAiErr('');
    try {
      const prompt = `Give me a compelling, spoiler-light 150-word summary of the book "${book.title}" by ${fullName(book)}. Focus on themes, atmosphere, and why a reader might love it. Do not include a preamble — just the summary prose.`;
      let text = '';
      // Prefer hosted Anthropic via window.claude.complete (no key required)
      if (window.claude && window.claude.complete) {
        text = await window.claude.complete(prompt);
      } else if (settings.anthropicKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': settings.anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await res.json();
        text = (data.content && data.content[0] && data.content[0].text) || '';
      } else {
        throw new Error('No API access — add an Anthropic key in Settings.');
      }
      setSummary(text);
      updateBook(book.id, { aiSummary: text });
    } catch(e) {
      setAiErr(e.message || 'Could not generate summary.');
    }
    setAiLoading(false);
  };

  const findVideo = async () => {
    setYtLoading(true); setYtErr('');
    try {
      if (!settings.youtubeKey) throw new Error('Add a YouTube API key in Settings to enable video search.');
      const q = encodeURIComponent(`${book.title} ${fullName(book)} book summary`);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&type=video&q=${q}&key=${settings.youtubeKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const item = data.items && data.items[0];
      if (!item) { setYt(null); setYtErr('No video summary found.'); }
      else {
        const result = {
          videoId: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumb: item.snippet.thumbnails.medium.url,
        };
        setYt(result);
        updateBook(book.id, { ytResult: result });
      }
    } catch(e) {
      setYtErr(e.message);
    }
    setYtLoading(false);
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" style={{maxWidth: 920}} onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{marginBottom: 28}}>
          <div className="caps" style={{fontSize:11, letterSpacing:'0.22em'}}>{book.list === 'read' ? 'Read' : 'On the shelf'}</div>
          <CloseX onClick={onClose} />
        </div>
        <div className="detail-grid">
          <Cover book={book} />
          <div className="detail-meta">
            <h2 className="serif">{book.title}</h2>
            <div className="by">by {fullName(book)}</div>
            <div className="row-meta">
              {book.nobelPrize && <NobelPill />}
              {book.language && <Pill solid>{LANG_SHORT[book.language] || book.language}</Pill>}
              {book.audiobook && <Pill><AudioGlyph /> Audio</Pill>}
              {book.lent && <Pill dim>Lent to {book.lentTo || '—'}{book.lentOn ? ` · ${formatLentDate(book.lentOn)}` : ''}</Pill>}
              {book.tags.map(t => <Pill key={t}>{t}</Pill>)}
            </div>
            {book.list === 'read' && book.rating != null && (
              <div style={{marginTop:18}}>
                <Stars value={book.rating || 0} size={22} />
              </div>
            )}
            {book.notes && <div className="notes">"{book.notes}"</div>}
            <div className="detail-actions primary">
              {book.list === 'to-read' && (
                <button className="btn solid mark-read-btn" onClick={() => setShowCelebrate(true)}>
                  <span className="mr-check">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7.5 L6 10.5 L11 4.5" />
                    </svg>
                  </span>
                  Mark as read
                </button>
              )}
              {book.list === 'read' && (
                <div className="read-status">
                  <span className="rs-tick">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7.5 L6 10.5 L11 4.5" />
                    </svg>
                  </span>
                  <span className="rs-label">Read{book.dateRead ? ` in ${yearRead(book.dateRead)}` : ''}</span>
                  <button className="rs-undo" onClick={() => unmarkAsRead(book.id)} title="Move back to To Read">Move back to To Read</button>
                </div>
              )}
              {book.list === 'to-read' && !book.toReadNext && (
                <button className="btn" onClick={() => setNext(book.id)}>★ Set as Next</button>
              )}
            </div>
            <div className="detail-actions secondary">
              <button className="btn" onClick={onEdit}>Edit</button>
              <button className="btn" onClick={generateSummary} disabled={aiLoading}>
                {aiLoading ? 'Generating…' : (summary ? 'Regenerate Summary' : 'Generate Summary')}
              </button>
              <button className="btn" onClick={findVideo} disabled={ytLoading}>
                {ytLoading ? 'Searching…' : 'Find Video Summary'}
              </button>
            </div>
          </div>
        </div>

        {(summary || aiLoading || aiErr) && (
          <div className={"ai-panel " + (aiLoading ? 'loading':'')}>
            <div className="head">
              <span className="l">AI Summary</span>
              <span className="caps" style={{fontSize:10, opacity:.55}}>Claude · ~150 words</span>
            </div>
            <div className="body">
              {summary || (aiLoading ? 'Thinking' : '')}
              {aiErr && !summary && <span style={{opacity:.7, fontStyle:'normal', fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize:11}}>{aiErr}</span>}
            </div>
          </div>
        )}

        {ytErr && !yt && (
          <div className="ai-panel">
            <div className="head"><span className="l">Video Summary</span></div>
            <div className="body" style={{fontStyle:'normal', fontFamily:'var(--caps)', textTransform:'uppercase', letterSpacing:'0.16em', fontSize:12}}>{ytErr}</div>
          </div>
        )}

        {yt && (
          <div className="ai-panel">
            <div className="head"><span className="l">Video Summary</span></div>
            <div className="yt-card">
              <img src={yt.thumb} alt="" />
              <div>
                <div className="yt-title">{yt.title}</div>
                <div className="yt-ch">{yt.channel}</div>
                <div className="yt-link">
                  <a className="btn tiny" href={`https://www.youtube.com/watch?v=${yt.videoId}`} target="_blank" rel="noreferrer">Watch on YouTube ↗</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showCelebrate && (
        <MarkAsReadCelebration
          book={book}
          onClose={() => setShowCelebrate(false)}
          onConfirm={(fields) => markAsRead(book.id, fields)}
        />
      )}
    </div>
  );
}

// -------- Settings modal --------
function SettingsModal({ onClose }) {
  const { settings, setSettings, resetSeed, books, bulkAdd } = useStore();
  const [draft, setDraft] = useStateM({ ...settings });

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" style={{maxWidth: 640}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="caps" style={{fontSize:11, letterSpacing:'0.22em', marginBottom: 8}}>Settings</div>
            <h3>The back office</h3>
          </div>
          <CloseX onClick={onClose} />
        </div>

        <div style={{display:'flex', flexDirection:'column', gap: 22}}>
          <div>
            <label className="label">Anthropic API key</label>
            <input type="password" value={draft.anthropicKey || ''} onChange={e => setDraft({...draft, anthropicKey: e.target.value})} placeholder="sk-ant-…" />
            <div className="hint" style={{marginTop:6}}>Optional — AI summaries work without a key when this app is hosted.</div>
          </div>

          <div>
            <label className="label">YouTube Data API key</label>
            <input type="password" value={draft.youtubeKey || ''} onChange={e => setDraft({...draft, youtubeKey: e.target.value})} placeholder="AIza…" />
            <div className="hint" style={{marginTop:6}}>Needed for "Find Video Summary". Get one at console.cloud.google.com.</div>
          </div>

          <div style={{borderTop:'1px solid #000', paddingTop:18}}>
            <label className="label">Library</label>
            <div style={{display:'flex', gap: 10, marginTop: 8, flexWrap:'wrap'}}>
              <button className="btn" onClick={() => {
                const data = JSON.stringify(books, null, 2);
                const blob = new Blob([data], {type:'application/json'});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'read-before-you-die-' + new Date().toISOString().slice(0,10) + '.json';
                a.click();
              }}>Export JSON</button>
              <button className="btn" onClick={() => {
                if (confirm('Reset to seed data? Your current library will be replaced.')) {
                  resetSeed();
                  onClose();
                }
              }}>Reset to seed</button>
              <button className="btn" onClick={() => {
                if (confirm('Erase ALL books? This cannot be undone.')) {
                  localStorage.removeItem(STORAGE_KEY);
                  location.reload();
                }
              }}>Erase library</button>
            </div>
          </div>
        </div>

        <div style={{display:'flex', gap:10, marginTop: 28, justifyContent:'flex-end'}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn solid" onClick={() => { setSettings(draft); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// -------- Import modal --------
const SAMPLE_IMPORT = JSON.stringify([
  {
    "title": "The Magic Mountain",
    "authorFirst": "Thomas",
    "authorLast": "Mann",
    "list": "to-read",
    "tags": ["Fiction"],
    "nobelPrize": true,
    "coverUrl": ""
  },
  {
    "title": "Beloved",
    "authorFirst": "Toni",
    "authorLast": "Morrison",
    "list": "read",
    "tags": ["Fiction"],
    "nobelPrize": true,
    "dateRead": "2024-03-12",
    "rating": 5,
    "notes": "Wrecked me. Read again in five years.",
    "language": "English"
  }
], null, 2);

function ImportModal({ onClose }) {
  const { bulkAdd, setBooks } = useStore();
  const [text, setText] = useStateM('');
  const [mode, setMode] = useStateM('replace');
  const [err, setErr] = useStateM('');
  const doImport = () => {
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('Must be a JSON array');
      if (mode === 'replace') {
        setBooks(arr);
      } else {
        bulkAdd(arr);
      }
      if (window.__rbydShowToast) {
        window.__rbydShowToast(`Imported ${arr.length} ${arr.length === 1 ? 'book' : 'books'}`);
      }
      onClose();
    } catch(e) {
      setErr(e.message);
    }
  };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="caps" style={{fontSize:11, letterSpacing:'0.22em', marginBottom:8}}>Bulk import</div>
            <h3>Paste your library</h3>
          </div>
          <CloseX onClick={onClose} />
        </div>
        <div className="hint" style={{marginBottom:12}}>Expected: JSON array of book objects. Click "Use template" to copy the schema.</div>
        <div style={{display:'flex', gap:10, marginBottom: 14, alignItems:'center', flexWrap:'wrap'}}>
          <span className="caps" style={{fontSize:10.5, letterSpacing:'0.22em', opacity:.55}}>Mode</span>
          <div className="seg-toggle">
            <button type="button" className={"seg-btn " + (mode==='replace'?'active':'')} onClick={() => setMode('replace')}>Replace</button>
            <button type="button" className={"seg-btn " + (mode==='append'?'active':'')} onClick={() => setMode('append')}>Append</button>
          </div>
          <span className="hint" style={{flexBasis:'100%', fontSize:10}}>
            {mode==='replace' ? 'Wipes current library, restores from file.' : 'Adds books from file to current library (may create duplicates).'}
          </span>
        </div>
        <div style={{display:'flex', gap:10, marginBottom: 14}}>
          <button className="btn tiny" onClick={() => setText(SAMPLE_IMPORT)}>Use template</button>
          <button className="btn tiny" onClick={() => setText('')}>Clear</button>
        </div>
        <textarea rows={16} value={text} onChange={e => { setText(e.target.value); setErr(''); }} placeholder='[{"title":"…","authorFirst":"…","authorLast":"…","list":"to-read"}]' style={{fontFamily:'ui-monospace, Menlo, monospace', fontSize: 13}} />
        {err && <div className="hint" style={{marginTop:10, color:'#000'}}>⚠ {err}</div>}
        <div style={{display:'flex', gap:10, marginTop:18, justifyContent:'flex-end'}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn solid" onClick={doImport}>Import</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BookForm, BookDetail, SettingsModal, ImportModal });
