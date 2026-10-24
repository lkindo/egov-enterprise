import { describe, expect, it } from 'vitest';
import {
  buildPrototypeTokenKit,
  readKitInputs,
  themeColorDeclarations,
} from '../../scripts/prototype-token-kit.mjs';

/**
 * 시안 토큰 키트(DEC-OPS-382) — 저장소 밖 시안이 앱과 같은 값을 쓰게 하는 생성물이다.
 * 키트가 값을 빠뜨리거나 새로 만들면 시안의 대비가 앱과 갈라진다. 그래서 원본과의 동치를 고정한다.
 */
describe('시안 토큰 키트', () => {
  const inputs = readKitInputs();
  const kit = buildPrototypeTokenKit(inputs);
  const tokens = kit['tokens.css'];

  it('globals.css @theme 의 색 매핑을 이름과 값 그대로 모두 옮긴다', () => {
    const declarations = themeColorDeclarations(inputs.globals.css);
    expect(declarations.length).toBeGreaterThan(0);
    for (const { name, value } of declarations) {
      expect(tokens, `${name} 매핑이 빠졌습니다`).toContain(`  ${name}: ${value};`);
    }
  });

  it('브랜드 프로필 CSS 두 장을 고치지 않고 싣는다', () => {
    for (const profile of inputs.profiles) {
      expect(tokens, `${profile.path} 가 그대로 실리지 않았습니다`).toContain(profile.css.trim());
    }
  });

  it('원본에 없는 hex 색을 만들지 않는다', () => {
    const hexes = (text: string) => new Set((text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((hex) => hex.toLowerCase()));
    const allowed = hexes([...inputs.profiles.map((profile) => profile.css), inputs.globals.css].join('\n'));
    const introduced = [...hexes(tokens)].filter((hex) => !allowed.has(hex));
    expect(introduced).toEqual([]);
  });

  it('같은 입력이면 같은 키트를 만든다(생성 시각을 싣지 않는다)', () => {
    expect(buildPrototypeTokenKit(readKitInputs())).toEqual(kit);
    expect(tokens).not.toMatch(/\b20\d\d-\d\d-\d\dT/);
  });
});
