import { Button, BrandMark } from '@oriel/ui';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, details: ErrorInfo): void {
    console.error('Oriel renderer failed', error, details);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="recovery-screen">
        <BrandMark size={34} />
        <p className="eyebrow">Workspace paused</p>
        <h1>Oriel hit an unexpected display error.</h1>
        <p>
          Your originals were not changed. Reload the interface; the catalog is stored
          separately.
        </p>
        <Button onClick={() => window.location.reload()} variant="primary">
          Reload Oriel
        </Button>
      </main>
    );
  }
}
