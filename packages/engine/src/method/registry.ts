import { EngineError } from '../errors';
import type { NumberTypeId } from '../model/number-type';
import type { AnyMethod, Method, MethodCategory } from './method';
import { METHOD_CATEGORIES, METHOD_REQUIREMENTS } from './method';
import type { ParameterSchema } from './parameters';
import { parameterSchemaProblems } from './parameters';

const ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/** Problems of a method descriptor. Empty when it can be registered. */
export function methodDescriptorProblems(method: AnyMethod): string[] {
  const problems: string[] = [];
  if (typeof method.id !== 'string' || !ID_PATTERN.test(method.id)) {
    problems.push('the id must be kebab-case (lowercase letters, digits and single hyphens)');
  }
  if (typeof method.version !== 'string' || !VERSION_PATTERN.test(method.version)) {
    problems.push('the version must be a semantic version such as 1.0.0');
  }
  if (!METHOD_CATEGORIES.includes(method.category)) {
    problems.push(`unknown category "${String(method.category)}"`);
  }
  if (typeof method.nameKey !== 'string' || method.nameKey === '') {
    problems.push('the name key is missing');
  }
  if (!Array.isArray(method.supportedNumberTypes) || method.supportedNumberTypes.length === 0) {
    problems.push('at least one supported number type is required');
  }
  for (const [label, slots] of [
    ['input', method.inputSchema],
    ['output', method.outputSchema],
  ] as const) {
    if (!Array.isArray(slots)) {
      problems.push(`the ${label} schema is missing`);
      continue;
    }
    const names = slots.map((slot: { readonly name: string }) => slot.name);
    if (new Set(names).size !== names.length) {
      problems.push(`the ${label} schema has duplicate slot names`);
    }
  }
  if (typeof method.parameters !== 'object' || method.parameters === null) {
    problems.push('the parameter schema is missing');
  } else {
    problems.push(...parameterSchemaProblems(method.parameters));
  }
  if (!Array.isArray(method.references)) problems.push('the references list is missing');
  if (
    method.requires !== undefined &&
    !(
      Array.isArray(method.requires) &&
      (method.requires as readonly unknown[]).every((requirement) =>
        (METHOD_REQUIREMENTS as readonly unknown[]).includes(requirement),
      )
    )
  ) {
    problems.push('requires lists an unknown requirement');
  }
  if (typeof method.validate !== 'function' || typeof method.run !== 'function') {
    problems.push('validate and run must be functions');
  }
  return problems;
}

export interface MethodFilter {
  readonly category?: MethodCategory;
  /** Only methods that support this number type. */
  readonly numberType?: NumberTypeId;
}

/**
 * The set of methods an application offers. A registry is a plain object created by
 * `createMethodRegistry`; the engine keeps no global state.
 */
export interface MethodRegistry {
  /** Adds a method. Throws on an invalid descriptor or an id that is already taken. */
  register<TInput, TSchema extends ParameterSchema, TResult>(
    method: Method<TInput, TSchema, TResult>,
  ): void;
  has(id: string): boolean;
  /** The method with the given id, or `undefined`. */
  find(id: string): AnyMethod | undefined;
  /** The method with the given id. Throws `EngineError('UNKNOWN_METHOD')` when missing. */
  get(id: string): AnyMethod;
  /** Methods in registration order, optionally filtered. */
  list(filter?: MethodFilter): AnyMethod[];
}

export function createMethodRegistry(initial: readonly AnyMethod[] = []): MethodRegistry {
  const methods = new Map<string, AnyMethod>();

  const registry: MethodRegistry = {
    register(method) {
      const erased = method as AnyMethod;
      const problems = methodDescriptorProblems(erased);
      if (problems.length > 0) {
        throw new EngineError(
          'INVALID_METHOD',
          `Method "${String(erased.id)}" cannot be registered: ${problems.join('; ')}.`,
          { id: erased.id, problems },
        );
      }
      if (methods.has(erased.id)) {
        throw new EngineError('DUPLICATE_ID', `A method "${erased.id}" is already registered.`, {
          id: erased.id,
        });
      }
      methods.set(erased.id, erased);
    },
    has: (id) => methods.has(id),
    find: (id) => methods.get(id),
    get(id) {
      const method = methods.get(id);
      if (method === undefined) {
        throw new EngineError('UNKNOWN_METHOD', `No method "${id}" is registered.`, { id });
      }
      return method;
    },
    list(filter = {}) {
      return [...methods.values()].filter(
        (method) =>
          (filter.category === undefined || method.category === filter.category) &&
          (filter.numberType === undefined ||
            method.supportedNumberTypes.includes(filter.numberType)),
      );
    },
  };

  initial.forEach((method) => registry.register(method));
  return registry;
}
