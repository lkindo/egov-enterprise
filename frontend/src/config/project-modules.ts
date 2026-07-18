/**
 * Frontend Project Modules Manifest (SSOT)
 * - 프로젝트 고유 도메인 및 선택적 모듈들의 활성화 상태를 중앙 정의함
 * - 이 설정에 따라 프론트엔드 라우트 및 메뉴 노출 여부가 동적으로 게이팅됨
 */
export interface ProjectModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  basePath: string;
}

// 재사용 base: 샘플 선택 모듈(informalsanction·memoreport·operation)은 제거됐다.
// 신규 프로젝트에서 선택 도메인을 추가할 때 여기에 { id, name, enabled, basePath } 를 등록한다.
export const projectModules: ProjectModuleConfig[] = [];

/**
 * 특정 라우트 경로가 현재 활성화된 모듈에 속하는지 체크함
 */
export function isRouteEnabled(path: string): boolean {
  // 기본 관리자(user, auth, menu 등) 경로는 상시 활성화
  const defaultPaths = ['/admin/user', '/admin/menu', '/admin/program', '/admin/code', '/admin/group', '/admin/dept'];
  if (defaultPaths.some(p => path.startsWith(p))) {
    return true;
  }

  // 모듈 설정 대조
  const targetModule = projectModules.find(m => path.startsWith(m.basePath));
  return targetModule ? targetModule.enabled : true; // 매핑되지 않은 일반 경로는 허용
}
