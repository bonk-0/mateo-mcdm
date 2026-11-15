import type { TextParams } from '../model/text';
import type { Severity, ValidationIssue, ValidationLocation, ValidationResult } from './types';

export interface IssueOptions {
  /** Defaults to `validation.<code>`. */
  readonly messageKey?: string;
  readonly params?: TextParams;
  readonly location?: ValidationLocation;
}

/** Default i18n key of an issue code. */
export function messageKeyForCode(code: string): string {
  return `validation.${code}`;
}

export function createIssue(
  severity: Severity,
  code: string,
  options: IssueOptions = {},
): ValidationIssue {
  return {
    severity,
    code,
    messageKey: options.messageKey ?? messageKeyForCode(code),
    ...(options.params === undefined ? {} : { params: options.params }),
    ...(options.location === undefined ? {} : { location: options.location }),
  };
}

/**
 * Collects issues in the order they are reported and splits them into errors and warnings.
 *
 * ```ts
 * const v = createValidation();
 * v.add(checkDecisionMatrix(input.matrix));
 * if (input.lambda > 1) v.error('my-method.lambda-too-large', { location: { parameter: 'lambda' } });
 * return v.result();
 * ```
 */
export interface ValidationCollector {
  error(code: string, options?: IssueOptions): void;
  warning(code: string, options?: IssueOptions): void;
  /** Adds issues or a whole result produced elsewhere. */
  add(issues: ValidationResult | readonly ValidationIssue[]): void;
  readonly hasErrors: boolean;
  result(): ValidationResult;
}

export function createValidation(): ValidationCollector {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const push = (issue: ValidationIssue): void => {
    (issue.severity === 'error' ? errors : warnings).push(issue);
  };
  return {
    error: (code, options) => push(createIssue('error', code, options)),
    warning: (code, options) => push(createIssue('warning', code, options)),
    add(issues) {
      const list = isResult(issues) ? [...issues.errors, ...issues.warnings] : issues;
      list.forEach(push);
    },
    get hasErrors() {
      return errors.length > 0;
    },
    result: () => ({ ok: errors.length === 0, errors: [...errors], warnings: [...warnings] }),
  };
}

function isResult(value: ValidationResult | readonly ValidationIssue[]): value is ValidationResult {
  return !Array.isArray(value);
}

/** A result with no issues. */
export const VALID: ValidationResult = Object.freeze({
  ok: true,
  errors: Object.freeze([]),
  warnings: Object.freeze([]),
});

/** Merges results, keeping the order of the arguments. */
export function mergeValidation(...results: readonly ValidationResult[]): ValidationResult {
  const collector = createValidation();
  results.forEach((result) => collector.add(result));
  return collector.result();
}
