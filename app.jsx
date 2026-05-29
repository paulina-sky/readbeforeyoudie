// app.jsx — top-level
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useRef: useRefA } = React;

// ---------- Sidebar ----------
const SIDEBAR_KEY = 'rbyd:sidebar:expanded';

function Sidebar({ page, setPage, openAdd }) {
  const [expanded, setExpanded] = useStateA(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_KEY);
      // default to expanded if user has never set it
      return v === null ? true : v === '1';
    } catch (e) {return true;}
  });

  useEffectA(() => {
    try {localStorage.setItem(SIDEBAR_KEY, expanded ? '1' : '0');} catch (e) {}
  }, [expanded]);

  const navItems = [
  ['home', 'Home'],
  ['to-read', 'To Read'],
  ['read', 'Read'],
  ['authors', 'Authors'],
  ['lent', 'Lent']];


  return (
    <aside
      className={"sidebar " + (expanded ? 'expanded' : 'collapsed')}
      data-screen-label="sidebar">
      
      <div className="sb-inner">
        {/* Toggle handle — always visible */}
        <button
          className="sb-toggle"
          onClick={() => setExpanded((s) => !s)}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={expanded ? 'Collapse' : 'Expand'}>
          
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            {expanded ?
            <path d="M10 4 L6 8 L10 12" /> :
            <path d="M6 4 L10 8 L6 12" />}
          </svg>
        </button>

        {/* Expanded content — only visible when expanded */}
        <div className="sb-content">
          {/* Logo */}
          <div className="sb-brand" onClick={() => setPage('home')}>
            <img src="logo.png" alt="Read before you die" className="sb-logo" />
          </div>

          <div className="sb-divider" />

          {/* Nav items */}
          <nav className="sb-nav">
            {navItems.map(([k, l]) =>
            <a
              key={k}
              href={"#" + k}
              className={"sb-nav-item " + (page === k ? 'active' : '')}
              onClick={(e) => {e.preventDefault();setPage(k);}}>
              
                <span className="sb-nav-label">{l}</span>
              </a>
            )}
          </nav>

          <div className="sb-divider" />

          {/* +Add Book CTA */}
          <button className="sb-add" onClick={openAdd}>
            ＋ Add Book
          </button>

          {/* Future: account info goes here */}
        </div>
      </div>
    </aside>);

}

function App() {
  const { showToast } = useToast();
  const { addBook, removeBook, books, updateBook, setBooks } = useStore();
  const [page, setPage] = useStateA(() => {
    const h = location.hash.replace('#', '');
    return ['home', 'to-read', 'read', 'authors', 'lent'].includes(h) ? h : 'home';
  });
  const [detailBook, setDetailBook] = useStateA(null);
  const [editBook, setEditBook] = useStateA(null);
  const [showAdd, setShowAdd] = useStateA(false);
  const [pendingAddCb, setPendingAddCb] = useStateA(null);
  const [showSettings, setShowSettings] = useStateA(false);
  const [showImport, setShowImport] = useStateA(false);

  useEffectA(() => {
    location.hash = page;
  }, [page]);

  useEffectA(() => {window.__rbydLatestBooks = books;}, [books]);
  useEffectA(() => {window.__rbydShowToast = showToast;}, [showToast]);

  useEffectA(() => {
    const onHash = () => {
      const h = location.hash.replace('#', '');
      if (['home', 'to-read', 'read', 'authors', 'lent'].includes(h)) setPage(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Body scroll lock when modal open
  useEffectA(() => {
    const open = detailBook || editBook || showAdd || showSettings || showImport;
    document.body.style.overflow = open ? 'hidden' : '';
  }, [detailBook, editBook, showAdd, showSettings, showImport]);

  const openDetail = (b) => setDetailBook(b);
  const openEdit = (b) => {setDetailBook(null);setEditBook(b);};
  const openAdd = (opts = {}) => {
    // Wrap the optional onSaved to also fire a toast
    const customOnSaved = opts && typeof opts.onSaved === 'function' ? opts.onSaved : null;
    setPendingAddCb(() => (id) => {
      if (customOnSaved) customOnSaved(id);
      const b = (window.__rbydLatestBooks || []).find((x) => x.id === id);
      const title = b ? b.title : 'New book';
      showToast(<><span>Added to To Read · </span><span className="toast-em">{title}</span></>, {
        action: { label: 'Open', onClick: () => {location.hash = 'to-read';} }
      });
    });
    setShowAdd(true);
  };

  // Re-sync detail book whenever store updates (books already destructured above)
  const liveDetail = useMemoA(() => detailBook ? books.find((b) => b.id === detailBook.id) : null, [books, detailBook]);
  const liveEdit = useMemoA(() => editBook ? books.find((b) => b.id === editBook.id) : null, [books, editBook]);

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={setPage}
        openAdd={() => openAdd()} />
      

      <main data-screen-label={page}>
        {page === 'home' && <HomePage openDetail={openDetail} openEdit={openEdit} openAdd={openAdd} />}
        {page === 'to-read' && <ToReadPage openDetail={openDetail} openEdit={openEdit} openAdd={openAdd} openImport={() => setShowImport(true)} />}
        {page === 'read' && <ReadPage openDetail={openDetail} openEdit={openEdit} openAdd={openAdd} />}
        {page === 'authors' && <AuthorsPage openDetail={openDetail} />}
        {page === 'lent' && <LentPage openDetail={openDetail} openEdit={openEdit} />}
      </main>

      {liveDetail && <BookDetail book={liveDetail} onClose={() => setDetailBook(null)} onEdit={() => openEdit(liveDetail)} />}
      {liveEdit && <div className="scrim" onClick={() => setEditBook(null)}>
        <div onClick={(e) => e.stopPropagation()}>
          <BookForm book={liveEdit} onClose={() => setEditBook(null)} />
        </div>
      </div>}
      {showAdd && <div className="scrim" onClick={() => {setShowAdd(false);setPendingAddCb(null);}}>
        <div onClick={(e) => e.stopPropagation()}>
          <BookForm
            onClose={() => {setShowAdd(false);setPendingAddCb(null);}}
            onSaved={(id) => {if (pendingAddCb) pendingAddCb(id);}}
            onOpenImport={() => {setShowAdd(false);setPendingAddCb(null);setShowImport(true);}} />
          
        </div>
      </div>}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>);

}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <StoreProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StoreProvider>
);