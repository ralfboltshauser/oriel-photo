import { BrandMark, Button, Kbd } from '@oriel/ui';
import { ArrowRight, Check, FolderOpen, Image, LockKeyhole, WifiOff } from 'lucide-react';
import { useState } from 'react';

import photo10 from '@oriel/fixtures/assets/photo-10.jpg?url';
import photo15 from '@oriel/fixtures/assets/photo-15.jpg?url';
import photo29 from '@oriel/fixtures/assets/photo-29.jpg?url';

import { useCatalogStore } from '../../store/catalog-store';

export function Onboarding() {
  const [step, setStep] = useState<'welcome' | 'ready'>('welcome');
  const [choosingFolder, setChoosingFolder] = useState(false);
  const startDemo = useCatalogStore((state) => state.startDemo);
  const scanFolder = useCatalogStore((state) => state.scanFolder);

  const chooseFolder = async () => {
    setChoosingFolder(true);
    try {
      await scanFolder();
    } finally {
      setChoosingFolder(false);
    }
  };

  return (
    <main className="onboarding-shell">
      <div aria-hidden="true" className="onboarding-atmosphere">
        <img alt="" src={photo10} />
        <img alt="" src={photo15} />
        <img alt="" src={photo29} />
      </div>
      <section aria-labelledby="onboarding-title" className="onboarding-card">
        <div className="onboarding-brand">
          <BrandMark size={32} />
          <span>Oriel</span>
          <span className="preview-badge">Preview</span>
        </div>

        {step === 'welcome' ? (
          <div className="onboarding-step" key="welcome">
            <div className="onboarding-copy">
              <p className="eyebrow">A local photo workspace</p>
              <h1 id="onboarding-title">
                Make the image.
                <br />
                Keep everything.
              </h1>
              <p>
                A calm, fast path from selection to final—without an account, an upload, or a
                subscription.
              </p>
            </div>

            <div className="trust-list">
              <div>
                <LockKeyhole size={15} />
                <span>Original files are never changed</span>
              </div>
              <div>
                <WifiOff size={15} />
                <span>Works entirely offline</span>
              </div>
              <div>
                <Check size={15} />
                <span>Every edit is reversible</span>
              </div>
            </div>

            <div className="onboarding-actions">
              <Button
                data-testid="try-sample"
                icon={<Image size={15} />}
                onClick={() => setStep('ready')}
                variant="primary"
              >
                Try the sample shoot
              </Button>
              <Button
                disabled={choosingFolder}
                icon={<FolderOpen size={15} />}
                onClick={() => void chooseFolder()}
              >
                {choosingFolder ? 'Reviewing…' : 'Open a folder'}
              </Button>
            </div>
            <p className="onboarding-format-note">
              This preview supports JPEG, PNG, and WebP. RAW support is not claimed yet.
            </p>
          </div>
        ) : (
          <div className="onboarding-step" key="ready">
            <div className="onboarding-copy compact">
              <p className="eyebrow">Familiar from the first frame</p>
              <h1 id="onboarding-title">Your hands already know it.</h1>
              <p>
                Oriel begins with Lightroom-familiar shortcuts. Everything else stays
                searchable.
              </p>
            </div>
            <div className="shortcut-grid">
              <div>
                <Kbd>P</Kbd>
                <span>Pick</span>
              </div>
              <div>
                <Kbd>X</Kbd>
                <span>Reject</span>
              </div>
              <div>
                <Kbd>1–5</Kbd>
                <span>Rate</span>
              </div>
              <div>
                <Kbd>D</Kbd>
                <span>Edit</span>
              </div>
              <div>
                <Kbd>\</Kbd>
                <span>Original</span>
              </div>
              <div>
                <Kbd>⌘ K</Kbd>
                <span>Find anything</span>
              </div>
            </div>
            <div className="onboarding-ready-note">
              <div className="ready-orb">
                <Check size={16} />
              </div>
              <div>
                <strong>Sample shoot ready</strong>
                <span>12 development-only photographs · nothing leaves this device</span>
              </div>
            </div>
            <div className="onboarding-actions single">
              <Button data-testid="open-sample" onClick={startDemo} variant="primary">
                Open Alpine weekend <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        <div
          aria-label={`Step ${step === 'welcome' ? 1 : 2} of 2`}
          className="onboarding-progress"
          role="status"
        >
          <span data-active={step === 'welcome'} />
          <span data-active={step === 'ready'} />
        </div>
      </section>
    </main>
  );
}
