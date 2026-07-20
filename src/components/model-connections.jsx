import { useState } from 'react';
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
export function ModelConnections({ store, persist }) {
  const [label, setLabel] = useState('My OpenAI model');
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDER.id);
  const [model, setModel] = useState(DEFAULT_PROVIDER.models[1]);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const selectedProvider = PROVIDERS.find((provider) => provider.id === providerId) ?? DEFAULT_PROVIDER;

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
    persist((draft) => {
      draft.selectedConnection = connectionId;
    });
  }

  return (
    <section className="panel">
      <h2>Your models</h2>
      <p>Keys are session-only and are never saved with your learning history.</p>

      {store.connections.map((connection) => (
        <div className="row" key={connection.id}>
          <span>
            <b>{connection.label}</b> · {connection.model} · {maskKey(getKey(connection.id))}
          </span>
          <button type="button" onClick={() => handleSelectConnection(connection.id)}>
            Use
          </button>
          <button
            type="button"
            onClick={() => handleRemoveConnection(connection.id)}
            aria-label={`Remove ${connection.label}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        aria-label="Connection label"
      />
      <select value={providerId} onChange={handleProviderChange} aria-label="Provider">
        {PROVIDERS.map((provider) => (
          <option key={provider.id} value={provider.id}>{provider.label}</option>
        ))}
      </select>
      <select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Model">
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
      />

      {error && <p className="error">{error}</p>}

      <button type="button" className="primary" onClick={handleAddConnection}>
        Test and save locally
      </button>
    </section>
  );
}
