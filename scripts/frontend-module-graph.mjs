/**
 * 프런트 모듈 그래프의 공용 판정 — import·re-export·require·createRequire·동적 import 지정자를 읽는 토크나이저와 파서.
 *
 * 도달성 census 와 재사용 base 생성기(정밀 점검 포함)가 같은 함수로 간선을 읽는다(슬롯 단계 PR-2 판정 통일).
 * 주석·문자열·정규식 속 import 인용은 간선이 아니다. 판정할 수 없는 문법(계산된 동적 import, import.meta.glob,
 * require.context 등)은 건너뛰지 않고 issue 로 돌려준다 — census 는 issue 로 쌓고, 생성기는 실패한다.
 * 생성기는 의존성 설치 전에 돌므로 Node 내장 모듈만 쓴다(운영 계약 frontend-reachability-census.test.mjs 의 import 폐포 시험이
 * 지킨다 — reusable-base·custom 잡은 루트 설치 없이 돌아 늦게 붉고, 지연 로드 경로는 실행하지 않으므로 운영 계약 단계로 앞당긴다).
 * 지정자를 파일로 잇는 해석기는 형제 모듈 frontend-module-resolver.mjs 에 있다.
 */
import {
  canStartRegexAfterValue,
  readQuoted,
  readRegexLiteral,
  readTemplate,
  skipBlockComment,
  skipLineComment,
} from './source-lexing.mjs';

/*
 * 정규식 리터럴은 직전 토큰이 구두점이나 키워드 식별자일 때만 시작한다. 문자열·템플릿·정규식·숫자 리터럴 뒤의 '/' 는 나눗셈이다 —
 * 값만 보면 문자열 값 ':'·'?'·'|' 뒤의 '/' 를 정규식 시작으로 읽어 그 뒤 코드를 삼킨다(JSX 의 `char=":" /><a href="/x/y">`).
 */
/*
 * 숫자 리터럴(1.·.5·1e5·0x1F·0o7·0b1·1_000·10n)은 한 토큰이다. 글자마다 끊으면 끝에 점이 붙은 숫자(`1.`)의 '.' 를 멤버 접근으로
 * 읽어 다음 줄의 import·require 를 멤버 이름으로 건너뛴다(issue 도 없이 간선이 사라진다). 시작은 숫자 글자이거나 숫자 글자가 뒤따르는 '.' 다.
 */
const NUMBER_LITERAL = /(?:0[xX][\da-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)n?/y;

function regexCanStartAfter(previous) {
  if (!previous) return true;
  if (previous.type !== 'punctuation' && previous.type !== 'identifier') return false;
  return canStartRegexAfterValue(previous.value);
}

/**
 * A dependency-oriented lexer. It intentionally tokenizes only identifiers,
 * string/template/number literals, and punctuation needed by import syntax. JSX and
 * regular-expression tokens remain harmless punctuation/identifiers; an import
 * declaration is accepted only when it satisfies the module grammar below.
 * The census also uses the tokens to read config string references, and the
 * single-module contract uses them to find marker parsers outside the projector.
 */
export function tokenizeDependencies(source, file) {
  const tokens = [];
  const issues = [];
  let line = 1;

  for (let index = 0; index < source.length;) {
    const char = source[index];
    const next = source[index + 1];
    if (/\s/.test(char)) {
      if (char === '\n') line += 1;
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      index = skipLineComment(source, index);
      continue;
    }
    if (char === '/' && next === '*') {
      const end = skipBlockComment(source, index);
      if (end < 0) {
        issues.push({ code: 'UNTERMINATED_BLOCK_COMMENT', file, line });
        break;
      }
      line += source.slice(index, end).split('\n').length - 1;
      index = end;
      continue;
    }
    if (char === "'" || char === '"') {
      const quoted = readQuoted(source, index, char);
      tokens.push({ type: 'string', value: quoted.value, line, start: index, end: quoted.end });
      if (!quoted.closed) issues.push({ code: 'UNTERMINATED_STRING', file, line });
      line += source.slice(index, quoted.end).split('\n').length - 1;
      index = quoted.end;
      continue;
    }
    if (char === '`') {
      const template = readTemplate(source, index);
      tokens.push({
        type: 'template',
        value: template.value,
        interpolated: template.interpolated,
        line,
        start: index,
        end: template.end,
      });
      if (!template.closed) issues.push({ code: 'UNTERMINATED_TEMPLATE', file, line });
      if (template.containsDependencyKeyword) {
        issues.push({
          code: 'DEPENDENCY_EXPRESSION_IN_TEMPLATE_INTERPOLATION',
          file,
          line,
          detail: 'import/require inside a template interpolation is not silently ignored',
        });
      }
      line += source.slice(index, template.end).split('\n').length - 1;
      index = template.end;
      continue;
    }
    if (char === '/' && regexCanStartAfter(tokens.at(-1))) {
      const regex = readRegexLiteral(source, index);
      if (regex) {
        tokens.push({ type: 'regex', value: '<regex>', line, start: index, end: regex.end });
        index = regex.end;
        continue;
      }
    }
    if (/\d/.test(char) || (char === '.' && /\d/.test(next ?? ''))) {
      NUMBER_LITERAL.lastIndex = index;
      const end = NUMBER_LITERAL.exec(source) ? NUMBER_LITERAL.lastIndex : index + 1;
      tokens.push({ type: 'number', value: source.slice(index, end), line, start: index, end });
      index = end;
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_$-]/.test(source[end])) end += 1;
      tokens.push({ type: 'identifier', value: source.slice(index, end), line, start: index, end });
      index = end;
      continue;
    }
    if (source.startsWith('...', index)) {
      tokens.push({ type: 'punctuation', value: '...', line, start: index, end: index + 3 });
      index += 3;
      continue;
    }
    if (source.startsWith('=>', index)) {
      tokens.push({ type: 'punctuation', value: '=>', line, start: index, end: index + 2 });
      index += 2;
      continue;
    }
    tokens.push({ type: 'punctuation', value: char, line, start: index, end: index + 1 });
    index += 1;
  }

  return { tokens, issues };
}

