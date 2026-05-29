// toast.jsx — editorial toast notification system
// API:
//   const { showToast } = useToast();
//   showToast('Added to To Read', { action: { label: 'Open', onClick: () => ... } });
//   showToast('Deleted "Foo"', { action: { label: 'Undo', onClick: () => ... } });
// Multiple toasts stack; oldest dismiss after 4s, max 3 visible.

const { useState: useStateT, useEffect: useEffectT, useCallback: useCallbackT, useRef: useRefT, createContext: createContextT, useContext: useContextT } = React;

const ToastContext = createContextT(null);
function useToast() { return useContextT(ToastContext); }

const TOAST_DURATION = 4000;
const MAX_VISIBLE = 3;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useStateT([]);
  const idRef = useRefT(0);

  // Dismiss a single toast by id, triggering its exit animation first.
  const dismissToast = useCallbackT((id) => {
    setToasts((ts) => ts.map(t => t.id === id ? { ...t, leaving: true } : t));
    // Actually remove after the leave animation completes
    setTimeout(() => {
      setToasts((ts) => ts.filter(t => t.id !== id));
    }, 220);
  }, []);

  const showToast = useCallbackT((message, opts = {}) => {
    const id = ++idRef.current;
    setToasts((ts) => {
      const next = [...ts, { id, message, action: opts.action, leaving: false, born: Date.now() }];
      // If we exceed MAX_VISIBLE, mark older toasts as leaving immediately
      while (next.filter(t => !t.leaving).length > MAX_VISIBLE) {
        const oldest = next.find(t => !t.leaving);
        if (oldest) oldest.leaving = true;
      }
      return next;
    });
    // Auto-dismiss after duration
    setTimeout(() => dismissToast(id), TOAST_DURATION);
    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastViewport toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, dismissToast }) {
  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={"toast" + (t.leaving ? ' leaving' : '')}
        >
          <div className="toast-msg">{t.message}</div>
          {t.action && (
            <button
              className="toast-action"
              onClick={(e) => {
                e.stopPropagation();
                t.action.onClick();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            className="toast-close"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <line x1="2" y1="2" x2="8" y2="8" />
              <line x1="8" y1="2" x2="2" y2="8" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ToastContext, ToastProvider, useToast });
