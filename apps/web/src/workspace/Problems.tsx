import type { ValidationResult } from '@mateo/engine';
import type { Dataset } from '@mateo/project';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMessage } from '../editor/messages';
import type { DatasetProblem } from './engineInput';

/** Why the data cannot be run yet, with a link to fix it in the matrix editor. */
export function DatasetProblems({
  dataset,
  problems,
}: {
  dataset: Dataset;
  problems: readonly DatasetProblem[];
}) {
  const { t } = useTranslation('workspace');
  const name = (list: readonly { id: string; code: string; name: string }[], id: string) => {
    const found = list.find((item) => item.id === id);
    return found ? found.name || found.code : id;
  };
  const MAX = 8;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-surface p-4 text-sm"
      data-testid="dataset-problems"
    >
      <p className="flex items-center gap-2 font-medium text-danger">
        <TriangleAlert className="size-4" aria-hidden />
        {t('problems.title')}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        {problems.slice(0, MAX).map((problem, index) => (
          <li key={index}>
            {'alternativeId' in problem
              ? t(`problems.cell.${problem.code}`, {
                  alternative: name(dataset.alternatives, problem.alternativeId),
                  criterion: name(dataset.criteria, problem.criterionId),
                  term: problem.term ?? '',
                })
              : t(`problems.${problem.code}`)}
          </li>
        ))}
      </ul>
      {problems.length > MAX && (
        <p className="mt-1 text-muted-foreground">
          {t('problems.more', { count: problems.length - MAX })}
        </p>
      )}
      <Link to="/matrix" className="mt-2 inline-block font-medium text-primary underline">
        {t('problems.fix')}
      </Link>
    </div>
  );
}

/** Errors the engine reported for a run that did not start. */
export function ValidationProblems({ validation }: { validation: ValidationResult }) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-surface p-4 text-sm"
      data-testid="validation-problems"
    >
      <p className="flex items-center gap-2 font-medium text-danger">
        <TriangleAlert className="size-4" aria-hidden />
        {t('problems.validation')}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        {validation.errors.map((issue, index) => (
          <li key={`${issue.code}-${index}`}>{message(issue.messageKey, issue.params)}</li>
        ))}
      </ul>
    </div>
  );
}
