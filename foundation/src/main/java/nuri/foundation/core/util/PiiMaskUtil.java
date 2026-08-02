package nuri.foundation.core.util;

/**
 * 로그·에러 메시지에 실릴 개인정보를 마스킹한다.
 *
 * <p>[존재 이유 — W1-13] 이메일·휴대폰이 여러 서비스에서 <b>평문으로</b> 로그에 적재되고 있었다.
 * 로그는 애플리케이션보다 오래 살고 더 넓게 복제된다(수집기·백업·티켓 첨부). 개인정보 처리 관점에서
 * 로그는 저장소와 같은 등급으로 다뤄야 한다.
 *
 * <p>마스킹은 <b>추적 가능성을 남기는 선</b>에서 한다 — 같은 사용자의 로그를 이어 볼 수 있어야
 * 장애 분석이 되므로, 전부 가리지 않고 식별에 부족한 만큼만 남긴다.
 *
 * <p>null·형식 불일치 입력에서 예외를 던지지 않는다. 로깅 경로에서 던지는 유틸은
 * 진짜 오류를 가리는 2차 장애를 만든다.
 */
public final class PiiMaskUtil {

    private PiiMaskUtil() {
    }

    /**
     * 이메일 마스킹. {@code hong@example.com} → {@code ho***@example.com}
     *
     * <p>도메인을 남기는 이유: 조직 도메인은 장애 범위 판단에 쓰이고 그 자체로는 개인을 식별하지 않는다.
     */
    public static String email(String value) {
        if (value == null || value.isBlank()) {
            return "(none)";
        }
        int at = value.indexOf('@');
        if (at <= 0) {
            // 이메일 형태가 아니면 형태를 추측하지 말고 통째로 가린다.
            return "***";
        }
        String local = value.substring(0, at);
        String domain = value.substring(at);
        String head = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return head + "***" + domain;
    }

    /**
     * 전화번호 마스킹. 숫자만 추려 가운데를 가린다. {@code 010-1234-5678} → {@code 010****5678}
     *
     * <p>앞 3자리와 뒤 4자리를 남기는 이유: 통신사·지역 판단과 사용자 문의 대조에 필요한 최소치다.
     */
    public static String phone(String value) {
        if (value == null || value.isBlank()) {
            return "(none)";
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() < 7) {
            return "***";
        }
        return digits.substring(0, 3) + "****" + digits.substring(digits.length() - 4);
    }

    /**
     * 자유 텍스트(메일 본문·SMS 내용 등)는 <b>내용을 남기지 않고 길이만</b> 남긴다.
     *
     * <p>본문에는 비밀번호 재발급 링크·인증 코드·알림 전문이 실릴 수 있어 부분 노출도 위험하다.
     * 길이는 "빈 본문이 나갔는가"를 판별하는 데 충분하다.
     */
    public static String contentSummary(String value) {
        if (value == null) {
            return "(null)";
        }
        return "(" + value.length() + " chars)";
    }
}
