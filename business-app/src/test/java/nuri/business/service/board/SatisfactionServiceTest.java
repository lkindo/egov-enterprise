package nuri.business.service.board;

import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.business.service.board.dto.SatisfactionMapper;
import nuri.business.service.board.dto.SatisfactionMapperImpl;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.Spy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@DisplayName("SatisfactionService 단위 테스트")
class SatisfactionServiceTest {

    @Mock
    private SatisfactionRepository satisfactionRepository;

    @Spy
    private SatisfactionMapper satisfactionMapper = new SatisfactionMapperImpl();

    @InjectMocks
    private SatisfactionService satisfactionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticateAs(String loginId, String role) {
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(loginId)
                .esntlId("ESNTL_" + loginId)
                .userNm(loginId)
                .password("unused")
                .roleName(role)
                .authorCode("ROLE_" + role)
                .lockAt("N")
                .build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }

    private static Satisfaction satisfactionOwnedBy(String ownerLoginId) {
        Satisfaction entity = Satisfaction.builder()
                .dgstfnSn(10L)
                .dgstfnScr(5)
                .dgstfnCn("원본")
                .build();
        entity.setFrstRgtrId(ownerLoginId);
        return entity;
    }

    private static SatisfactionDto updateDto() {
        return SatisfactionDto.builder()
                .dgstfnSn(10L)
                .dgstfnScr(4)
                .dgstfnCn("수정")
                .build();
    }

    // ---------- 등록 ----------

