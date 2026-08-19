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
          Reload to show your dashboard and the rest of the workspace.
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
