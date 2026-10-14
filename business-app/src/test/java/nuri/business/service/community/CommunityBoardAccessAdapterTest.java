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
}
