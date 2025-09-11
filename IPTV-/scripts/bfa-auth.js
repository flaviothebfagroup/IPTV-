/* BFA GitHub token helper (shared across all pages)
   - Session token: set by Settings (“Use for this session”)
   - Encrypted token: optional, saved in localStorage (Settings handles save)
   - Headers helper: returns proper GitHub headers (falls back to public read)
   - Repo prefs: single place to read owner/repo/branch/path
*/
(function () {
  const GH_SESSION_KEY = 'bfa_gh_pat';           // session-only plaintext token
  const GH_ENC_KEY     = 'secure_github_token';  // encrypted blob from Settings
  const PASS_SESSION   = 'bfa_gh_passphrase';    // cached passphrase (session)
  const ENC_SALT       = 'bfa-iptv-salt-v1';     // must match Settings page

  // Repo prefs (set once in Settings; all pages read)
  const PREF_OWNER  = 'pref_github_owner';
  const PREF_REPO   = 'pref_github_repo';
  const PREF_BRANCH = 'pref_github_branch';
  const PREF_PATH   = 'pref_github_path';

  async function deriveKey(pass){
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name:'PBKDF2', salt: enc.encode(ENC_SALT), iterations:120000, hash:'SHA-256' },
      keyMaterial, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
    );
  }

  async function decryptTokenBlob(blob, pass){
    const obj  = (typeof blob === 'string') ? JSON.parse(blob) : blob;
    const iv   = new Uint8Array(obj.iv);
    const data = new Uint8Array(obj.data);
    const key  = await deriveKey(pass);
    const pt   = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(pt);
  }

  async function getToken(interactive = true){
    // 1) Session token (set by Settings)
    let t = sessionStorage.getItem(GH_SESSION_KEY);
    if (t) return t;

    // 2) Encrypted token (saved by Settings) → prompt passphrase once
    const enc = localStorage.getItem(GH_ENC_KEY);
    if (!enc) return null;

    let pass = sessionStorage.getItem(PASS_SESSION);
    if (!pass && interactive){
      pass = prompt('Enter passphrase to unlock your saved GitHub token:') || '';
    }
    if (!pass) return null;

    try{
      const tok = await decryptTokenBlob(enc, pass);
      sessionStorage.setItem(GH_SESSION_KEY, tok);
      sessionStorage.setItem(PASS_SESSION, pass);
      return tok;
    }catch(e){
      console.warn('GitHub token decrypt failed:', e?.message || e);
      return null;
    }
  }

  async function getGithubHeadersOrNull(opts = {}){
    const token = await getToken(opts.interactive !== false);
    if (token){
      return { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json' };
    }
    // Public read fallback
    return { 'Accept': 'application/vnd.github+json' };
  }

  function clearGithubTokenSession(){
    sessionStorage.removeItem('bfa_gh_pat');
    sessionStorage.removeItem('bfa_gh_passphrase');
  }

  function setSessionToken(token){
    if (typeof token === 'string' && token.trim()){
      sessionStorage.setItem('bfa_gh_pat', token.trim());
    }
  }

  function getRepoPrefs(){
    return {
      owner:  localStorage.getItem(PREF_OWNER)  || 'flaviothebfagroup',
      repo:   localStorage.getItem(PREF_REPO)   || 'IPTV-',
      branch: localStorage.getItem(PREF_BRANCH) || 'main',
      path:   localStorage.getItem(PREF_PATH)   || 'config/iptv-config.json',
    };
  }

  function setRepoPrefs({ owner, repo, branch, path }){
    if (owner)  localStorage.setItem(PREF_OWNER,  owner);
    if (repo)   localStorage.setItem(PREF_REPO,   repo);
    if (branch) localStorage.setItem(PREF_BRANCH, branch);
    if (path)   localStorage.setItem(PREF_PATH,   path);
  }

  // Expose globally
  window.BFA = window.BFA || {};
  window.BFA.getGithubHeadersOrNull = getGithubHeadersOrNull;
  window.BFA.clearGithubTokenSession = clearGithubTokenSession;
  window.BFA.setSessionToken = setSessionToken;
  window.BFA.getRepoPrefs = getRepoPrefs;
  window.BFA.setRepoPrefs = setRepoPrefs;
})();
