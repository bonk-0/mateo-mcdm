import { profileFromImport, type ImportOverrides, type ImportResult } from '@mateo/io';
import { randomId, type JsonValue, type ProjectSession } from '@mateo/project';
import { datasetFromImport } from './dataset';
import { chosenDirections, type ImportInput } from './wizard';

export interface CommitOptions {
  readonly input: ImportInput;
  readonly result: ImportResult;
  readonly overrides: ImportOverrides;
  readonly datasetName: string;
  /** Saves the decisions of this import as a profile with this name. */
  readonly saveProfileAs?: string;
  /** The saved profile this import started from, recorded in the history. */
  readonly appliedProfileId?: string | null;
}

export interface CommitResult {
  readonly datasetId: string;
  readonly sourceFileId: string;
  readonly profileId: string | null;
}

/** Plain JSON copy: drops `undefined` fields, so engine objects can be stored as they are. */
function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

/**
 * Confirms an import: stores the original file in the project, adds the dataset as one
 * undoable edit, optionally saves an import profile, and records the import with the
 * structure decisions and the warnings that were reported.
 */
export async function commitImport(
  session: ProjectSession,
  options: CommitOptions,
): Promise<CommitResult> {
  const { result } = options;
  if (!result.model || !result.validation.ok) {
    throw new Error('An import with errors cannot be confirmed.');
  }
  const { dataset, command } = datasetFromImport(result.model, chosenDirections(result), {
    name: options.datasetName,
    newId: randomId,
    now: new Date().toISOString(),
    scales: session.document.model.scales,
  });
  session.execute(command);
  session.history.sealMerge();

  const file = await session.addSourceFile({
    name: options.input.name,
    mediaType: options.input.mediaType,
    content: options.input.bytes,
  });

  let profileId = options.appliedProfileId ?? null;
  if (options.saveProfileAs !== undefined && options.saveProfileAs.trim() !== '') {
    const definition = profileFromImport(result);
    const saved = await session.saveImportProfile({
      name: options.saveProfileAs.trim(),
      formatVersion: definition.formatVersion,
      definition: toJson(definition),
    });
    profileId = saved.id;
  }

  await session.recordImport({
    datasetId: dataset.id,
    sourceFileId: file.id,
    profileId,
    details: toJson({
      fileName: options.input.name,
      pasted: options.input.pasted,
      source: result.source,
      decisions: result.decisions,
      overrides: options.overrides,
    }),
    issues: toJson(result.validation.warnings),
  });
  return { datasetId: dataset.id, sourceFileId: file.id, profileId };
}
