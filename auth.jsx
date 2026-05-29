// auth.jsx — Supabase auth + login gate
const { useState: useStateAu, useEffect: useEffectAu, useCallback: useCallbackAu, createContext: createContextAu, useContext: useContextAu } = React;

const SUPABASE_URL = 'https://ivjhqemmwzuqiwmjzehy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tnEpdvn7AY9wQSAlZ7JJIQ_B_f0GxpT';

// supabase global comes from the CDN UMD build loaded in the HTML
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,        // keep users signed in across refreshes/closes
    autoRefreshToken: true,
    detectSessionInUrl: true,    // handle OAuth redirect back
  },
});
window.supabaseClient = supabaseClient;

const AuthContext = createContextAu(null);
function useAuth() { return useContextAu(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useStateAu(null);
  const [ready, setReady] = useStateAu(false);

  useEffectAu(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session ? data.session.user : null);
      setReady(true);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session ? session.user : null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signOut = useCallbackAu(async () => {
    await supabaseClient.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// The gate: shows a loading splash, then either the login screen or the app.
function AuthGate({ children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="auth-splash">
        <img src="logo.png" alt="Read before you die" className="auth-splash-logo" />
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return children;
}

function LoginScreen() {
  const [mode, setMode] = useStateAu('login'); // 'login' | 'signup'
  const [email, setEmail] = useStateAu('');
  const [password, setPassword] = useStateAu('');
  const [busy, setBusy] = useStateAu(false);
  const [err, setErr] = useStateAu('');
  const [notice, setNotice] = useStateAu('');

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        setNotice('Check your inbox to confirm your email, then sign in.');
        setMode('login');
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will flip the gate
      }
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.');
    }
    setBusy(false);
  };

  const google = async () => {
    setErr('');
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setErr(error.message);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img src="logo.png" alt="Read before you die" className="auth-logo" />
        <div className="auth-eyebrow caps">{mode === 'login' ? 'Welcome back' : 'Create your shelf'}</div>
        <h1 className="auth-title serif">{mode === 'login' ? 'Sign in' : 'Sign up'}</h1>

        <button className="auth-google" onClick={google} type="button">
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={submit} className="auth-form">
          <label className="auth-field">
            <span className="caps">Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
          </label>
          <label className="auth-field">
            <span className="caps">Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" minLength={6} />
          </label>
          {err && <div className="auth-err">{err}</div>}
          {notice && <div className="auth-notice">{notice}</div>}
          <button className="btn solid auth-submit" type="submit" disabled={busy}>
            {busy ? 'One moment…' : (mode === 'login' ? 'Sign in' : 'Sign up')}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>New here? <button onClick={() => { setMode('signup'); setErr(''); setNotice(''); }}>Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setErr(''); setNotice(''); }}>Sign in</button></>
          )}
        </div>
      </div>
      <div className="auth-foot caps">A private library · Read before you die</div>
    </div>
  );
}

Object.assign(window, { supabaseClient, AuthContext, useAuth, AuthProvider, AuthGate, LoginScreen });
