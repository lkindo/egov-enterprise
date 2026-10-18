package nuri.foundation.core.audit;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * {@code @PrivacyAccess} 응답이 <b>한 사람</b>의 개인정보를 돌려줄 때, 그 사람(정보주체)의 내부 키를 현재 요청에 표시한다(2026-10-18).
 *
 * <p>개인정보 접근 기록({@code tb_privacy_log})은 누가(조회자) 언제 어떤 항목을 봤는지만 남기고 <b>누구의 정보</b>인지는 남기지
 * 않았다 — 정보주체가 자기 정보의 열람 이력을 요구하면 답할 수 없었다. 감사 경계(SensitiveResponseAuditAspect)는 핸들러가
 * 돌아온 뒤 응답 바이트를 쓰기 전에 이 표시를 읽어 준비(PREPARED) 원장과 개인정보 접근 기록에 함께 싣는다.
 *
 * <p>대상을 아는 것은 핸들러다 — 경로 변수는 로그인 ID 일 수도 있어 경계가 추측하지 않는다. 목록처럼 여러 사람을 돌려주는
 * 응답은 표시하지 않는다(한 칸에 한 사람만 남는다). 표시는 요청 하나에만 남고 다른 요청으로 번지지 않는다.
 */
public final class PrivacySubject {

    /** 요청 속성 키. 값은 정보주체의 esntlId(최대 20자, tb_user_info 기본 키)다. */
    public static final String REQUEST_ATTRIBUTE = "nuri.audit.privacySubject";

    /** tb_privacy_log.trpr_id 와 같은 길이 상한 — 넘는 값은 사용자 기본 키가 아니므로 남기지 않는다. */
    static final int MAX_LENGTH = 20;

    private PrivacySubject() {
    }

    /** 현재 요청의 응답이 이 사람(esntlId)의 개인정보임을 표시한다. 요청 밖이거나 값이 비면 아무것도 하지 않는다. */
    public static void identify(String esntlId) {
        if (esntlId == null || esntlId.isBlank() || esntlId.length() > MAX_LENGTH) {
            return;
        }
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            attributes.getRequest().setAttribute(REQUEST_ATTRIBUTE, esntlId);
        }
    }
}
