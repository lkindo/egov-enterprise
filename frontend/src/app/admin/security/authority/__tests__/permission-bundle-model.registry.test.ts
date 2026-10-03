import { describe, expect, it } from 'vitest';
import { PERMISSION_BUNDLES, SCREEN_REGISTRY } from '@/types/generated-screen-registry';
import { OPEN_SCREEN_EXAMPLE_ROUTES, OPEN_SCREEN_NOTICE } from '../components/PermissionBundleDialog';
import { previewBundle, unnamedScreenLabel } from '../components/permission-bundle-model';

/**
 * '권한 묶음 적용' 미리보기와 실제 생성물(화면 목록·권한 묶음)의 정합(2026-10-03, 선택지 ①).
 *
 * 묶음·화면의 구성은 원장과 화면 소스가 바뀔 때마다 바뀌므로 특정 묶음의 화면 수를 단언하지 않는다(그것은 고정 목록을 쓰는
 * permission-bundle-model.test.ts 와 생성기 계약의 몫이다). 여기서는 생성물이 어떻게 바뀌어도 참이어야 하는 것만 본다:
 *   · 고정 안내가 예로 드는 화면은 실제로 누구나 들어가고 쓰기가 없어 어느 묶음도 그 메뉴를 더하지 않는다.
 *   · 미리보기는 이름이 없는 화면의 경로를 화면 이름처럼 보이지 않는다.
 */
const registered = new Map(SCREEN_REGISTRY.map((screen) => [screen.route, screen]));

describe('권한 묶음 미리보기 — 실제 화면 목록과의 정합', () => {
  it('고정 안내가 예로 드는 화면은 누구나 들어가고 쓰기가 없어 어느 묶음의 화면·관련 화면에도 없다', () => {
    for (const route of OPEN_SCREEN_EXAMPLE_ROUTES) {
      const screen = registered.get(route);
      expect(screen, `${route} 는 화면 목록에 있다`).toBeDefined();
      expect(screen!.label, `${route} 는 이름이 있다(안내가 이름으로 부른다)`).toBeTruthy();
      expect(screen!.entry.permissions, `${route} 는 진입 권한이 없다`).toEqual([]);
      // 관련 화면은 쓰기('write') 권한으로 고른다 — 쓰기가 생기면 어떤 묶음의 관련 화면이 되어 안내의 예가 거짓이 된다.
      expect(screen!.permissions.filter((row) => row.source === 'write'), `${route} 에는 쓰기가 없다`).toEqual([]);
      for (const bundle of PERMISSION_BUNDLES) {
        expect(bundle.screens, `${bundle.id} 가 ${route} 를 열지 않는다`).not.toContain(route);
        expect(bundle.relatedScreens, `${bundle.id} 가 ${route} 의 메뉴를 더하지 않는다`).not.toContain(route);
      }
      expect(OPEN_SCREEN_NOTICE).toContain(screen!.label!);
    }
  });

  /*
   * [2026-10-03] 라우트 원장에 남아 있던 이름 미확인 화면 6개에 페이지 제목을 채워(화면 목록 labels none=0) 이제 묶음이
   * 여는 화면은 모두 등록된 이름으로 보인다. 이름이 없을 때 '이름 미확인 화면(주소 …)' 으로 보이는 규칙은 모델 단위 테스트가
   * 합성 화면으로 고정한다(permission-bundle-model.test.ts).
   */
  it('미리보기는 묶음이 여는 화면을 경로가 아니라 등록된 이름으로 보이고, 이름 없는 화면이 다시 생기면 대체 문구를 쓴다', () => {
    let named = 0;
    for (const bundle of PERMISSION_BUNDLES) {
      const preview = previewBundle(bundle, new Set(), []);
      for (const screen of [...preview.screens, ...preview.relatedScreens]) {
        expect(screen.label, `${bundle.id}: ${screen.route}`).not.toBe(screen.route);
        const label = registered.get(screen.route)?.label;
        if (label) {
          expect(screen.label).toBe(label);
          named += 1;
        } else {
          expect(screen.label).toBe(unnamedScreenLabel(screen.route));
        }
      }
    }
    expect(named, '묶음이 여는 화면이 있다').toBeGreaterThan(0);
    expect(SCREEN_REGISTRY.filter((screen) => !screen.label).map((screen) => screen.route), '이름 미확인 화면').toEqual([]);
  });
});
