import { useState } from 'react';
import { C, serif, sans } from '../theme.js';
import { subscribeEmail } from '../lib/subscribe.js';

// Compact "get new akiya alerts" capture. Inherits the visitor's current
// prefecture filter as their stated interest (optional).
export default function SignupBar({ prefecture }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle' }); // idle|busy|done|err

  async function submit(e) {
    e.preventDefault();
    if (state.status === 'busy') return;
    setState({ status: 'busy' });
    const r = await subscribeEmail({ email, prefecture });
    if (r.ok) {
      setState({
        status: 'done',
        msg: r.already
          ? "You're already on the list — we'll be in touch."
          : "You're in. We'll email new akiya as they're listed.",
      });
      setEmail('');
    } else {
      setState({ status: 'err', msg: r.error });
    }
  }

  return (
    <div
      style={{
        background: C.navy,
        borderRadius: 10,
        padding: '16px 20px',
        margin: '4px 0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ color: C.white }}>
        <div
          style={{ fontFamily: serif, fontSize: 18, color: C.gold }}
        >
          Get new akiya alerts
        </div>
        <div style={{ fontFamily: sans, fontSize: 13, opacity: 0.85 }}>
          New listings emailed as they appear
          {prefecture && prefecture !== 'any' ? ` — ${prefecture} focus` : ''}.
          No spam, unsubscribe anytime.
        </div>
      </div>

      {state.status === 'done' ? (
        <div
          style={{
            fontFamily: sans,
            fontSize: 14,
            color: C.gold,
            fontWeight: 700,
            flex: '1 1 240px',
            textAlign: 'right',
          }}
        >
          ✓ {state.msg}
        </div>
      ) : (
        <form
          onSubmit={submit}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              border: 'none',
              fontFamily: sans,
              fontSize: 14,
              minWidth: 220,
            }}
          />
          <button
            type="submit"
            disabled={state.status === 'busy'}
            style={{
              background: C.red,
              color: C.white,
              border: 'none',
              padding: '10px 20px',
              borderRadius: 6,
              fontWeight: 700,
              fontFamily: sans,
              cursor: state.status === 'busy' ? 'default' : 'pointer',
            }}
          >
            {state.status === 'busy' ? 'Adding…' : 'Notify me'}
          </button>
          {state.status === 'err' && (
            <div
              style={{
                color: '#ffd9d9',
                fontSize: 13,
                fontFamily: sans,
                flexBasis: '100%',
              }}
            >
              {state.msg}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
