package nuri.business.domain.system.content.community;

import java.util.Arrays;
import java.util.Optional;

/**
 * 커뮤니티 멤버십 상태 코드({@code tb_cmnty_user_map.mbr_stts_cd}) 어휘.
 *
 * <p>[2026-09-06 DEC-OPS-043] 종전에는 가입이 {@code "A"} 를 쓰고 엔티티 {@link CommunityUser#approve()} 가
 * {@code "P"} 를 쓰는데 그 값을 읽거나 옮기는 코드가 없어(GAP-CMTY-001) 어휘가 문자열 리터럴로만 흩어져 있었다.
 * 승인·반려 전이가 생기면서 상태를 한 곳에서 이름 붙인다. 공통코드 그룹이나 DB CHECK 는 없으므로 이 enum 이 유일한
 * 정의이며, 여기 없는 값은 {@link #fromCode(String)} 가 빈 값으로 돌려준다(알 수 없는 상태를 지어내지 않는다).
 */
public enum CommunityMemberStatus {
    /** 가입 신청 — 관리자 승인 대기. */
    REQUESTED("A"),
    /** 승인된 회원. */
    APPROVED("P");

    private final String code;

    CommunityMemberStatus(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public boolean matches(String mbrSttsCd) {
        return code.equals(mbrSttsCd);
    }

    public static Optional<CommunityMemberStatus> fromCode(String mbrSttsCd) {
        return Arrays.stream(values()).filter(status -> status.matches(mbrSttsCd)).findFirst();
    }
}
