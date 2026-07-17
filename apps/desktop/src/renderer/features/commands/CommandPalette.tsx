import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import {
  Aperture,
  ClipboardCopy,
  ClipboardPaste,
  CopyPlus,
  FolderOpen,
  Images,
  PanelLeftClose,
  ScanSearch,
  Send,
  Sparkles,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { toast } from 'sonner';

import { desktopBridge } from '../../lib/bridge';
import { useCatalogStore } from '../../store/catalog-store';

interface PaletteAction {
  label: string;
  keywords: string;
  shortcut?: string;
  icon: ReactNode;
  run: () => void | Promise<void>;
}

export function CommandPalette() {
  const inputRef = useRef<HTMLInputElement>(null);
  const open = useCatalogStore((state) => state.commandOpen);
  const setOpen = useCatalogStore((state) => state.setCommandOpen);
  const setWorkspace = useCatalogStore((state) => state.setWorkspace);
  const togglePanels = useCatalogStore((state) => state.togglePanels);
  const toggleOriginal = useCatalogStore((state) => state.toggleOriginal);
  const scanFolder = useCatalogStore((state) => state.scanFolder);
  const createVersion = useCatalogStore((state) => state.createVersion);
  const copyEdits = useCatalogStore((state) => state.copyEdits);
  const pasteEdits = useCatalogStore((state) => state.pasteEdits);
  const setExportOpen = useCatalogStore((state) => state.setExportOpen);

  const actions: PaletteAction[] = [
    {
      label: 'Go to Library',
      keywords: 'grid browse photos',
      shortcut: 'G',
      icon: <Images size={15} />,
      run: () => setWorkspace('library'),
    },
    {
      label: 'Go to Select',
      keywords: 'cull review picks',
      shortcut: 'E',
      icon: <Aperture size={15} />,
      run: () => setWorkspace('select'),
    },
    {
      label: 'Go to Edit',
      keywords: 'develop adjust light color',
      shortcut: 'D',
      icon: <Sparkles size={15} />,
      run: () => setWorkspace('edit'),
    },
    {
      label: 'Show original',
      keywords: 'before compare unchanged backslash',
      shortcut: '\\',
      icon: <ScanSearch size={15} />,
      run: () => toggleOriginal(),
    },
    {
      label: 'Create version',
      keywords: 'virtual copy alternate black white',
      shortcut: "⌘'",
      icon: <CopyPlus size={15} />,
      run: () => {
        createVersion();
        toast.success('New version created');
      },
    },
    {
      label: 'Copy edits',
      keywords: 'adjustments settings',
      shortcut: '⇧⌘C',
      icon: <ClipboardCopy size={15} />,
      run: () => {
        copyEdits();
        toast('Edits copied');
      },
    },
    {
      label: 'Paste edits',
      keywords: 'batch sync adjustments',
      shortcut: '⇧⌘V',
      icon: <ClipboardPaste size={15} />,
      run: () => {
        pasteEdits();
        toast.success('Edits applied');
      },
    },
    {
      label: 'Import folder',
      keywords: 'add open source photos',
      shortcut: '⇧⌘I',
      icon: <FolderOpen size={15} />,
      run: scanFolder,
    },
    {
      label: 'Export photos',
      keywords: 'deliver jpeg save output',
      shortcut: '⇧⌘E',
      icon: <Send size={15} />,
      run: () => setExportOpen(true),
    },
    {
      label: 'Toggle panels',
      keywords: 'hide focus clean canvas',
      shortcut: 'Tab',
      icon: <PanelLeftClose size={15} />,
      run: togglePanels,
    },
    {
      label: 'Copy diagnostics',
      keywords: 'debug gpu version support logs',
      icon: <ScanSearch size={15} />,
      run: async () => {
        const diagnostics = await desktopBridge.getDiagnostics();
        await navigator.clipboard.writeText(
          Object.entries(diagnostics)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n'),
        );
        toast.success('Diagnostics copied');
      },
    },
  ];

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="command-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Find anything</Dialog.Title>
          <Command label="Oriel commands" loop>
            <div className="command-input-wrap">
              <ScanSearch size={16} />
              <Command.Input placeholder="Find a tool or action…" ref={inputRef} />
            </div>
            <Command.List>
              <Command.Empty>No matching action</Command.Empty>
              <Command.Group heading="Actions">
                {actions.map((action) => (
                  <Command.Item
                    key={action.label}
                    keywords={action.keywords.split(' ')}
                    onSelect={() => {
                      setOpen(false);
                      void action.run();
                    }}
                    value={action.label}
                  >
                    <span className="command-item-icon">{action.icon}</span>
                    <span>{action.label}</span>
                    {action.shortcut ? <kbd>{action.shortcut}</kbd> : null}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <footer>
              <span>
                <kbd>↑↓</kbd> Navigate
              </span>
              <span>
                <kbd>↵</kbd> Open
              </span>
              <span>
                <kbd>esc</kbd> Close
              </span>
            </footer>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
