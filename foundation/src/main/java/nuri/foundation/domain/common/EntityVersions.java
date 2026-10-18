package nuri.foundation.domain.common;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/**
 * 수정 요청이 들고 온 낙관적 잠금 버전({@code @Version})을 지금 행의 버전과 대조한다.
 *
 * <p>[왜 필요한가] {@code @Version} 만 두면 <b>같은 순간</b>에 겹친 두 저장만 막는다 — 두 트랜잭션이 같은 버전을 읽고
 * 쓸 때 늦은 쪽의 {@code UPDATE ... WHERE version = ?} 가 0행이 되어 409 가 된다. 그러나 화면이 행을 읽고 몇 분 뒤
 * 저장하면 서버는 저장 직전에 행을 다시 읽으므로 늘 최신 버전으로 쓴다. 그래서 그 사이 다른 사람이 고친 내용을
 * 옛 내용으로 조용히 덮는다(마지막 저장이 이긴다). 화면이 읽은 버전을 함께 보내고 서버가 그 값을 대조해야
 * 이 경우도 409 가 된다(결재 임시저장 {@code ApprovalTemporaryDraftService} 선례).
 *
 * <p>응답은 기존 동시 수정 계약({@link CommonErrorCode#CONCURRENT_MODIFICATION}, 409)을 그대로 쓴다.
 */
public final class EntityVersions {

    /** 버전을 보내지 않은 수정 요청의 안내. 버전은 화면이 상세·목록에서 받은 값을 그대로 돌려보낸다. */
    public static final String MISSING_VERSION_MESSAGE =
            "고치려는 항목을 불러올 때 받은 버전(version)을 함께 보내 주세요.";

    /** 읽은 뒤 다른 사람이 먼저 고친 경우의 안내. 덮어쓰지 않았음을 알리고 다시 불러오게 한다. */
    public static final String STALE_VERSION_MESSAGE =
            "다른 사용자가 먼저 수정했습니다. 저장하지 않았으니 최신 내용을 다시 불러온 뒤 고쳐 주세요.";

    private EntityVersions() {
    }

    /**
     * 요청 버전이 지금 행의 버전과 같은지 확인한다.
     *
     * @param expected 화면이 읽은 버전. 없으면 400 이다 — 버전 없이 저장하면 대조할 근거가 없다.
     * @param current  지금 행의 버전({@code @Version} 필드)
     * @throws BusinessException 버전이 없으면 {@code INVALID_INPUT_VALUE}(400), 다르면 {@code CONCURRENT_MODIFICATION}(409)
     */
    public static void assertCurrent(Integer expected, Integer current) {
        if (expected == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, MISSING_VERSION_MESSAGE);
        }
        if (!expected.equals(current)) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION, STALE_VERSION_MESSAGE);
        }
    }
}
