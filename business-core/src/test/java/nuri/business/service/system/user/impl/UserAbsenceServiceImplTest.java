package nuri.business.service.system.user.impl;

import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.domain.user.dto.UserAbsenceMapper;
import nuri.business.domain.user.dto.UserAbsenceMapperImpl;
import nuri.business.domain.user.entity.UserAbsence;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserAbsenceServiceImpl 단위 테스트")
class UserAbsenceServiceImplTest {

    /** 쓰기 서비스는 현재 권한을 다시 본다(백엔드 헌법 제8조). 권한을 따로 쥐지 않은 시험은 관리자로 돈다. */
    @org.junit.jupiter.api.BeforeEach
    void authorizeServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
    }

    @org.junit.jupiter.api.AfterEach
    void clearServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @InjectMocks
    private UserAbsenceServiceImpl userAbsenceService;

    @Mock
    private UserAbsenceRepository userAbsenceRepository;

    @Mock
    private nuri.business.domain.user.repository.UserRepository userRepository;

    // MapStruct 컴파일타임 생성 구현체를 실제로 주입 (수기 from() 대체 매퍼)
    @Spy
    private UserAbsenceMapper userAbsenceMapper = new UserAbsenceMapperImpl();

    @Test
    @DisplayName("부재 목록 조회 성공")
    void getAbsences_Success() {
        // given
        UserAbsence absence = UserAbsence.builder().userId("user1").userAbsnYn("N").build();
        given(userAbsenceRepository.findAll()).willReturn(List.of(absence));

        // when
        List<UserAbsenceDto> result = userAbsenceService.getAbsences();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).userId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("부재 정보 상세 조회 성공 - 데이터 있음")
    void getAbsence_Found() {
        // given
        UserAbsence absence = UserAbsence.builder().userId("user1").userAbsnYn("Y").build();
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.of(absence));

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence("user1");

        // then
        assertThat(result.userAbsnYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("부재 정보 상세 조회 성공 - 데이터 없음 (기본값)")
    void getAbsence_NotFound() {
        // given
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.empty());

        // when
        UserAbsenceDto result = userAbsenceService.getAbsence("user1");

        // then
        assertThat(result.userAbsnYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("부재 정보 수정 성공")
    void updateAbsence_Success() {
        // given
        given(userRepository.existsById("user1")).willReturn(true); // [V2_13] 실존 사용자 검증 스텁
        UserAbsence absence = UserAbsence.builder().userId("user1").build();
        given(userAbsenceRepository.findById("user1")).willReturn(Optional.of(absence));
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("user1").userAbsnYn("Y").build();

        // when
        userAbsenceService.updateAbsence("user1", dto);

        // then
        verify(userAbsenceRepository).save(any());
    }

    @Test
    @DisplayName("부재 정보 수정 실패 - 존재하지 않는 사용자 (FK 선차단, V2_13 결속)")
    void updateAbsence_Fail_UserNotFound() {
        given(userRepository.existsById("ghost")).willReturn(false);
        UserAbsenceDto dto = UserAbsenceDto.builder().userId("ghost").userAbsnYn("Y").build();

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> userAbsenceService.updateAbsence("ghost", dto))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
        verify(userAbsenceRepository, org.mockito.Mockito.never()).save(any());
    }

    // ── [V2_151] 대리결재 지정 ──────────────────────────────────────────────────────────────────────────────

    private static nuri.business.domain.user.entity.User account(String esntlId, String status, String locked) {
        return nuri.business.domain.user.entity.User.builder().esntlId(esntlId).userId("login-" + esntlId)
                .userNm(esntlId).pswd("{bcrypt}x").userSttsCd(status).lckYn(locked).build();
    }

    private void delegationFixture(nuri.business.domain.user.entity.User delegate) {
        given(userRepository.existsById("A")).willReturn(true);
        org.mockito.Mockito.lenient().when(userRepository.findByEsntlIdForUpdate("A"))
                .thenReturn(Optional.of(account("A", "P", "N")));
        org.mockito.Mockito.lenient().when(userRepository.findByEsntlIdForUpdate(delegate.getEsntlId()))
                .thenReturn(Optional.of(delegate));
        org.mockito.Mockito.lenient().when(userRepository.findById(delegate.getEsntlId())).thenReturn(Optional.of(delegate));
    }

    private static UserAbsenceDto delegation(String substitute, String from, String to) {
        return UserAbsenceDto.builder().userId("A").userAbsnYn("Y").sbtAprvrId(substitute)
                .absnBgngYmd(from).absnEndYmd(to).build();
    }

    private void assertRejected(UserAbsenceDto dto, String messagePart) {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> userAbsenceService.updateAbsence("A", dto))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class)
                .hasMessageContaining(messagePart)
                .extracting(error -> ((nuri.foundation.core.exception.BusinessException) error).getErrorCode())
                .isEqualTo(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        verify(userAbsenceRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("대리결재 지정 — 사용 중인 사람을 기간과 함께 저장하고, 부재를 끝내면 대리결재도 비운다")
    void updateAbsence_SavesDelegationAndClearsItWhenAbsenceEnds() {
        delegationFixture(account("B", "P", "N"));
        given(userAbsenceRepository.findById("A")).willReturn(Optional.empty());
        given(userAbsenceRepository.findById("B")).willReturn(Optional.empty());
        org.mockito.ArgumentCaptor<UserAbsence> saved = org.mockito.ArgumentCaptor.forClass(UserAbsence.class);

        userAbsenceService.updateAbsence("A", delegation("B", "2026-11-12", "20261114"));

        verify(userAbsenceRepository).save(saved.capture());
        assertThat(saved.getValue().getSbtAprvrId()).isEqualTo("B");
        assertThat(saved.getValue().getAbsnBgngYmd()).isEqualTo("20261112");
        assertThat(saved.getValue().getAbsnEndYmd()).isEqualTo("20261114");
        assertThat(saved.getValue().delegatesOn("20261114")).isTrue();
        assertThat(saved.getValue().delegatesOn("20261115")).isFalse();

        saved.getValue().updateAbsence("N");
        assertThat(saved.getValue().getSbtAprvrId()).isNull();
        assertThat(saved.getValue().delegatesOn("20261113")).isFalse();
    }

    @Test
    @DisplayName("대리결재 지정 거부 — 본인")
    void updateAbsence_RejectsSelfDelegation() {
        given(userRepository.existsById("A")).willReturn(true);
        assertRejected(delegation("A", "20261112", "20261114"), "본인");
    }

    @Test
    @DisplayName("대리결재 지정 거부 — 사용 중이 아니거나 잠긴 계정")
    void updateAbsence_RejectsInactiveOrLockedDelegate() {
        delegationFixture(account("B", "D", "N"));
        assertRejected(delegation("B", "20261112", "20261114"), "사용 중이 아니거나 잠긴");

        org.mockito.Mockito.reset(userRepository, userAbsenceRepository);
        delegationFixture(account("B", "P", "Y"));
        assertRejected(delegation("B", "20261112", "20261114"), "사용 중이 아니거나 잠긴");
    }

    @Test
    @DisplayName("대리결재 지정 거부 — 기간이 없거나 거꾸로이거나 부재가 아니다")
    void updateAbsence_RejectsMissingOrReversedPeriod() {
        given(userRepository.existsById("A")).willReturn(true);
        assertRejected(delegation("B", null, "20261114"), "시작일과 종료일");
        assertRejected(delegation("B", "20261115", "20261114"), "종료일은 시작일");
        assertRejected(UserAbsenceDto.builder().userId("A").userAbsnYn("N").sbtAprvrId("B")
                .absnBgngYmd("20261112").absnEndYmd("20261114").build(), "부재가 아니면");
    }

    @Test
    @DisplayName("대리결재 지정 거부 — 대리결재자가 겹치는 기간에 부재다(A→B→A 순환·A→B→C 연쇄)")
    void updateAbsence_RejectsDelegateAbsentInOverlappingPeriod() {
        delegationFixture(account("B", "P", "N"));
        UserAbsence delegatesBack = UserAbsence.builder().userId("B").userAbsnYn("Y").build();
        delegatesBack.updateDelegation("Y", "A", "20261113", "20261120");
        given(userAbsenceRepository.findById("B")).willReturn(Optional.of(delegatesBack));

        assertRejected(delegation("B", "20261112", "20261114"), "부재 중");
    }

    @Test
    @DisplayName("대리결재 지정 거부 — 그 기간에 이미 다른 사람의 대리결재자인 사람을 부재로 돌려 연쇄를 만든다")
    void updateAbsence_RejectsChainThroughExistingDelegation() {
        delegationFixture(account("B", "P", "N"));
        given(userAbsenceRepository.findById("B")).willReturn(Optional.empty());
        UserAbsence xDelegatesToA = UserAbsence.builder().userId("X").userAbsnYn("Y").build();
        xDelegatesToA.updateDelegation("Y", "A", "20261101", "20261112");
        given(userAbsenceRepository.findOverlappingDelegationsTo("A", "A", "20261112", "20261114"))
                .willReturn(List.of(xDelegatesToA));

        assertRejected(delegation("B", "20261112", "20261114"), "다른 사람의 대리결재자");
    }
}
