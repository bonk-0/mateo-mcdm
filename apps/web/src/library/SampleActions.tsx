import { addDataset } from '@mateo/project';
import { Button } from '@mateo/ui';
import { Download, FilePlus2, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { runCommand } from '../commands/commands';
import { useMessage } from '../editor/messages';
import { useSession } from '../editor/session';
import { CSV_MEDIA_TYPE, saveBytes } from '../export/download';
import { methodKey } from '../workspace/AnalysisView';
import { sampleAddress } from './preset';
import {
  sampleCsv,
  sampleDataset,
  sampleDatasetId,
  sampleFixture,
  sampleKind,
  sampleRoute,
  type SampleId,
} from './samples';

/** The sample of one variant: a CSV download and "Open in workspace with sample data". */
export function SampleActions({ sampleId }: { sampleId: SampleId }) {
  const { t } = useTranslation('library');
  const message = useMessage();
  const navigate = useNavigate();
  const session = useSession();
  const [failure, setFailure] = useState<string | null>(null);
  const ordered = sampleKind(sampleId) === 'ordered';

  const download = () => {
    const csv = sampleCsv(sampleId, {
      alternative: t('sample.csv.alternative'),
      weight: t('sample.csv.weight'),
      criterion: t('sample.csv.criterion'),
      assessment: t(sampleId === 'swara' ? 'sample.csv.importance' : 'sample.csv.terms'),
    });
    saveBytes(`${sampleId}-sample.csv`, new TextEncoder().encode(csv), CSV_MEDIA_TYPE);
  };

  const open = () => {
    setFailure(null);
    if (!session) {
      // The project is created by the File menu's own flow; the person then opens the sample.
      runCommand('file.new');
      return;
    }
    try {
      const id = sampleDatasetId(sampleId);
      // Opening a sample twice reuses its decision problem instead of adding a copy.
      if (!session.document.model.datasets.some((dataset) => dataset.id === id)) {
        const fixture = sampleFixture(sampleId);
        session.execute(
          addDataset(
            sampleDataset(sampleId, {
              name: t('sample.datasetName', {
                method: message(`methods.${methodKey(sampleId)}.name`),
              }),
              description: t('sample.datasetDescription', { doi: fixture.source.doi }),
              now: new Date().toISOString(),
            }),
          ),
        );
        session.history.sealMerge();
      }
      void navigate(sampleAddress(sampleRoute(sampleId), sampleId, id));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-3">
      <p className="max-w-2xl text-sm text-muted-foreground">
        {t(ordered ? 'sample.textOrdered' : 'sample.text')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={download} data-testid={`sample-download-${sampleId}`}>
          <Download aria-hidden />
          {t('sample.download')}
        </Button>
        <Button onClick={open} data-testid={`sample-open-${sampleId}`}>
          {session ? <FlaskConical aria-hidden /> : <FilePlus2 aria-hidden />}
          {t(session ? 'sample.open' : 'sample.openNew')}
        </Button>
      </div>
      {!session && <p className="text-sm text-muted-foreground">{t('sample.noProject')}</p>}
      {failure && (
        <p role="alert" className="text-sm text-danger">
          {t('sample.failed', { message: failure })}
        </p>
      )}
    </div>
  );
}
