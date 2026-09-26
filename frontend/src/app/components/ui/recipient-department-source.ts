import { useMemo } from 'react';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { deptAdminService, type Department } from '@/services/foundation/system/DeptAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';

/** 수신자 피커의 부서 목록 한 줄. `depth` 는 조직도 깊이(최상위 0)다. */
export interface RecipientDepartment {
  id: string;
  name: string;
  depth: number;
}

export interface RecipientDepartmentMember {
  esntlId: string;
  name: string;
  deptNm?: string;
  absent?: boolean;
}

export interface RecipientDepartmentMembers {
  members: RecipientDepartmentMember[];
  /** 서버 상한(200명)을 넘어 일부만 왔는가. */
  truncated: boolean;
}

/** 수신자 피커가 부서 탭을 그릴 때 받는 주입 계약. */
export interface RecipientDepartmentSource {
  listDepartments(): Promise<RecipientDepartment[]>;
  listMembers(departmentId: string): Promise<RecipientDepartmentMembers>;
}

/**
 * 조직도를 위에서 아래로 편다 — 같은 상위 안에서는 정렬 순서·이름 순이다. 상위가 목록에 없는 부서는 최상위로 본다
 * (상위를 잃은 부서가 목록에서 사라지면 그 부서 사람을 고를 수 없다). 순환이 있어도 한 번씩만 싣는다.
 */
export function flattenDepartments(departments: readonly Department[]): RecipientDepartment[] {
  const ids = new Set(departments.map((dept) => dept.ognzId));
  const children = new Map<string, Department[]>();
  const roots: Department[] = [];
  for (const dept of departments) {
    const parent = dept.upOgnzId;
    if (parent && parent !== dept.ognzId && ids.has(parent)) {
      const siblings = children.get(parent) ?? [];
      siblings.push(dept);
      children.set(parent, siblings);
    } else {
      roots.push(dept);
    }
  }
  const order = (a: Department, b: Department) =>
    (a.sortOrdr ?? Number.MAX_SAFE_INTEGER) - (b.sortOrdr ?? Number.MAX_SAFE_INTEGER)
    || (a.ognzNm ?? '').localeCompare(b.ognzNm ?? '', 'ko');
  const result: RecipientDepartment[] = [];
  const visited = new Set<string>();
  const visit = (dept: Department, depth: number) => {
    if (visited.has(dept.ognzId)) return;
    visited.add(dept.ognzId);
    result.push({ id: dept.ognzId, name: dept.ognzNm ?? dept.ognzId, depth });
    for (const child of [...(children.get(dept.ognzId) ?? [])].sort(order)) visit(child, depth + 1);
  };
  for (const root of [...roots].sort(order)) visit(root, 0);
  // 순환으로만 이어진 부서(어느 쪽도 최상위가 아닌 고리)도 빠뜨리지 않는다.
  for (const dept of [...departments].sort(order)) visit(dept, 0);
  return result;
}

/**
 * 부서 → 수신자 피커 주입 어댑터(2026-09-27 DIP B5 F5).
 *
 * 부서 목록은 조직 조회(DEPT_READ), 소속 인원은 사용자 조회(USER_READ) 권한이 필요하다. 그래서 피커가 이 모듈을 직접 부르지
 * 않고, 발송 화면이 {@link useRecipientDepartmentSource} 로 두 권한을 가진 사람에게만 넘긴다 — 권한이 없는 사람에게 탭을
 * 보이면 누를 때마다 403 이다. 소속 인원 응답에는 연락처가 없다(발송 때 서버가 해석한다).
 */
export const recipientDepartmentSource: RecipientDepartmentSource = {
  async listDepartments() {
    return flattenDepartments(await deptAdminService.getDeptTree());
  },
  async listMembers(departmentId: string) {
    const result = await userAdminService.getDepartmentRecipients(departmentId);
    return {
      members: (result.members ?? [])
        .filter((member) => member.esntlId)
        .map((member) => ({
          esntlId: member.esntlId!,
          name: member.userNm ?? member.esntlId!,
          deptNm: member.deptNm,
          absent: member.absent,
        })),
      truncated: result.truncated === true,
    };
  },
};

/** 부서 탭에 필요한 두 권한(DEPT_READ·USER_READ)을 가진 사람에게만 출처를 준다. 노출 판정일 뿐 인가는 서버가 한다. */
export function useRecipientDepartmentSource(): RecipientDepartmentSource | undefined {
  const user = useOptionalAuth()?.user;
  const allowed = canPermission(user, 'DEPT_READ') && canPermission(user, 'USER_READ');
  return useMemo(() => (allowed ? recipientDepartmentSource : undefined), [allowed]);
}
