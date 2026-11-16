import type { ParameterSchema } from '@mateo/engine';
import { useMessage } from '../editor/messages';
import { fieldClass, labelClass } from '../editor/ui';
import type { ParameterValues } from './runnerCore';

/** Form controls for the options of a method, generated from its parameter schema. */
export function ParameterFields({
  schema,
  values,
  onChange,
}: {
  schema: ParameterSchema;
  values: ParameterValues;
  onChange: (values: ParameterValues) => void;
}) {
  const message = useMessage();
  const set = (name: string, value: string | number | boolean) =>
    onChange({ ...values, [name]: value });
  return (
    <div className="space-y-3">
      {Object.entries(schema).map(([name, definition]) => {
        const id = `param-${name}`;
        const description = definition.descriptionKey ? message(definition.descriptionKey) : null;
        const current = values[name] ?? definition.default;
        return (
          <div key={name} className="space-y-1">
            {definition.type === 'boolean' ? (
              <label className="flex items-center gap-2 text-sm font-medium" htmlFor={id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={current === true}
                  onChange={(event) => set(name, event.target.checked)}
                />
                {message(definition.labelKey)}
              </label>
            ) : definition.type === 'enum' ? (
              <>
                <label className={labelClass} htmlFor={id}>
                  {message(definition.labelKey)}
                </label>
                <select
                  id={id}
                  className={`${fieldClass} max-w-xs`}
                  value={String(current)}
                  onChange={(event) => set(name, event.target.value)}
                >
                  {definition.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {message(option.labelKey)}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className={labelClass} htmlFor={id}>
                  {message(definition.labelKey)}
                </label>
                <input
                  id={id}
                  type="number"
                  className={`${fieldClass} max-w-xs`}
                  value={Number(current)}
                  onChange={(event) => set(name, Number(event.target.value))}
                />
              </>
            )}
            {description && (
              <p className="max-w-2xl text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
