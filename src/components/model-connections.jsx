import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { getKey, maskKey, removeKey, saveKey } from '../services/credential-store';
import { PROVIDERS, testConnection } from '../services/provider-adapter';
import { uid } from '../utils/uid';

const DEFAULT_PROVIDER = PROVIDERS[0];

/**
 * Manages the student's personal model connections. Keys never leave this
 * component's local form state and the session-scoped credential store —
 * they are not part of the persisted `store` object.
 */
export function ModelConnections({ store, persist, onConnectionSelect }) {
  const [label, setLabel] = useState('My OpenAI model');
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDER.id);
  const [model, setModel] = useState(DEFAULT_PROVIDER.models[1]);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [activeConnectionId, setActiveConnectionId] = useState(store.selectedConnection ?? null);
  const selectedProvider = PROVIDERS.find((provider) => provider.id === providerId) ?? DEFAULT_PROVIDER;

  useEffect(() => {
    setActiveConnectionId(store.selectedConnection ?? null);
  }, [store.selectedConnection]);

  function handleProviderChange(event) {
    const nextProvider = PROVIDERS.find((provider) => provider.id === event.target.value) ?? DEFAULT_PROVIDER;
    setProviderId(nextProvider.id);
    setModel(nextProvider.models[0]);
    setLabel(`My ${nextProvider.label} model`);
  }

  async function handleAddConnection() {
    setError('');
    const connection = {
      id: uid(),
      label: label.trim() || 'Untitled connection',
      provider: selectedProvider.id,
      model,
      status: 'untested',
      createdAt: new Date().toISOString(),
    };

    const result = await testConnection(connection, key);
    if (result.status !== 'valid') {
      setError('That connection could not be verified. Check the key and try again.');
      return;
    }

    saveKey(connection.id, key);
    persist((draft) => {
      draft.connections.push({ ...connection, status: 'valid' });
      draft.selectedConnection = connection.id;
    });
    setKey('');
  }

  function handleRemoveConnection(connectionId) {
    removeKey(connectionId);
    persist((draft) => {
      draft.connections = draft.connections.filter((c) => c.id !== connectionId);
      if (draft.selectedConnection === connectionId) draft.selectedConnection = null;
    });
  }

  function handleSelectConnection(connectionId) {
    setActiveConnectionId(connectionId);
    persist((draft) => {
      draft.selectedConnection = connectionId;
    });
    onConnectionSelect?.(connectionId);
  }

  return (
    <section className="panel">
      <h2>Your models</h2>
      <p>Keys are session-only and are never saved with your learning history.</p>

      {store.connections.map((connection) => {
        const isSelected = activeConnectionId === connection.id;
        return (
          <div className="row" key={connection.id} style={{ alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong>{connection.label}</strong>
                {isSelected && (
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: '#eee9ff',
                      color: '#4e3d8f',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Selected
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#6e6b78', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span>{connection.model}</span>
                <span>·</span>
                <span>{maskKey(getKey(connection.id))}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => handleSelectConnection(connection.id)}
                aria-pressed={isSelected}
                aria-label={isSelected ? `Selected ${connection.label}` : `Use ${connection.label}`}
                style={{
                  border: 0,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  background: isSelected ? '#292741' : '#eee9ff',
                  color: isSelected ? '#fff' : '#3e3864',
                  fontWeight: 600,
                }}
              >
                {isSelected ? 'Selected' : 'Use'}
              </button>
              <button
                type="button"
                onClick={() => handleRemoveConnection(connection.id)}
                aria-label={`Remove ${connection.label}`}
                style={{
                  border: '1px solid #ddd7d0',
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#a4333c',
                  padding: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            aria-label="Connection label"
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd7d0', borderRadius: '8px', padding: '10px 12px', font: 'inherit' }}
          />
          <select value={providerId} onChange={handleProviderChange} aria-label="Provider" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd7d0', borderRadius: '8px', padding: '10px 12px', font: 'inherit' }}>
            {PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Model" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd7d0', borderRadius: '8px', padding: '10px 12px', font: 'inherit' }}>
            {selectedProvider.models.map((modelOption) => (
              <option key={modelOption}>{modelOption}</option>
            ))}
          </select>
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="API key"
            aria-label="API key"
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd7d0', borderRadius: '8px', padding: '10px 12px', font: 'inherit' }}
          />
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="button" className="primary" onClick={handleAddConnection}>
        Test and save locally
      </button>
    </section>
  );
}