    @Test
    @DisplayName("등록 - 인증 사용자만 저장할 수 있다")
    void createRequiresAuthenticatedUser() {
        SatisfactionDto dto = SatisfactionDto.builder()
                .bbsId("BBS_01").pstSn(1L).dgstfnScr(5).dgstfnCn("Good").build();

        assertThatThrownBy(() -> satisfactionService.createSatisfaction(dto))
                .isInstanceOf(BusinessException.class);
        verify(satisfactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("등록 - principal이 있어도 인증되지 않은 SecurityContext는 거부한다")
    void createRejectsUnauthenticatedPrincipal() {
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId("untrusted")
                .esntlId("ESNTL_untrusted")
                .userNm("untrusted")
                .password("unused")
                .roleName("USER")
                .authorCode("ROLE_USER")
                .lockAt("N")
                .build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null));
        SecurityContextHolder.setContext(context);
        SatisfactionDto dto = SatisfactionDto.builder()
                .bbsId("BBS_01").pstSn(1L).dgstfnScr(5).dgstfnCn("Good").build();

        assertThatThrownBy(() -> satisfactionService.createSatisfaction(dto))
                .isInstanceOf(BusinessException.class);
        verify(satisfactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("등록 - 인증된 요청은 익명 자격증명 없이 저장한다")
    void createAuthenticatedSatisfaction() {
        authenticateAs("user1", "USER");
        SatisfactionDto dto = SatisfactionDto.builder()
                .bbsId("BBS_01").pstSn(1L).dgstfnScr(5).dgstfnCn("Good").build();
        given(satisfactionRepository.save(any(Satisfaction.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        satisfactionService.createSatisfaction(dto);

        ArgumentCaptor<Satisfaction> captor = ArgumentCaptor.forClass(Satisfaction.class);
        verify(satisfactionRepository).save(captor.capture());
        assertThat(captor.getValue().getBbsId()).isEqualTo("BBS_01");
        assertThat(captor.getValue().getPstSn()).isEqualTo(1L);
    }

    @Test
    @DisplayName("익명 비밀번호 DTO·서비스 표면은 퇴역한다")
    void anonymousPasswordSurfaceIsRetired() {
        assertThat(Arrays.stream(SatisfactionDto.class.getDeclaredFields())
                .map(java.lang.reflect.Field::getName))
                .doesNotContain("pswd");
        assertThat(Arrays.stream(SatisfactionService.class.getDeclaredMethods())
                .map(java.lang.reflect.Method::getName))
                .doesNotContain("checkPassword");
    }

    // ---------- 수정·삭제 인가 ----------

    @Test
    @DisplayName("수정 - 소유자는 자기 만족도를 수정할 수 있다")
    void updateAcceptsOwner() {
        authenticateAs("owner", "USER");
        Satisfaction entity = satisfactionOwnedBy("owner");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        satisfactionService.updateSatisfaction(updateDto());

        assertThat(entity.getDgstfnScr()).isEqualTo(4);
        assertThat(entity.getDgstfnCn()).isEqualTo("수정");
        assertThat(entity.getLastMdfrId()).isEqualTo("owner");
    }

    @Test
    @DisplayName("🔒 수정 - 타인은 만족도를 수정할 수 없다")
    void updateRejectsNonOwner() {
        authenticateAs("attacker", "USER");
        Satisfaction entity = satisfactionOwnedBy("owner");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        assertThatThrownBy(() -> satisfactionService.updateSatisfaction(updateDto()))
                .isInstanceOf(BusinessException.class);
        assertThat(entity.getDgstfnScr()).isEqualTo(5);
        assertThat(entity.getDgstfnCn()).isEqualTo("원본");
    }

    @Test
    @DisplayName("삭제 - 소유자는 자기 만족도를 논리 삭제할 수 있다")
    void deleteAcceptsOwner() {
        authenticateAs("owner", "USER");
        Satisfaction entity = satisfactionOwnedBy("owner");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        satisfactionService.deleteSatisfaction(10L);

        assertThat(entity.getUseYn()).isEqualTo("N");
        assertThat(entity.getLastMdfrId()).isEqualTo("owner");
    }

    @Test
    @DisplayName("삭제 - 관리자는 작성자가 있는 만족도를 대리 삭제할 수 있다")
    void deleteAcceptsAdminForOwnedRow() {
        authenticateAs("admin", "ADMIN");
        Satisfaction entity = satisfactionOwnedBy("owner");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        satisfactionService.deleteSatisfaction(10L);

        assertThat(entity.getUseYn()).isEqualTo("N");
        assertThat(entity.getLastMdfrId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("🔒 삭제 - 타인은 비밀번호 없이도 남의 만족도를 삭제할 수 없다")
    void deleteRejectsNonOwner() {
        authenticateAs("attacker", "USER");
        Satisfaction entity = satisfactionOwnedBy("owner");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(entity));

        assertThatThrownBy(() -> satisfactionService.deleteSatisfaction(10L))
                .isInstanceOf(BusinessException.class);
        assertThat(entity.getUseYn()).isNotEqualTo("N");
    }

    @Test
    @DisplayName("🔒 작성자 없는 레거시 행은 관리자도 일반 수정·삭제할 수 없다")
    void ownerlessLegacyRowRejectsGeneralAdminMutation() {
        authenticateAs("admin", "ADMIN");
        Satisfaction ownerless = Satisfaction.builder().dgstfnSn(10L).dgstfnScr(5).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(ownerless));

        assertThatThrownBy(() -> satisfactionService.updateSatisfaction(updateDto()))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> satisfactionService.deleteSatisfaction(10L))
                .isInstanceOf(BusinessException.class);
        assertThat(ownerless.getUseYn()).isNotEqualTo("N");
    }

    @Test
    @DisplayName("작성자 없는 레거시 행은 관리자 moderation 경로로만 삭제한다")
    void ownerlessLegacyRowAllowsAdminModeration() {
        authenticateAs("admin", "ADMIN");
        Satisfaction ownerless = Satisfaction.builder().dgstfnSn(10L).build();
        given(satisfactionRepository.findById(10L)).willReturn(Optional.of(ownerless));

        satisfactionService.deleteByModerator(10L);

        assertThat(ownerless.getUseYn()).isEqualTo("N");
        assertThat(ownerless.getLastMdfrId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("🔒 일반 사용자는 moderation 경로를 호출할 수 없다")
    void moderationRejectsNonAdmin() {
        authenticateAs("owner", "USER");

        assertThatThrownBy(() -> satisfactionService.deleteByModerator(10L))
                .isInstanceOf(BusinessException.class);
        verify(satisfactionRepository, never()).findById(any());
    }

    // ---------- 조회 ----------

    @Test
    @DisplayName("만족도 목록 조회")
    void getSatisfactionList() {
        given(satisfactionRepository.findByPstSnAndBbsIdAndUseYn(any(Long.class), anyString(), anyString()))
                .willReturn(List.of(Satisfaction.builder().dgstfnSn(1L).build()));

        assertThat(satisfactionService.getSatisfactionList("BBS_01", 1L)).hasSize(1);
    }

    @Test
    @DisplayName("만족도 평균 조회")
    void getAverageSatisfaction() {
        given(satisfactionRepository.getAverageSatisfaction(any(Long.class), anyString())).willReturn(4.5);

        assertThat(satisfactionService.getAverageSatisfaction("BBS_01", 1L)).isEqualTo(4.5);
    }

    @Test
    @DisplayName("만족도 상세 조회 성공")
    void getSatisfactionSuccess() {
        given(satisfactionRepository.findById(10L))
                .willReturn(Optional.of(Satisfaction.builder().dgstfnSn(10L).build()));

        assertThat(satisfactionService.getSatisfaction(10L).getDgstfnSn()).isEqualTo(10L);
    }

    @Test
    @DisplayName("만족도 상세 조회 실패 - 리소스 없음")
    void getSatisfactionNotFound() {
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> satisfactionService.getSatisfaction(10L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("만족도 수정 실패 - 리소스 없음")
    void updateSatisfactionNotFound() {
        authenticateAs("user1", "USER");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> satisfactionService.updateSatisfaction(updateDto()))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("만족도 삭제 실패 - 리소스 없음")
    void deleteSatisfactionNotFound() {
        authenticateAs("user1", "USER");
        given(satisfactionRepository.findById(10L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> satisfactionService.deleteSatisfaction(10L))
                .isInstanceOf(BusinessException.class);
    }
}
