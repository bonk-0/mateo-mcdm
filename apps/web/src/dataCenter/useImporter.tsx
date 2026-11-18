import type { ImportProfile, ProjectSession } from '@mateo/project';
import { useCallback, useState, type ReactNode } from 'react';
import { ImportWizard } from './ImportWizard';
import type { ImportInput } from './wizard';

/**
 * Opens the import wizard for a file, or for text pasted from a spreadsheet, and reports
 * the decision problem it created.
 */
export function useImporter(
  session: ProjectSession,
  onImported: (datasetId: string) => void,
): { open: (input?: ImportInput | null) => void; dialog: ReactNode } {
  const [wizard, setWizard] = useState<{
    input: ImportInput | null;
    profiles: readonly ImportProfile[];
    key: number;
  } | null>(null);

  const open = useCallback(
    (input: ImportInput | null = null) => {
      void session.listImportProfiles().then(
        (profiles) => setWizard({ input, profiles, key: Date.now() }),
        () => setWizard({ input, profiles: [], key: Date.now() }),
      );
    },
    [session],
  );

  const dialog = wizard && (
    <ImportWizard
      key={wizard.key}
      session={session}
      profiles={wizard.profiles}
      initialInput={wizard.input}
      onClose={() => setWizard(null)}
      onImported={(datasetId) => {
        setWizard(null);
        onImported(datasetId);
      }}
    />
  );
  return { open, dialog };
}
