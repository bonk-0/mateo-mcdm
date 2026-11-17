import {
  analysisTables,
  datasetTables,
  type ExportInfo,
  type ExportLanguage,
  type ExportTable,
  type Translate,
} from '@mateo/io';
import type { Dataset, ProjectDocument, ProjectSession, StoredAnalysis } from '@mateo/project';
import type { i18n as I18n } from 'i18next';
import { PACKAGES_NAMESPACE } from '../i18n/setup';
import { workspaceRegistry } from '../workspace/registry';

/** What the export dialog saves: the tables, and a file name without extension. */
export interface ExportBundle {
  readonly tables: readonly ExportTable[];
  readonly baseName: string;
  readonly info: ExportInfo;
}

/** Produces the bundle in a language. Asynchronous because an analysis reads its snapshot. */
export type ExportSource = (language: ExportLanguage) => Promise<ExportBundle>;

/**
 * A translator for one language, independent of the language of the screen. Keys of the
 * form `matrix:commands.paste` come from the app's own catalog; the rest from the packages.
 */
export function translatorFor(i18n: I18n, language: ExportLanguage): Translate {
  return (key, values) => {
    const own = /^([a-z]+):(.+)$/u.exec(key);
    const getFixedT = i18n.getFixedT.bind(i18n) as unknown as (
      language: string,
      namespace: string,
    ) => (key: string, options?: object) => string;
    return getFixedT(language, own ? own[1]! : PACKAGES_NAMESPACE)(own ? own[2]! : key, values);
  };
}

function infoFor(language: ExportLanguage): ExportInfo {
  return { exportedAt: new Date().toISOString(), appVersion: __APP_VERSION__, language };
}

/** The current state of a dataset, including edits that are not saved yet. */
export function matrixSource(
  i18n: I18n,
  document: ProjectDocument,
  dataset: Dataset,
  fileName: (name: string) => string,
): ExportSource {
  return (language) => {
    const info = infoFor(language);
    const tables = datasetTables(
      dataset,
      document.model.scales,
      document.info,
      info,
      translatorFor(i18n, language),
    );
    return Promise.resolve({ tables, baseName: fileName(dataset.name), info });
  };
}

/** A stored analysis with the dataset it was run on (its snapshot), never the edited one. */
export function analysisSource(
  i18n: I18n,
  session: ProjectSession,
  analysis: StoredAnalysis,
  options: { readonly stale: boolean; readonly fileName: (method: string) => string },
): ExportSource {
  return async (language) => {
    const snapshot = await session.getSnapshot(analysis.snapshotId);
    const info = infoFor(language);
    const t = translatorFor(i18n, language);
    const method = workspaceRegistry().find(analysis.methodId);
    const tables = analysisTables(
      {
        analysis,
        dataset: snapshot.content.dataset,
        scales: snapshot.content.scales,
        project: session.document.info,
        ...(method ? { method } : {}),
        stale: options.stale,
      },
      info,
      t,
    );
    const methodName = method ? t(method.nameKey) : analysis.methodId;
    return { tables, baseName: options.fileName(methodName), info };
  };
}
