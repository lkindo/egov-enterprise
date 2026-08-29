package nuri.business.domain.login;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.support.PersistenceTestSupport;
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
                .pswd("pass")
                .build();
        userRepository.save(user1);

        LoginPolicy policy = LoginPolicy.builder()
                .userId("tester01")
                .ipAddr("192.168.0.1")
                .lmtYn("Y")
                .bgngTm("090000")
                .endTm("180000")
                .otpUseYn("Y")
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

        /*
         * [2026-08-29] 목록이 보안 값을 실제로 실어 오는지 확인한다.
         *
         * projection 은 bgngTm·endTm 을 이미 select 하고 있었지만 LoginPolicySearchResult 에
         * 대응 필드가 없어 QueryDSL 이 조용히 버렸고(값이 결과 객체에 도달조차 못 했다),
         * otpUseYn 은 select 자체가 없었다. 그 결과 목록 화면의 네 보안 열이 **전 사용자에게**
         * '제한 없음'·'24시간'·'정상'·'DISABLED' 로 보였다 — 관리자는 그 화면을 보고
         * "아무도 IP 제한이 없고 MFA 도 꺼져 있다" 고 결론 내린다.
         */
        LoginPolicySearchResult row = result.getContent().get(0);
        assertThat(row.getIpAddr()).isEqualTo("192.168.0.1");
        assertThat(row.getLmtYn()).isEqualTo("Y");
        assertThat(row.getBgngTm())
                .as("허용 시간이 결과에 없으면 목록이 전 사용자를 '24시간' 으로 보여 준다")
                .isEqualTo("090000");
        assertThat(row.getEndTm()).isEqualTo("180000");
        assertThat(row.getOtpUseYn())
                .as("OTP 여부가 결과에 없으면 목록이 전 사용자를 'DISABLED' 로 보여 준다")
                .isEqualTo("Y");
    }

    @Test
    @DisplayName("로그인 정책 검색 - 등록되지 않은 사용자 포함")
    void searchIncludingUnregistered() {
        // given
        User user1 = User.builder()
                .userId("tester02")
                .userNm("이순신")
                .esntlId("USR_002")
                .pswd("pass")
                .build();
        userRepository.save(user1);

        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();

        // when
        Page<LoginPolicySearchResult> result = loginPolicyRepository.searchLoginPolicies(condition.getSearchKeyword(), PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).anyMatch(r -> r.getUserId().equals("tester02") && r.getRegYn().equals("N"));
    }
}