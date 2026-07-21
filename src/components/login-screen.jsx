import { useState } from 'react';

export function LoginScreen({ authConfigured, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (!authConfigured) {
      setError('Login is not configured. Set VITE_DEFAULT_USERNAME and VITE_DEFAULT_PASSWORD.');
      return;
    }

    if (!onLogin(username, password)) {
      setError('Incorrect username or password.');
      return;
    }
  };

  return (
    <main className="home-page" style={{ paddingTop: '96px' }}>
      <section className="home-hero">
        <span className="eyebrow">SIGN IN</span>
        <h1>
          Welcome to <em>Think Outside The Bots</em>
        </h1>
        <p>
          This preview application is protected by a simple username/password login. Define your
          credentials in environment variables before building or running the app.
        </p>

        <form className="login-screen" onSubmit={handleSubmit}>
          {!authConfigured && (
            <div className="login-warning">
              <strong>Login is not configured.</strong>
              <p>
                Define <code>VITE_DEFAULT_USERNAME</code> and <code>VITE_DEFAULT_PASSWORD</code> in a
                `.env` file or your environment.
              </p>
            </div>
          )}

          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={!authConfigured}
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!authConfigured}
              autoComplete="current-password"
            />
          </label>

          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={!authConfigured}>
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
