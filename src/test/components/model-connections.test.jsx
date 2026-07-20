import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelConnections } from '../../components/model-connections';
import * as credentialStore from '../../services/credential-store';
import * as providerAdapter from '../../services/provider-adapter';

function emptyStore() {
  return { connections: [], workflows: [], sessions: [], selectedConnection: null };
}

function renderConnections(store = emptyStore()) {
  const persist = vi.fn((mutator) => mutator(store));
  render(<ModelConnections store={store} persist={persist} />);
  return { store, persist };
}

describe('ModelConnections', () => {
  beforeEach(() => {
    vi.spyOn(credentialStore, 'saveKey').mockImplementation(() => {});
    vi.spyOn(credentialStore, 'removeKey').mockImplementation(() => {});
    vi.spyOn(credentialStore, 'getKey').mockReturnValue('sk-existing1234');
  });

  it('adds a connection and saves the key only to the session-scoped store', async () => {
    vi.spyOn(providerAdapter, 'testConnection').mockResolvedValue({ status: 'valid' });
    const { persist } = renderConnections();

    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'sk-abc123456789' } });
    fireEvent.click(screen.getByRole('button', { name: /test and save locally/i }));

    await waitFor(() => {
      expect(credentialStore.saveKey).toHaveBeenCalledWith(expect.any(String), 'sk-abc123456789');
    });
    expect(persist).toHaveBeenCalled();
  });

  it('shows a verification error and does not save a key for an invalid connection', async () => {
    vi.spyOn(providerAdapter, 'testConnection').mockResolvedValue({ status: 'invalid' });
    renderConnections();

    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'sk-bad' } });
    fireEvent.click(screen.getByRole('button', { name: /test and save locally/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not be verified/i)).toBeInTheDocument();
    });
    expect(credentialStore.saveKey).not.toHaveBeenCalled();
  });

  it('masks the key of an existing connection and never displays it raw', () => {
    const store = {
      ...emptyStore(),
      connections: [{ id: 'c1', label: 'My model', provider: 'openai', model: 'gpt-4.1-mini' }],
    };
    renderConnections(store);
    expect(screen.getByText(/••••1234/)).toBeInTheDocument();
    expect(screen.queryByText('sk-existing1234')).not.toBeInTheDocument();
  });

  it('selects an existing connection when Use is clicked', () => {
    const store = {
      ...emptyStore(),
      connections: [{ id: 'c1', label: 'My model', provider: 'openai', model: 'gpt-4.1-mini' }],
    };
    const { persist } = renderConnections(store);
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(persist).toHaveBeenCalled();
    expect(store.selectedConnection).toBe('c1');
  });

  it('removes a connection and its key together', () => {
    const store = {
      ...emptyStore(),
      connections: [{ id: 'c1', label: 'My model', provider: 'openai', model: 'gpt-4.1-mini' }],
    };
    renderConnections(store);
    fireEvent.click(screen.getByRole('button', { name: /remove my model/i }));
    expect(credentialStore.removeKey).toHaveBeenCalledWith('c1');
    expect(store.connections).toHaveLength(0);
  });
});
