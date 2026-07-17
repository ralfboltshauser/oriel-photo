import type { PhotoAdjustments, PhotoAsset, PhotoVersion } from '@oriel/domain';
import { Button, SegmentedControl, SliderField } from '@oriel/ui';
import {
  ChevronDown,
  Copy,
  Crop,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useCatalogStore } from '../../store/catalog-store';

const lightKeys: (keyof PhotoAdjustments)[] = [
  'exposure',
  'contrast',
  'highlights',
  'shadows',
  'whites',
  'blacks',
];
const colorKeys: (keyof PhotoAdjustments)[] = [
  'temperature',
  'tint',
  'vibrance',
  'saturation',
  'monochrome',
];

function Section({
  title,
  children,
  onReset,
  feedbackId,
}: {
  title: string;
  children: React.ReactNode;
  onReset: () => void;
  feedbackId: string;
}) {
  return (
    <section className="inspector-section" data-feedback={feedbackId}>
      <header>
        <span>{title}</span>
        <button
          aria-label={`Reset ${title}`}
          data-feedback={`${feedbackId}.reset`}
          onClick={onReset}
          type="button"
        >
          <RotateCcw size={12} />
        </button>
      </header>
      <div>{children}</div>
    </section>
  );
}

export function DevelopInspector({
  photo,
  version,
}: {
  photo: PhotoAsset;
  version: PhotoVersion;
}) {
  const [fullLight, setFullLight] = useState(false);
  const update = useCatalogStore((state) => state.updateAdjustment);
  const commit = useCatalogStore((state) => state.commitContinuousEdit);
  const reset = useCatalogStore((state) => state.resetAdjustments);
  const createVersion = useCatalogStore((state) => state.createVersion);
  const selectVersion = useCatalogStore((state) => state.selectVersion);
  const copyEdits = useCatalogStore((state) => state.copyEdits);
  const pasteEdits = useCatalogStore((state) => state.pasteEdits);
  const copied = useCatalogStore((state) => state.copiedAdjustments);
  const a = version.adjustments;

  const field = <K extends keyof PhotoAdjustments>(
    key: K,
    label: string,
    min: number,
    max: number,
    step = 1,
    format?: (value: number) => string,
  ) => (
    <SliderField
      feedbackId={`edit.${key}`}
      formatValue={format}
      label={label}
      max={max}
      min={min}
      onChange={(value) => update(key, value as PhotoAdjustments[K])}
      onCommit={commit}
      onReset={() => {
        update(key, 0 as PhotoAdjustments[K]);
        commit();
      }}
      step={step}
      value={a[key] as number}
    />
  );

  return (
    <aside className="develop-inspector" data-feedback="edit.inspector">
      <div className="inspector-heading">
        <div>
          <small>Editing</small>
          <strong>{photo.fileName}</strong>
        </div>
        <div className="version-control">
          <select
            aria-label="Active version"
            data-feedback="edit.version-selector"
            onChange={(event) => selectVersion(event.target.value)}
            value={version.id}
          >
            {photo.versions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            aria-label="Create version"
            data-feedback="edit.create-version"
            onClick={() => {
              createVersion();
              toast.success('New version created');
            }}
            type="button"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="inspector-quick-actions">
        <Button
          data-feedback="edit.copy"
          icon={<Copy size={13} />}
          onClick={() => {
            copyEdits();
            toast('Edits copied');
          }}
          variant="ghost"
        >
          Copy
        </Button>
        <Button
          data-feedback="edit.paste"
          disabled={!copied}
          onClick={() => {
            pasteEdits();
            toast.success(
              `Edits applied to ${useCatalogStore.getState().catalog.selectedPhotoIds.length} photo${useCatalogStore.getState().catalog.selectedPhotoIds.length === 1 ? '' : 's'}`,
            );
          }}
          variant="ghost"
        >
          Paste
        </Button>
      </div>

      <div className="inspector-scroll">
        <Section feedbackId="edit.section.light" onReset={() => reset(lightKeys)} title="Light">
          {field(
            'exposure',
            'Exposure',
            -5,
            5,
            0.05,
            (value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`,
          )}
          {field('contrast', 'Contrast', -100, 100)}
          {field('highlights', 'Highlights', -100, 100)}
          {field('shadows', 'Shadows', -100, 100)}
          {fullLight ? (
            <>
              {field('whites', 'Whites', -100, 100)}
              {field('blacks', 'Blacks', -100, 100)}
            </>
          ) : (
            <button
              className="reveal-controls"
              data-feedback="edit.reveal-light-controls"
              onClick={() => setFullLight(true)}
              type="button"
            >
              Show full light controls <ChevronDown size={12} />
            </button>
          )}
        </Section>

        <Section feedbackId="edit.section.color" onReset={() => reset(colorKeys)} title="Color">
          {field('temperature', 'Temperature', -100, 100)}
          {field('tint', 'Tint', -100, 100)}
          {field('vibrance', 'Vibrance', -100, 100)}
          {field('saturation', 'Saturation', -100, 100)}
          <label
            className="mono-toggle"
            data-feedback="edit.monochrome"
            htmlFor="oriel-monochrome"
          >
            <i aria-hidden="true" />
            Monochrome
            <input
              checked={a.monochrome}
              id="oriel-monochrome"
              onChange={(event) => {
                update('monochrome', event.target.checked);
                commit();
              }}
              type="checkbox"
            />
          </label>
        </Section>

        <Section
          feedbackId="edit.section.crop-rotate"
          onReset={() => reset(['crop'])}
          title="Crop & rotate"
        >
          <SegmentedControl
            ariaLabel="Crop aspect ratio"
            feedbackId="edit.crop-aspect"
            onChange={(aspect) => {
              update('crop', { ...a.crop, aspect });
              commit();
            }}
            options={[
              { value: 'original', label: 'Original' },
              { value: '1:1', label: '1:1' },
              { value: '4:5', label: '4:5' },
              { value: '16:9', label: '16:9' },
            ]}
            value={a.crop.aspect}
          />
          <Button
            data-feedback="edit.rotate"
            icon={<Crop size={13} />}
            onClick={() => {
              update('crop', {
                ...a.crop,
                rotation: ((a.crop.rotation + 90) % 360) as 0 | 90 | 180 | 270,
              });
              commit();
            }}
            variant="ghost"
          >
            Rotate 90°
          </Button>
        </Section>

        <div className="tool-discovery">
          <SlidersHorizontal size={14} />
          <div>
            <strong>Essentials first</strong>
            <span>More tools will appear here only when they are real and useful.</span>
          </div>
        </div>
      </div>

      <div className="inspector-footer">
        <Sparkles size={12} />
        <span>Preview renderer · sRGB JPEG workflow</span>
      </div>
    </aside>
  );
}
