package nuri.business.domain.system.content.community;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CommunityRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private CommunityUserRepository communityUserRepository;

    @Test
    @DisplayName("커뮤니티 저장 및 조회")
    void saveAndFindCommunity() {
        // given
        Community community = Community.builder()
                .cmntyNm("Test Community")
                .cmntyIntroCn("Test Intro")
                .useYn("Y")
                .build();
        Community persisted = communityRepository.saveAndFlush(community);

        // when
        Community saved = communityRepository.findById(persisted.getCmntySn()).orElseThrow();

        // then
        assertThat(saved.getCmntyNm()).isEqualTo("Test Community");
    }

    @Test
    @DisplayName("커뮤니티 사용자 매핑 테스트")
    void communityUserMapping() {
        // given
        Community community = Community.builder()
                .cmntyNm("Mapping Community")
                .useYn("Y")
                .build();
        Community persisted = communityRepository.saveAndFlush(community);

        CommunityUser communityUser = CommunityUser.builder()
                .id(new CommunityUserId(persisted.getCmntySn(), "user1"))
                .mngrYn("N")
                .joinYmd("20240101")
                .useYn("Y")
                .mbrSttsCd("A")
                .build();
        communityUserRepository.save(communityUser);

        // when
        List<CommunityUser> users = communityUserRepository.findByIdCmntySn(persisted.getCmntySn());

        // then
        assertThat(users).hasSize(1);
        assertThat(users.get(0).getId().getUserId()).isEqualTo("user1");
    }
}
