package nuri.foundation.domain.login;

import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("로그인 정책 리포지토리 테스트")
class LoginPolicyRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private LoginPolicyRepository loginPolicyRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("로그인 정책 저장 및 조회")
    void saveAndFind() {
        // given
        LoginPolicy policy = LoginPolicy.builder()
                .userId("user01")
                .ipAddr("127.0.0.1")
                .dpcnPrmYn("Y")
                .lmtYn("N")
                .build();

        // when
        loginPolicyRepository.save(policy);
        Optional<LoginPolicy> result = loginPolicyRepository.findById("user01");

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getIpAddr()).isEqualTo("127.0.0.1");
    }

    @Test
    @DisplayName("로그인 정책 검색 - 이름 조건")
    void searchByName() {
        // given
        User user1 = User.builder()
                .userId("tester01")
                .userNm("홍길동")
                .esntlId("USR_001")
                .password("pass")
                .build();
        userRepository.save(user1);

        LoginPolicy policy = LoginPolicy.builder()
                .userId("tester01")
                .ipAddr("192.168.0.1")
                .build();
        loginPolicyRepository.save(policy);

        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition("1"); // Name search
        condition.setSearchKeyword("홍길동");

        // when
        Page<LoginPolicySearchResult> result = loginPolicyRepository.searchLoginPolicies(condition.getSearchKeyword(), PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserNm()).isEqualTo("홍길동");
        assertThat(result.getContent().get(0).getRegYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("로그인 정책 검색 - 등록되지 않은 사용자 포함")
    void searchIncludingUnregistered() {
        // given
        User user1 = User.builder()
                .userId("tester02")
                .userNm("이순신")
                .esntlId("USR_002")
                .password("pass")
                .build();
        userRepository.save(user1);

        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();

        // when
        Page<LoginPolicySearchResult> result = loginPolicyRepository.searchLoginPolicies(condition.getSearchKeyword(), PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).anyMatch(r -> r.getUserId().equals("tester02") && r.getRegYn().equals("N"));
    }
}