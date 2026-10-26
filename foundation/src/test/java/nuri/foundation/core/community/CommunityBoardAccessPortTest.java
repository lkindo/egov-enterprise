package nuri.foundation.core.community;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CommunityBoardAccessPort 단위 테스트")
class CommunityBoardAccessPortTest {

    /** 요약을 모르는 구현 — 회원·존재 판정만 한다(이 메서드가 생기기 전의 구현과 같다). */
    private static final CommunityBoardAccessPort MEMBERSHIP_ONLY = new CommunityBoardAccessPort() {
        @Override
        public boolean isApprovedMember(Long cmntySn, String esntlId) {
            return true;
        }

        @Override
        public boolean exists(Long cmntySn) {
            return true;
        }
    };

    /**
     * [2026-10-26 ADR-0043 결정 3] 요약을 주지 않는 구현은 비운다 — 호출부가 '확인 불가' 로 다루고 입구가 있다고 추정하지 않는다.
     * 기본 구현이 무언가를 지어내면 사용 중지된 커뮤니티의 게시판이 공개 준비를 통과한다.
     */
    @Test
    @DisplayName("요약을 구현하지 않은 포트는 커뮤니티가 있어도 요약을 비운다(fail-closed)")
    void defaultSummaryIsEmpty() {
        assertThat(MEMBERSHIP_ONLY.exists(7L)).isTrue();
        assertThat(MEMBERSHIP_ONLY.summary(7L)).isEmpty();
    }

    @Test
    @DisplayName("요약은 이름과 이용 가능 여부를 그대로 나르고 값으로 비교한다")
    void summaryCarriesNameAndAvailability() {
        CommunityBoardAccessPort.CommunitySummary summary = new CommunityBoardAccessPort.CommunitySummary("신규 입사자", false);

        assertThat(summary.cmntyNm()).isEqualTo("신규 입사자");
        assertThat(summary.inUse()).isFalse();
        assertThat(summary).isEqualTo(new CommunityBoardAccessPort.CommunitySummary("신규 입사자", false));
        assertThat(summary).isNotEqualTo(new CommunityBoardAccessPort.CommunitySummary("신규 입사자", true));
    }
}