function literalSpecifier(token) {
  if (token?.type === 'string') return { value: token.value };
  if (token?.type === 'template' && !token.interpolated) return { value: token.value };
  return undefined;
}

function findBalanced(tokens, start, open, close) {
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].value === open) depth += 1;
    else if (tokens[index].value === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function namedImportClauseIsTypeOnly(tokens, open, close) {
  const clauses = [];
  let clause = [];
  for (let index = open + 1; index < close; index += 1) {
    if (tokens[index].value === ',') {
      if (clause.length > 0) clauses.push(clause);
      clause = [];
    } else {
      clause.push(tokens[index]);
    }
  }
  if (clause.length > 0) clauses.push(clause);
  return clauses.length > 0 && clauses.every((tokensInClause) => (
    tokensInClause[0]?.value === 'type' && tokensInClause.length > 1
  ));
}

function isTypeImportExpression(tokens, importIndex) {
  let previous = importIndex - 1;
  if ([':', 'as', 'satisfies'].includes(tokens[previous]?.value)) return true;
  if (tokens[previous]?.value === 'typeof') previous -= 1;

  let angleDepth = 0;
  for (let index = previous; index >= 0; index -= 1) {
    const value = tokens[index].value;
    if (value === '>') angleDepth += 1;
    else if (value === '<') {
      if (angleDepth === 0) return true;
      angleDepth -= 1;
    }
    if ([';', '{', '}'].includes(value)) break;
    if (value === '=' && tokens[index - 2]?.value === 'type') return true;
  }
  return false;
}

function isMemberOrDeclarationName(previous) {
  return (previous?.type === 'punctuation' && previous.value === '.')
    || (previous?.type === 'identifier' && previous.value === 'function');
}

function dependencyIssue(code, file, token, detail) {
  return { code, file, line: token?.line ?? 1, detail };
}

function parseStaticImport(tokens, start, file) {
  let index = start + 1;
  let typeOnly = false;
  const first = tokens[index];
  const bare = literalSpecifier(first);
  if (bare) {
    return {
      nextIndex: index,
      reference: { kind: 'static-import', specifier: bare.value, typeOnly: false, line: tokens[start].line },
    };
  }
  if (first?.value === 'type') {
    typeOnly = true;
    index += 1;
  }

  const binding = tokens[index];
  if (!binding || !(
    binding.type === 'identifier'
    || binding.value === '{'
    || binding.value === '*'
  )) return undefined;

  if (binding.type === 'identifier') {
    index += 1;
    if (tokens[index]?.value === '=' && tokens[index + 1]?.value === 'require') {
      return undefined;
    }
    if (tokens[index]?.value === ',') index += 1;
    else if (tokens[index]?.value !== 'from') {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'expected from after default binding'),
      };
    }
  }

  if (tokens[index]?.value === '{') {
    const close = findBalanced(tokens, index, '{', '}');
    if (close < 0) {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'unclosed named import clause'),
      };
    }
    if (!typeOnly && binding.value === '{') typeOnly = namedImportClauseIsTypeOnly(tokens, index, close);
    index = close + 1;
  } else if (tokens[index]?.value === '*') {
    if (tokens[index + 1]?.value !== 'as' || tokens[index + 2]?.type !== 'identifier') {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'invalid namespace import clause'),
      };
    }
    index += 3;
  }

  if (tokens[index]?.value !== 'from') {
    return {
      nextIndex: index,
      issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'missing from clause'),
    };
  }
  const specifier = literalSpecifier(tokens[index + 1]);
  if (!specifier) {
    return {
      nextIndex: index + 1,
      issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'module specifier is not a literal'),
    };
  }
  return {
    nextIndex: index + 1,
    reference: { kind: 'static-import', specifier: specifier.value, typeOnly, line: tokens[start].line },
  };
}

