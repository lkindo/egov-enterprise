package nuri.business.domain.user.repository;

import java.util.Set;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/**
 * 관리자 사용자 목록 조회 조건(2026-09-26 DIP B5 F4) — 계정 상태·소속 부서·로그인 잠금.
 *
 * <p>값이 비어 있으면 조건이 없다. 어휘 밖 값은 조용히 무시하지 않고 400 으로 거부한다 — 무시하면 관리자는 조건이
 * 걸린 결과로 읽는다. 부서 조건은 그 부서에 직접 속한 사용자만 본다(하위 부서는 포함하지 않는다).
 */
public record UserListFilter(String userSttsCd, String ognzId, String lckYn) {

    public static final UserListFilter NONE = new UserListFilter(null, null, null);
    private static final Set<String> STATUSES = Set.of("P", "A", "D");
    private static final Set<String> LOCKS = Set.of("Y", "N");
    private static final int OGNZ_ID_MAX = 20;

    public static UserListFilter of(String userSttsCd, String ognzId, String lckYn) {
        String status = blankToNull(userSttsCd);
        if (status != null && !STATUSES.contains(status)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "알 수 없는 계정 상태입니다.");
        }
        String dept = blankToNull(ognzId);
        if (dept != null && dept.length() > OGNZ_ID_MAX) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "부서 코드는 " + OGNZ_ID_MAX + "자 이내입니다.");
        }
        String lock = blankToNull(lckYn);
        if (lock != null && !LOCKS.contains(lock)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "잠금 조건은 Y 또는 N 입니다.");
        }
        return new UserListFilter(status, dept, lock);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
