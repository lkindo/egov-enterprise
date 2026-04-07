package nuri.foundation.domain.user;

import nuri.foundation.domain.user.entity.GeneralUser;
import nuri.foundation.domain.user.repository.GeneralUserRepository;
import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import jakarta.persistence.EntityManager;

import static org.assertj.core.api.Assertions.assertThat;

class UserPersistenceTest extends PersistenceTestSupport {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private GeneralUserRepository generalUserRepository;

    @Test
    @DisplayName("일반 사용자 CRUD 테스트")
    void userCrud() {
        // given
        GeneralUser user = GeneralUser.builder()
                .esntlId("TEST_ESNTL_01")
                .mberId("TEST_USER_01")
                .mberNm("테스트 사용자")
                .password("password123!")
                .mberEmailAdres("test@example.com")
                .mberSttus("P")
                .build();

        // when: Save
        generalUserRepository.save(user);
        generalUserRepository.flush();
        entityManager.clear();

        // then: Find
        GeneralUser saved = generalUserRepository.findById("TEST_ESNTL_01").orElseThrow();
        assertThat(saved.getMberNm()).isEqualTo("테스트 사용자");

        // when: Update
        saved.update("수정된 이름", "Hint", "Answer", "123456", "M", "12345", "Address", "02", "P", "Detail", "5678", "010-1111-2222", "GROUP_01", "02-123-4567", "new@example.com", "1234");
        generalUserRepository.save(saved);
        generalUserRepository.flush();
        entityManager.clear();

        // then: Verify Update
        GeneralUser updated = generalUserRepository.findById("TEST_ESNTL_01").orElseThrow();
        assertThat(updated.getMberNm()).isEqualTo("수정된 이름");
        assertThat(updated.getMberEmailAdres()).isEqualTo("new@example.com");
        
        // when: Unlock
        updated.unlock();
        generalUserRepository.save(updated);
        generalUserRepository.flush();
        entityManager.clear();
        
        // then: Verify unlock
        assertThat(generalUserRepository.findById("TEST_ESNTL_01").get().getLockAt()).isNull();
    }

    @Test
    @DisplayName("일반 사용자 검색 기능 테스트")
    void searchUsers() {
        // given
        generalUserRepository.save(GeneralUser.builder()
                .esntlId("USER_A_ID")
                .mberId("USER_A")
                .mberNm("홍길동")
                .password("pass123!")
                .mberSttus("P")
                .build());
        generalUserRepository.save(GeneralUser.builder()
                .esntlId("USER_B_ID")
                .mberId("USER_B")
                .mberNm("이순신")
                .password("pass123!")
                .mberSttus("P")
                .build());
        generalUserRepository.flush();
        entityManager.clear();

        // when
        Page<GeneralUser> result = generalUserRepository.searchGeneralUsers("P", "1", "홍", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getMberNm()).isEqualTo("홍길동");
    }
}
