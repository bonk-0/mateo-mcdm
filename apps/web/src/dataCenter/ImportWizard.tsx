import { parseImportProfile, type ImportOverrides } from '@mateo/io';
import type { ValidationIssue } from '@mateo/engine';
import type { ImportProfile, ProjectSession } from '@mateo/project';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mateo/ui';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMessage } from '../editor/messages';
import { commitImport } from './commit';
import {
  ColumnsStep,
  ConfirmStep,
  MissingStep,
  PreviewStep,
  SheetStep,
  StructureStep,
  TypesStep,
  UploadStep,
  ValidationStep,
} from './steps';
import {
  datasetNameFor,
  readiness,
  runImport,
  stepsFor,
  type ImportInput,
  type WizardStep,
} from './wizard';

export interface ImportWizardProps {
  readonly session: ProjectSession;
  readonly profiles: readonly ImportProfile[];
  /** Text pasted from a spreadsheet before the wizard opened. */
  readonly initialInput?: ImportInput | null;
  readonly onClose: () => void;
  /** The import was confirmed and the dataset is in the project. */
  readonly onImported: (datasetId: string) => void;
}

export function ImportWizard({
  session,
  profiles,
  initialInput = null,
  onClose,
  onImported,
}: ImportWizardProps) {
  const { t } = useTranslation('dataCenter');
  const message = useMessage();
  const [input, setInput] = useState<ImportInput | null>(null);
  const [overrides, setOverrides] = useState<ImportOverrides>({});
  const [step, setStep] = useState<WizardStep>('upload');
  const [profileId, setProfileId] = useState('');
  const [profileProblem, setProfileProblem] = useState<string | null>(null);
  const [readIssues, setReadIssues] = useState<readonly ValidationIssue[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const [saveProfile, setSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [busy, setBusy] = useState(false);

  const result = useMemo(
    () => (input ? runImport(input, overrides) : undefined),
    [input, overrides],
  );
  const steps = stepsFor(result);
  const index = Math.max(0, steps.indexOf(step));
  const state = result ? readiness(result) : undefined;

  const profileOverrides = (id: string): ImportOverrides => {
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return {};
    const parsed = parseImportProfile(profile.definition);
    return parsed.definition?.overrides ?? {};
  };

  const accept = (next: ImportInput, base: ImportOverrides) => {
    const read = runImport(next, base);
    setInput(next);
    setOverrides(base);
    setDatasetName(datasetNameFor(next.name));
    setProfileName(datasetNameFor(next.name));
    if (read.source === undefined) {
      setReadIssues(read.validation.errors);
      return;
    }
    setReadIssues([]);
    const following = stepsFor(read)[1];
    if (following) setStep(following);
  };

  const chooseProfile = (id: string) => {
    setProfileId(id);
    if (id === '') {
      setProfileProblem(null);
      setOverrides({});
      return;
    }
    const profile = profiles.find((item) => item.id === id);
    const parsed = profile ? parseImportProfile(profile.definition) : undefined;
    if (!parsed?.definition) {
      const first = parsed?.validation.errors[0];
      setProfileProblem(
        first ? message(first.messageKey, first.params) : t('upload.profile.invalid'),
      );
      return;
    }
    setProfileProblem(null);
    setOverrides(parsed.definition.overrides);
  };

  // Text pasted before the wizard opened starts it straight at the structure.
  const [started, setStarted] = useState(false);
  if (initialInput && !started) {
    setStarted(true);
    accept(initialInput, {});
  }

  const finish = async () => {
    if (!input || !result || !state?.ok || busy) return;
    setBusy(true);
    try {
      const committed = await commitImport(session, {
        input,
        result,
        overrides,
        datasetName: datasetName.trim() === '' ? datasetNameFor(input.name) : datasetName.trim(),
        ...(saveProfile ? { saveProfileAs: profileName } : {}),
        appliedProfileId: profileId === '' ? null : profileId,
      });
      toast.success(t('confirm.done', { name: datasetName }));
      onImported(committed.datasetId);
    } catch (error) {
      toast.error(t('confirm.failed'), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  };

  const next = steps[index + 1];
  const previous = steps[index - 1];
  const onUpload = step === 'upload';
  const canNext = onUpload ? result?.source !== undefined : true;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] w-[min(62rem,calc(100vw-2rem))] overflow-hidden"
        aria-describedby="wizard-description"
        data-testid="import-wizard"
      >
        <DialogHeader>
          <DialogTitle>{t('wizard.title')}</DialogTitle>
          <DialogDescription id="wizard-description">{t('wizard.description')}</DialogDescription>
        </DialogHeader>

        <ol
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
          aria-label={t('wizard.progress')}
        >
          {steps.map((item, position) => (
            <li
              key={item}
              aria-current={item === step ? 'step' : undefined}
              className={item === step ? 'font-semibold text-foreground' : undefined}
            >
              {position + 1}. {t(`wizard.steps.${item}`)}
            </li>
          ))}
        </ol>

        <div
          className="min-h-0 flex-1 overflow-y-auto pr-1"
          role="region"
          aria-label={t(`wizard.steps.${step}`)}
          data-testid={`step-${step}`}
        >
          {step === 'upload' && (
            <UploadStep
              input={input}
              onInput={(next) => accept(next, profileId === '' ? {} : profileOverrides(profileId))}
              profiles={profiles}
              profileId={profileId}
              onProfile={chooseProfile}
              profileProblem={profileProblem}
              readIssues={readIssues}
            />
          )}
          {result && step === 'sheet' && (
            <SheetStep result={result} overrides={overrides} onOverrides={setOverrides} />
          )}
          {result && step === 'structure' && (
            <StructureStep result={result} overrides={overrides} onOverrides={setOverrides} />
          )}
          {result && step === 'columns' && (
            <ColumnsStep result={result} overrides={overrides} onOverrides={setOverrides} />
          )}
          {result && step === 'types' && (
            <TypesStep result={result} overrides={overrides} onOverrides={setOverrides} />
          )}
          {result && step === 'missing' && <MissingStep result={result} />}
          {result && step === 'validation' && (
            <ValidationStep result={result} directionsMissing={state?.directionsMissing ?? []} />
          )}
          {result && step === 'preview' && <PreviewStep result={result} />}
          {result && input && step === 'confirm' && (
            <ConfirmStep
              result={result}
              blocked={!state?.ok}
              datasetName={datasetName}
              onDatasetName={setDatasetName}
              saveProfile={saveProfile}
              onSaveProfile={setSaveProfile}
              profileName={profileName}
              onProfileName={setProfileName}
              fileName={input.name}
            />
          )}
        </div>

        <DialogFooter className="items-center">
          {result && !onUpload && state && !state.ok && (
            <p className="mr-auto text-xs text-danger" data-testid="wizard-blocked">
              {t('wizard.blocked')}
            </p>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('wizard.cancel')}
          </Button>
          <Button
            variant="outline"
            disabled={!previous}
            onClick={() => previous && setStep(previous)}
          >
            <ArrowLeft aria-hidden />
            {t('wizard.back')}
          </Button>
          {next ? (
            <Button disabled={!canNext} onClick={() => next && setStep(next)}>
              {t('wizard.next')}
              <ArrowRight aria-hidden />
            </Button>
          ) : (
            <Button
              data-testid="confirm-import"
              disabled={!state?.ok || busy || (datasetName.trim() === '' && !input)}
              onClick={() => void finish()}
            >
              <Check aria-hidden />
              {t('wizard.import')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
