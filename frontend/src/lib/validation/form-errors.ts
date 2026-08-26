import type { FieldErrors, FieldValues } from 'react-hook-form';

export interface FlatFormError {
  name: string;
  message?: string;
  ref?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldError(value: Record<string, unknown>): boolean {
  return (
    typeof value.message === 'string'
    || typeof value.type === 'string'
    || 'ref' in value
  );
}

/**
 * react-hook-form 오류 트리를 실제 field path 목록으로 평탄화한다.
 * 객체와 field-array index를 모두 다루며, root 오류도 summary 노출을 위해 보존한다.
 */
export function flattenFormErrors<TFieldValues extends FieldValues = FieldValues>(
  errors: FieldErrors<TFieldValues> | Record<string, unknown>,
): FlatFormError[] {
  const result: FlatFormError[] = [];
  const visited = new WeakSet<object>();

  const visit = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (path) result.push({ name: path, message: value });
      return;
    }
    if (!isRecord(value)) return;

    if (path && isFieldError(value)) {
      result.push({
        name: path,
        message: typeof value.message === 'string' ? value.message : undefined,
        ref: value.ref,
      });
      return;
    }

    if (visited.has(value)) return;
    visited.add(value);

    for (const [key, child] of Object.entries(value)) {
      visit(child, path ? `${path}.${key}` : key);
    }
  };

  visit(errors, '');
  return result;
}
