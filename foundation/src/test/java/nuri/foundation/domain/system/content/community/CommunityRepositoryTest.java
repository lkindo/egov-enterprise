package nuri.foundation.domain.system.content.community;

import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class CommunityRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private CommunityUserRepository communityUserRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("커뮤니티 정보를 저장한다.")
    void saveCommunity() {
        // given
        Community community = Community.builder()
                .cmmntyId("CMMNTY_000000000001")
                .cmmntyNm("테스트 커뮤니티")
                .cmmntyIntrcn("테스트 커뮤니티 설명")
                .useAt("Y")
                .build();

        // when
        Community savedCommunity = communityRepository.save(community);

        // then
        assertThat(savedCommunity.getCmmntyId()).isEqualTo("CMMNTY_000000000001");
        assertThat(savedCommunity.getCmmntyNm()).isEqualTo("테스트 커뮤니티");
    }

    @Test
    @DisplayName("커뮤니티 정보를 수정한다.")
    void updateCommunity() {
        // given
        Community community = Community.builder()
                .cmmntyId("CMMNTY_000000000001")
                .cmmntyNm("테스트 커뮤니티")
                .useAt("Y")
                .build();
        communityRepository.save(community);

        // when
        community.update("수정된 커뮤니티", "수정된 설명", "TMPLAT_001", "N");
        communityRepository.save(community);
        communityRepository.flush();
        entityManager.clear();

        // then
        Community foundCommunity = communityRepository.findById("CMMNTY_000000000001").orElseThrow();
        assertThat(foundCommunity.getCmmntyNm()).isEqualTo("수정된 커뮤니티");
        assertThat(foundCommunity.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("커뮤니티를 삭제(비활성화)한다.")
    void deleteCommunity() {
        // given
        Community community = Community.builder()
                .cmmntyId("CMMNTY_000000000001")
                .cmmntyNm("테스트 커뮤니티")
                .useAt("Y")
                .build();
        communityRepository.save(community);

        // when
        community.delete();
        communityRepository.save(community);
        communityRepository.flush();
        entityManager.clear();

        // then
        Community foundCommunity = communityRepository.findById("CMMNTY_000000000001").orElseThrow();
        assertThat(foundCommunity.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("커뮤니티 사용자를 가입 및 처리한다.")
    void communityUserOperations() {
        // given
        CommunityUserId id = new CommunityUserId("CMMNTY_001", "USER_001");
        CommunityUser user = CommunityUser.builder()
                .id(id)
                .mngrAt("N")
                .mberSttus("A")
                .useAt("Y")
                .sbscrbDe(LocalDateTime.now())
                .build();

        // when
        communityUserRepository.save(user);
        
        // then
        Optional<CommunityUser> foundUser = communityUserRepository.findById(id);
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getMngrAt()).isEqualTo("N");

        // when: 승인 및 관리자 권한 부여
        foundUser.get().approve();
        foundUser.get().grantAdmin();
        communityUserRepository.save(foundUser.get());
        communityUserRepository.flush();
        entityManager.clear();

        // then
        CommunityUser updatedUser = communityUserRepository.findById(id).orElseThrow();
        assertThat(updatedUser.getMberSttus()).isEqualTo("P");
        assertThat(updatedUser.getMngrAt()).isEqualTo("Y");

        // when: 관리자 권한 해제 및 탈퇴
        updatedUser.revokeAdmin();
        updatedUser.withdraw();
        communityUserRepository.save(updatedUser);
        communityUserRepository.flush();
        entityManager.clear();

        // then
        CommunityUser finalUser = communityUserRepository.findById(id).orElseThrow();
        assertThat(finalUser.getMngrAt()).isEqualTo("N");
        assertThat(finalUser.getUseAt()).isEqualTo("N");
        assertThat(finalUser.getSecsnDe()).isNotNull();
    }
}
