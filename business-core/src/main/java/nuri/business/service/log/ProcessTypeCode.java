package nuri.business.service.log;

import java.util.Locale;

/**
 * HTTP 메서드 → 처리구분(CRUD) 매핑.
 *
 * <p>{@code tb_sys_log.prcs_se_cd}와 {@code tb_user_log}의 건수 컬럼(crt/mdfcn/inq/del)이
 * <b>같은 구분</b>을 쓴다. 두 곳에 매핑을 따로 두면 같은 요청이 시스템 로그에서는 '수정',
 * 사용자 통계에서는 '생성'으로 세어질 수 있어 한 곳으로 모은다.
 *
 * <p>{@code OUTPUT}(출력)은 HTTP 메서드로 판정되지 않는다 — 다운로드·엑셀 내보내기는 대개 GET이라
 * 메서드만 보면 조회와 구분되지 않기 때문이다. {@code tb_user_log.otpt_cnt}는 그래서 이 매핑이
 * 채우지 않고 0으로 남는다. 채우려면 핸들러 수준의 명시적 선언이 선행이며, 지금 없는 근거로
 * 조회를 출력으로 재분류하지 않는다.
 */
public enum ProcessTypeCode {

    /** 생성 — POST */
    CREATE("C"),
    /** 수정 — PUT, PATCH */
    UPDATE("U"),
    /** 조회 — GET, HEAD */
    READ("R"),
    /** 삭제 — DELETE */
    DELETE("D"),
    /** 그 밖(OPTIONS, TRACE, 판정 불가) */
    OTHER("X");

    private final String code;

    ProcessTypeCode(String code) {
        this.code = code;
    }

    /** {@code prcs_se_cd}에 저장되는 코드값. */
    public String code() {
        return code;
    }

    /** HTTP 메서드 문자열을 처리구분으로 매핑한다. null·미지의 값은 {@link #OTHER}. */
    public static ProcessTypeCode of(String httpMethod) {
        if (httpMethod == null) {
            return OTHER;
        }
        return switch (httpMethod.toUpperCase(Locale.ROOT)) {
            case "POST" -> CREATE;
            case "PUT", "PATCH" -> UPDATE;
            case "GET", "HEAD" -> READ;
            case "DELETE" -> DELETE;
            default -> OTHER;
        };
    }
}
