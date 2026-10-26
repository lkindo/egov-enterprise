package nuri.business.service.community;

import nuri.business.domain.community.Community;
import nuri.business.domain.community.CommunityMemberStatus;
import nuri.business.domain.community.CommunityRepository;
import nuri.business.domain.community.CommunityUser;
import nuri.business.domain.community.CommunityUserId;
import nuri.business.domain.community.CommunityUserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class CommunityBoardAccessAdapterTest {

    @InjectMocks
    private CommunityBoardAccessAdapter adapter;

    @Mock
    private CommunityUserRepository communityUserRepository;

    @Mock
    private CommunityRepository communityRepository;

    @Test
    @DisplayName("운영 중인(useYn='Y') 커뮤니티의 승인 회원만 게시판 접근이 허용된다")
    void activeCommunityApprovedMemberAllowed() {
        Community active = Community.builder().cmntySn(10L).cmntyNm("활성").useYn("Y").build();
        CommunityUser approved = CommunityUser.builder()
                .id(new CommunityUserId(10L, "ESNTL_1"))
                .mbrSttsCd(CommunityMemberStatus.APPROVED.code())
                .build();
        given(communityRepository.findById(10L)).willReturn(Optional.of(active));
        given(communityUserRepository.findById(new CommunityUserId(10L, "ESNTL_1"))).willReturn(Optional.of(approved));

        assertThat(adapter.isApprovedMember(10L, "ESNTL_1")).isTrue();
    }

    @Test
    @DisplayName("🔒 폐쇄된(useYn='N') 커뮤니티는 회원 매핑이 남아 있어도 게시판 접근을 거부한다")
    void closedCommunityMemberRejected() {
        Community closed = Community.builder().cmntySn(10L).cmntyNm("폐쇄").useYn("N").build();
        given(communityRepository.findById(10L)).willReturn(Optional.of(closed));

        assertThat(adapter.isApprovedMember(10L, "ESNTL_1")).isFalse();
        verifyNoInteractions(communityUserRepository);
    }

    @Test
    @DisplayName("[2026-10-26 ADR-0043 결정 3] 요약은 이름과, 이용자 상세와 같은 판정(사용 중·정식 등록)의 이용 가능 여부를 싣는다")
    void summaryCarriesNameAndUserVisibleState() {
        given(communityRepository.findById(10L)).willReturn(Optional.of(
                Community.builder().cmntySn(10L).cmntyNm("독서 모임").regSeCd("REGC01").useYn("Y").build()));
        given(communityRepository.findById(11L)).willReturn(Optional.of(
                Community.builder().cmntySn(11L).cmntyNm("닫은 모임").regSeCd("REGC01").useYn("N").build()));
        given(communityRepository.findById(12L)).willReturn(Optional.of(
                Community.builder().cmntySn(12L).cmntyNm("신청 중").regSeCd("REGC02").useYn("Y").build()));

        assertThat(adapter.summary(10L)).contains(
                new nuri.foundation.core.community.CommunityBoardAccessPort.CommunitySummary("독서 모임", true));
        assertThat(adapter.summary(11L)).contains(
                new nuri.foundation.core.community.CommunityBoardAccessPort.CommunitySummary("닫은 모임", false));
        assertThat(adapter.summary(12L)).contains(
                new nuri.foundation.core.community.CommunityBoardAccessPort.CommunitySummary("신청 중", false));
    }

    @Test
    @DisplayName("[2026-10-26 ADR-0043 결정 3] 없는 커뮤니티·번호 없음은 비운다 — 호출부가 확인 불가로 다룬다")
    void summaryIsEmptyForMissingCommunity() {
        given(communityRepository.findById(99L)).willReturn(Optional.empty());

        assertThat(adapter.summary(99L)).isEmpty();
        assertThat(adapter.summary(null)).isEmpty();
    }
}