function parseReExport(tokens, start, file) {
  let index = start + 1;
  let typeOnly = false;
  if (tokens[index]?.value === 'type') {
    typeOnly = true;
    index += 1;
  }
  if (tokens[index]?.value === '{') {
    const close = findBalanced(tokens, index, '{', '}');
    if (close < 0) {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'unclosed export clause'),
      };
    }
    index = close + 1;
    if (tokens[index]?.value !== 'from') return { nextIndex: close };
  } else if (tokens[index]?.value === '*') {
    index += 1;
    if (tokens[index]?.value === 'as') {
      if (tokens[index + 1]?.type !== 'identifier') {
        return {
          nextIndex: index,
          issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'invalid namespace export'),
        };
      }
      index += 2;
    }
    if (tokens[index]?.value !== 'from') {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'missing from clause'),
      };
    }
  } else {
    return undefined;
  }

  const specifier = literalSpecifier(tokens[index + 1]);
  if (!specifier) {
    return {
      nextIndex: index + 1,
      issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'module specifier is not a literal'),
    };
  }
  return {
    nextIndex: index + 1,
    reference: { kind: 're-export', specifier: specifier.value, typeOnly, line: tokens[start].line },
  };
}

/** Parse static imports, re-exports, literal dynamic imports, and require calls. */
export function parseModuleReferences(source, file = '<memory>') {
  const { tokens, issues } = tokenizeDependencies(source, file);
  const references = [];
  const createRequireAliases = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].value !== 'createRequire' || tokens[index + 1]?.value !== '(') continue;
    const factoryClose = findBalanced(tokens, index + 1, '(', ')');
    if (factoryClose >= 0 && tokens[factoryClose + 1]?.value === '(') {
      const argument = literalSpecifier(tokens[factoryClose + 2]);
      if (!argument || tokens[factoryClose + 3]?.value !== ')') {
        issues.push(dependencyIssue(
          'UNPARSEABLE_CREATE_REQUIRE_CALL',
          file,
          tokens[index],
          'immediate createRequire argument must be one literal module specifier',
        ));
      } else {
        references.push({ kind: 'create-require', specifier: argument.value, typeOnly: false, line: tokens[index].line });
      }
      continue;
    }
    if (tokens[index - 1]?.value === '=' && tokens[index - 2]?.type === 'identifier') {
      createRequireAliases.add(tokens[index - 2].value);
    } else {
      issues.push(dependencyIssue(
        'UNSUPPORTED_CREATE_REQUIRE_ALIAS',
        file,
        tokens[index],
        'createRequire must be assigned to one local identifier for dependency tracking',
      ));
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'identifier') continue;
    // 멤버 이름(obj.import(…)·api.require(…))과 함수 선언 이름(declare function require(id))은 모듈 참조가 아니다. 스프레드 `...` 는
    // 따로 된 토큰이라 영향이 없다. 메서드 정의(import(file) {…})는 가려내지 않는다 — 판정할 수 없는 동적 import 로 실패한다(fail-closed).
    if ((token.value === 'import' || token.value === 'require') && isMemberOrDeclarationName(tokens[index - 1])) continue;

    if (token.value === 'import') {
      if (tokens[index + 1]?.value === '.') {
        if (tokens[index + 2]?.value === 'meta' && tokens[index + 3]?.value === '.'
          && /^glob(?:Eager)?$/.test(tokens[index + 4]?.value ?? '')) {
          issues.push(dependencyIssue(
            'UNSUPPORTED_IMPORT_META_GLOB',
            file,
            token,
            'import.meta.glob creates implicit dependencies and needs an explicit parser rule',
          ));
        }
        continue;
      }
      if (tokens[index + 1]?.value === '(') {
        const argument = literalSpecifier(tokens[index + 2]);
        if (!argument || tokens[index + 3]?.value !== ')') {
          const code = argument && tokens[index + 3]?.value === ','
            ? 'UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS'
            : 'UNPARSEABLE_DYNAMIC_IMPORT';
          issues.push(dependencyIssue(
            code,
            file,
            token,
            code === 'UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS'
              ? 'dynamic import options require an explicit balanced parser rule'
              : 'dynamic import first argument must be one literal module specifier',
          ));
        } else {
          const typeOnly = isTypeImportExpression(tokens, index);
          references.push({
            kind: typeOnly ? 'import-type' : 'dynamic-import',
            specifier: argument.value,
            typeOnly,
            line: token.line,
          });
        }
        continue;
      }
      const parsed = parseStaticImport(tokens, index, file);
      if (parsed?.reference) references.push(parsed.reference);
      if (parsed?.issue) issues.push(parsed.issue);
      if (parsed) index = Math.max(index, parsed.nextIndex);
      continue;
    }

    if (token.value === 'export') {
      const parsed = parseReExport(tokens, index, file);
      if (parsed?.reference) references.push(parsed.reference);
      if (parsed?.issue) issues.push(parsed.issue);
      if (parsed) index = Math.max(index, parsed.nextIndex);
      continue;
    }

    if (token.value === 'require') {
      if (tokens[index + 1]?.value === '.' && tokens[index + 2]?.value === 'context') {
        issues.push(dependencyIssue(
          'UNSUPPORTED_REQUIRE_CONTEXT',
          file,
          token,
          'require.context creates implicit dependencies and needs an explicit parser rule',
        ));
        continue;
      }
      if (tokens[index + 1]?.value === '.' && tokens[index + 2]?.value === 'resolve') {
        const argument = literalSpecifier(tokens[index + 4]);
        if (tokens[index + 3]?.value !== '(' || !argument || tokens[index + 5]?.value !== ')') {
          issues.push(dependencyIssue(
            'UNPARSEABLE_REQUIRE_RESOLVE',
            file,
            token,
            'require.resolve argument must be one literal module specifier',
          ));
        } else {
          references.push({ kind: 'require-resolve', specifier: argument.value, typeOnly: false, line: token.line });
        }
        continue;
      }
      if (tokens[index + 1]?.value !== '(') continue;
      const argument = literalSpecifier(tokens[index + 2]);
      if (!argument || tokens[index + 3]?.value !== ')') {
        issues.push(dependencyIssue(
          'UNPARSEABLE_REQUIRE',
          file,
          token,
          'require argument must be one literal module specifier',
        ));
      } else {
        references.push({ kind: 'require', specifier: argument.value, typeOnly: false, line: token.line });
      }
    }

    if (createRequireAliases.has(token.value) && tokens[index + 1]?.value === '(') {
      const argument = literalSpecifier(tokens[index + 2]);
      if (!argument || tokens[index + 3]?.value !== ')') {
        issues.push(dependencyIssue(
          'UNPARSEABLE_CREATE_REQUIRE_CALL',
          file,
          token,
          'createRequire alias argument must be one literal module specifier',
        ));
      } else {
        references.push({ kind: 'create-require', specifier: argument.value, typeOnly: false, line: token.line });
      }
    }
  }

  const deduplicated = new Map();
  for (const reference of references) {
    const key = `${reference.kind}\0${reference.typeOnly}\0${reference.specifier}\0${reference.line}`;
    deduplicated.set(key, reference);
  }
  return { references: [...deduplicated.values()], issues };
}
