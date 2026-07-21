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
    vi.clearAllMocks();
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

  it('allows selecting Google Gemini and saves its model provider', async () => {
    vi.spyOn(providerAdapter, 'testConnection').mockResolvedValue({ status: 'valid' });
    const { persist } = renderConnections();

    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'google' } });
    expect(screen.getByLabelText('Model')).toHaveValue('gemini-2.5-flash');
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'google-key' } });
    fireEvent.click(screen.getByRole('button', { name: /test and save locally/i }));

    await waitFor(() => expect(persist).toHaveBeenCalled());
    expect(persist.mock.calls[0][0]).toBeTypeOf('function');
    expect(providerAdapter.testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google', model: 'gemini-2.5-flash' }),
      'google-key',
    );
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
    fireEvent.click(screen.getByRole('button', { name: 'Use My model' }));
    expect(persist).toHaveBeenCalled();
    expect(store.selectedConnection).toBe('c1');
  });

  it('shows the selected connection and switches to another one when requested', () => {
    const store = {
      ...emptyStore(),
      selectedConnection: 'c1',
      connections: [
        { id: 'c1', label: 'First model', provider: 'openai', model: 'gpt-4.1-mini' },
        { id: 'c2', label: 'Second model', provider: 'openai', model: 'gpt-4.1' },
      ],
    };
    renderConnections(store);

    expect(screen.getByRole('button', { name: /selected first model/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use Second model' }));

    expect(store.selectedConnection).toBe('c2');
    expect(screen.getByRole('button', { name: /selected second model/i })).toBeInTheDocument();
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
