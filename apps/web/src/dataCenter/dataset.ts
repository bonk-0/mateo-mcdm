import { DEFAULT_IMPORT_SCALES, type ProposedModel } from '@mateo/io';
import {
  addDataset,
  composeCommands,
  putScale,
  type CellValue,
  type Dataset,
  type LinguisticScale,
  type ModelAlternative,
  type ModelCommand,
  type ModelCriterion,
} from '@mateo/project';
import { projectScaleFrom, uniqueScaleId } from '../editor/projectScale';

export interface DatasetFromImport {
  readonly dataset: Dataset;
  readonly command: ModelCommand;
}

export interface DatasetFromImportOptions {
  readonly name: string;
  readonly newId: () => string;
  /** ISO 8601 UTC timestamp. */
  readonly now: string;
  /** Scales the project already has; linguistic criteria reuse a copy of the same scale. */
  readonly scales: readonly LinguisticScale[];
}

function literal(name: { readonly text: string } | { readonly key: string }): string {
  return 'text' in name ? name.text : name.key;
}

/**
 * Turns a confirmed import into a dataset and the command that adds it to the project.
 * Cells the file has no value for stay empty. The caller must not confirm an import
 * whose validation has errors or whose criteria have no direction.
 *
 * `directions[i]` is the direction the user chose for criterion `i` when the file did not
 * say; nothing is assumed here.
 */
export function datasetFromImport(
  model: ProposedModel,
  directions: readonly ('benefit' | 'cost')[],
  options: DatasetFromImportOptions,
): DatasetFromImport {
  const scaleCommands: ModelCommand[] = [];
  const projectScales: LinguisticScale[] = [...options.scales];
  const scaleIds = new Map<string, string>();
  const scaleFor = (sourceId: string): string | null => {
    const known = scaleIds.get(sourceId);
    if (known !== undefined) return known;
    const existing = projectScales.find((scale) => scale.sourceId === sourceId);
    if (existing) {
      scaleIds.set(sourceId, existing.id);
      return existing.id;
    }
    const source = DEFAULT_IMPORT_SCALES.find((scale) => scale.id === sourceId);
    if (!source) return null;
    const copy = projectScaleFrom(source, uniqueScaleId(source.id, projectScales));
    projectScales.push(copy);
    scaleCommands.push(putScale(copy));
    scaleIds.set(sourceId, copy.id);
    return copy.id;
  };

  const criteria: ModelCriterion[] = model.criteria.map((criterion, index) => ({
    id: options.newId(),
    code: `C${index + 1}`,
    name: literal(criterion.name),
    description: '',
    direction: criterion.direction ?? directions[index] ?? 'benefit',
    unit: criterion.unit ?? '',
    numberType: criterion.numberType,
    scaleId: criterion.scaleId === undefined ? null : scaleFor(criterion.scaleId),
  }));
  const alternatives: ModelAlternative[] = model.alternatives.map((alternative, index) => ({
    id: options.newId(),
    code: `A${index + 1}`,
    name: literal(alternative.name),
    description: '',
    group: '',
  }));

  const cells: Record<string, Record<string, CellValue>> = {};
  model.values.forEach((row, i) => {
    const alternative = alternatives[i];
    if (!alternative) return;
    const cellsOfRow: Record<string, CellValue> = {};
    row.forEach((value, j) => {
      const criterion = criteria[j];
      if (!criterion || value === null || value === undefined) return;
      const term = model.origins[i]?.[j]?.term;
      if (term !== undefined && criterion.scaleId !== null) {
        cellsOfRow[criterion.id] = { kind: 'term', termId: term };
      } else if (typeof value === 'number') {
        cellsOfRow[criterion.id] = { kind: 'crisp', value };
      } else {
        cellsOfRow[criterion.id] = { kind: 'tfn', value: { l: value.l, m: value.m, u: value.u } };
      }
    });
    cells[alternative.id] = cellsOfRow;
  });

  const dataset: Dataset = {
    id: options.newId(),
    name: options.name,
    description: '',
    createdAt: options.now,
    criteria,
    alternatives,
    matrices: [{ id: options.newId(), name: 'Decision matrix', role: 'decision', cells }],
  };
  const command = composeCommands([...scaleCommands, addDataset(dataset)], {
    type: 'dataset.add',
    labelKey: 'project.command.dataset.add',
  });
  return { dataset, command };
}
