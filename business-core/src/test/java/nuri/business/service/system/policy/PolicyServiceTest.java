package nuri.business.service.system.policy;

import nuri.business.domain.system.policy.SystemPolicy;
import nuri.business.domain.system.policy.SystemPolicyRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("PolicyService 단위 테스트")
class PolicyServiceTest {

    @InjectMocks
    private PolicyService policyService;

    @Mock
    private SystemPolicyRepository systemPolicyRepository;

    @Test
    @DisplayName("정책 목록 조회 성공")
    void getPolicies_Success() {
        // given
        SystemPolicy policy = SystemPolicy.builder().plcyTypeCd("COPYRIGHT").plcyTtl("Title").build();
        given(systemPolicyRepository.findAll()).willReturn(List.of(policy));

        // when
        List<PolicyService.Policy> result = policyService.getPolicies();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPlcyTypeCd()).isEqualTo("COPYRIGHT");
    }

    @Test
    @DisplayName("정책 상세 조회 성공")
    void getPolicy_Success() {
        // given
        SystemPolicy policy = SystemPolicy.builder().plcyTypeCd("COPYRIGHT").plcyTtl("Title").build();
        given(systemPolicyRepository.findById("COPYRIGHT")).willReturn(Optional.of(policy));

        // when
        Optional<PolicyService.Policy> result = policyService.getPolicy("COPYRIGHT");

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getPlcyTtl()).isEqualTo("Title");
    }

    @Test
    @DisplayName("정책 수정 성공 - 기존 데이터 있음")
    void updatePolicy_Existing() {
        // given
        SystemPolicy policy = SystemPolicy.builder().plcyTypeCd("COPYRIGHT").build();
        given(systemPolicyRepository.findById("COPYRIGHT")).willReturn(Optional.of(policy));

        // when
        policyService.updatePolicy("COPYRIGHT", "New Title", "New Content");

        // then
        assertThat(policy.getPlcyTtl()).isEqualTo("New Title");
        verify(systemPolicyRepository).save(policy);
    }

    @Test
    @DisplayName("정책 수정 성공 - 신규 데이터")
    void updatePolicy_New() {
        // given
        given(systemPolicyRepository.findById("COPYRIGHT")).willReturn(Optional.empty());

        // when
        policyService.updatePolicy("COPYRIGHT", "New Title", "New Content");

        // then
        verify(systemPolicyRepository).save(any());
    }

    /*
     * [2026-09-02] 경로 변수 type 은 upsert 의 PK 가 된다. 종전에는 아무 검증이 없어 13자 이상은
     * DB 제약 위반으로 500 이 났고, 공백·제어문자는 그대로 PK 가 됐다. 물리 폭(12)과 식별자
     * 문자셋만 강제한다 — 허용 목록은 어디에도 정의돼 있지 않아 지어내지 않는다(H4).
     * 거부는 저장소를 건드리기 전에 일어나야 한다(빈 행이 만들어지면 안 된다).
     */
    @org.junit.jupiter.params.ParameterizedTest(name = "type={0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "",
            "   ",
            "TOO_LONG_TYPE_13",       // 13자 — varchar(12) 초과
            "copyright",              // 소문자
            "COPY RIGHT",             // 공백
            "COPY\nRIGHT",            // 제어문자
            "../ETC",                 // 경로 문자
    })
    @DisplayName("정책 유형 코드가 물리 계약(12자·영대문자/숫자/밑줄)을 어기면 저장 전에 거부한다")
    void updatePolicy_rejectsInvalidType(String type) {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> policyService.updatePolicy(type, "T", "C"))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        verify(systemPolicyRepository, org.mockito.Mockito.never()).findById(any());
        verify(systemPolicyRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("정책 유형 코드 12자 경계값은 허용된다")
    void updatePolicy_acceptsMaxLengthType() {
        String twelve = "PRIVACY_P_12";
        assertThat(twelve).hasSize(12);
        given(systemPolicyRepository.findById(twelve)).willReturn(Optional.empty());

        policyService.updatePolicy(twelve, "T", "C");

        verify(systemPolicyRepository).save(any());
    }
}
