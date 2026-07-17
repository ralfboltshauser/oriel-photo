import type { Workspace } from '@oriel/domain';
import { IconButton, Tooltip } from '@oriel/ui';
import { Aperture, Images, Send, Sparkles } from 'lucide-react';

import { useCatalogStore } from '../../store/catalog-store';

const stages: { value: Workspace; label: string; icon: typeof Images }[] = [
  { value: 'library', label: 'Library', icon: Images },
  { value: 'select', label: 'Select', icon: Aperture },
  { value: 'edit', label: 'Edit', icon: Sparkles },
  { value: 'deliver', label: 'Deliver', icon: Send },
];

export function StageRail() {
  const workspace = useCatalogStore((state) => state.catalog.workspace);
  const setWorkspace = useCatalogStore((state) => state.setWorkspace);
  return (
    <nav aria-label="Workflow" className="stage-rail">
      <div className="stage-rail-items">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <Tooltip content={stage.label} key={stage.value} side="right">
              <IconButton
                aria-current={workspace === stage.value ? 'page' : undefined}
                className="stage-button"
                data-active={workspace === stage.value}
                label={stage.label}
                onClick={() => setWorkspace(stage.value)}
              >
                <Icon size={17} strokeWidth={1.7} />
              </IconButton>
            </Tooltip>
          );
        })}
      </div>
      <div className="stage-rail-local" title="Local-only workspace">
        <span />
      </div>
    </nav>
  );
}
