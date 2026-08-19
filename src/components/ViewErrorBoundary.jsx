import { Component } from 'react';

export default class ViewErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="card flex min-h-[calc(100vh-11.5rem)] flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-extrabold text-[var(--ink)]">This page failed to load.</p>
        <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
          {this.state.error?.message || 'Reload to show your dashboard and the rest of the workspace.'}
        </p>
        <button
          type="button"
          className="btn btn-primary mt-5"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}

export class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-[#0b121b] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#243041] bg-[#121a24] p-8 text-center">
          <p className="text-lg font-extrabold text-[#eef2f7]">This page failed to load.</p>
          <p className="mt-2 break-words text-sm text-[#94a3b8]">
            {this.state.error?.message || 'Reload and try again.'}
          </p>
          <button
            type="button"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#25d366] px-4 py-2.5 text-sm font-bold text-white"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
