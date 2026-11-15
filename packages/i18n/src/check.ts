/**
 * Consistency check for translation catalogs.
 *
 * Every shipped language must contain exactly the keys of the source language, with valid
 * ICU messages that use the same arguments. CI runs this through `pnpm i18n:check`
 * (tooling/check-i18n.ts) and fails on any issue.
 *
 * This file only depends on the ICU parser so that the CLI can load it with Node's
 * built-in TypeScript support.
 */
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';

/** A namespace's messages: nested objects whose leaves are ICU message strings. */
export interface CatalogTree {
  readonly [key: string]: string | CatalogTree;
}

/** `language -> namespace -> messages`. */
export type CatalogSet = Readonly<Record<string, Readonly<Record<string, CatalogTree>>>>;

export type CatalogIssueCode =
  | 'missing-namespace'
  | 'unused-namespace'
  | 'missing-key'
  | 'unused-key'
  | 'empty-message'
  | 'invalid-message'
  | 'argument-mismatch'
  | 'not-a-string';

export interface CatalogIssue {
  readonly code: CatalogIssueCode;
  readonly language: string;
  readonly namespace: string;
  /** Dot-separated key path; empty for namespace-level issues. */
  readonly key: string;
  readonly detail: string;
}

/** Flattens a namespace into `dot.separated.key -> value`. Non-string leaves are kept as-is. */
export function flattenCatalog(tree: CatalogTree, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of flattenCatalog(value, path)) out.set(k, v);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

function collectArguments(elements: readonly MessageFormatElement[], into: Set<string>): void {
  for (const el of elements) {
    switch (el.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        into.add(el.value);
        break;
      case TYPE.plural:
      case TYPE.select:
        into.add(el.value);
        for (const option of Object.values(el.options)) collectArguments(option.value, into);
        break;
      case TYPE.tag:
        into.add(`<${el.value}>`);
        collectArguments(el.children, into);
        break;
      default:
        break;
    }
  }
}

/** Parses an ICU message and returns its argument names, or the parse error message. */
export function messageArguments(message: string): { args: Set<string> } | { error: string } {
  try {
    const args = new Set<string>();
    collectArguments(parse(message, { ignoreTag: false }), args);
    return { args };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

const fmt = (set: ReadonlySet<string>) => (set.size ? [...set].sort().join(', ') : 'none');

/**
 * Compares every language in `catalogs` with `sourceLanguage` and validates each message.
 * Returns an empty array when the catalogs are consistent.
 */
export function checkCatalogs(catalogs: CatalogSet, sourceLanguage: string): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const source = catalogs[sourceLanguage];
  if (!source) {
    return [
      {
        code: 'missing-namespace',
        language: sourceLanguage,
        namespace: '*',
        key: '',
        detail: `The source language "${sourceLanguage}" has no catalogs.`,
      },
    ];
  }

  const sourceFlat = new Map(
    Object.entries(source).map(([ns, tree]) => [ns, flattenCatalog(tree)]),
  );
  const sourceArgs = new Map<string, Set<string>>();

  for (const [language, namespaces] of Object.entries(catalogs)) {
    const nsNames = new Set([...Object.keys(source), ...Object.keys(namespaces)]);
    for (const namespace of [...nsNames].sort()) {
      const issue = (code: CatalogIssueCode, key: string, detail: string) =>
        issues.push({ code, language, namespace, key, detail });

      const tree = namespaces[namespace];
      const expected = sourceFlat.get(namespace);
      if (!tree) {
        issue('missing-namespace', '', `Namespace "${namespace}" is missing.`);
        continue;
      }
      if (!expected) {
        issue(
          'unused-namespace',
          '',
          `Namespace "${namespace}" does not exist in "${sourceLanguage}".`,
        );
        continue;
      }

      const flat = flattenCatalog(tree);
      for (const key of expected.keys()) {
        if (!flat.has(key)) issue('missing-key', key, 'Key is missing.');
      }
      for (const [key, value] of flat) {
        if (!expected.has(key)) {
          issue('unused-key', key, `Key does not exist in "${sourceLanguage}".`);
          continue;
        }
        if (typeof value !== 'string') {
          issue('not-a-string', key, `Expected a string, found ${typeof value}.`);
          continue;
        }
        if (value.trim() === '') {
          issue('empty-message', key, 'Message is empty.');
          continue;
        }
        const parsed = messageArguments(value);
        if ('error' in parsed) {
          issue('invalid-message', key, `Invalid ICU message: ${parsed.error}`);
          continue;
        }
        const id = `${namespace}:${key}`;
        if (language === sourceLanguage) {
          sourceArgs.set(id, parsed.args);
          continue;
        }
        const reference = sourceArgs.get(id) ?? messageArgumentsOrEmpty(expected.get(key));
        if (!sameSet(reference, parsed.args)) {
          issue(
            'argument-mismatch',
            key,
            `Arguments differ: ${sourceLanguage} uses {${fmt(reference)}}, ${language} uses {${fmt(parsed.args)}}.`,
          );
        }
      }
    }
  }
  return issues;
}

function messageArgumentsOrEmpty(value: unknown): Set<string> {
  if (typeof value !== 'string') return new Set();
  const parsed = messageArguments(value);
  return 'args' in parsed ? parsed.args : new Set();
}

/** One line per issue, for CLI output. */
export function formatCatalogIssues(issues: readonly CatalogIssue[]): string {
  return issues
    .map((i) => `[${i.code}] ${i.language}/${i.namespace}${i.key ? `:${i.key}` : ''}: ${i.detail}`)
    .join('\n');
}
