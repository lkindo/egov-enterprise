package nuri.business.service.reward;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import nuri.foundation.core.exception.BusinessException;
import java.util.Optional;

import nuri.business.domain.reward.RewardManage;
import nuri.business.domain.reward.RewardManageRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.reward.dto.RewardManageDto;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("RewardManageService (포상 관리) 테스트")
class RewardManageServiceTest {

    @Mock
    private RewardManageRepository rewardManageRepository;

    @Mock
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @InjectMocks
    private RewardManageService rewardManageService;

    private static final Pageable PAGEABLE = PageRequest.of(0, 10);

    @BeforeEach
    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private static void authorize(String permission) {
        authenticate(List.of(permission), List.of());
    }

    private static void authenticate(List<String> permissions, List<String> groups) {
        var principal = CustomUserDetails.builder().userId("operator").esntlId("OPERATOR")
                .enabled(true).permissions(permissions).groups(groups).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, groups.isEmpty()
                        ? principal.getAuthorities() : groups.stream().map(SimpleGrantedAuthority::new).toList()));
    }

    static Stream<Arguments> deniedWrites() {
        return Stream.of("CREATE", "UPDATE", "DELETE").flatMap(operation ->
                Stream.of("NONE", "ANONYMOUS", "USER", "WRONG", "ROLE")
                        .map(identity -> Arguments.of(operation, identity)));
    }

    @ParameterizedTest
    @MethodSource("deniedWrites")
    void managementWriteRequiresItsExactPermissionBeforeDependencies(String operation, String identity) {
        switch (identity) {
            case "ANONYMOUS" -> SecurityContextHolder.getContext().setAuthentication(
                    new AnonymousAuthenticationToken("fixture", "anonymous",
                            List.of(new SimpleGrantedAuthority("REWARD_" + operation))));
            case "USER" -> authenticate(List.of(), List.of());
            case "WRONG" -> authorize(operation.equals("CREATE") ? "REWARD_UPDATE" : "REWARD_CREATE");
            case "ROLE" -> authenticate(List.of(), List.of("ROLE_ADMIN", "ROLE_SYSTEM"));
            default -> SecurityContextHolder.clearContext();
        }
        RewardManage foreign = RewardManage.builder().rwrdSn(7L).rwrdNm("foreign reward").build();
        foreign.setFrstRgtrId("foreign-writer");
        if (!operation.equals("CREATE")) {
            org.mockito.Mockito.lenient().when(rewardManageRepository.findById(7L)).thenReturn(Optional.of(foreign));
        }
        var dto = RewardManageDto.builder().rwardNm("changed").atchFileSn(101L).build();
        Runnable write = switch (operation) {
            case "CREATE" -> () -> rewardManageService.createReward(dto);
            case "UPDATE" -> () -> rewardManageService.updateReward(7L, dto);
            default -> () -> rewardManageService.deleteReward(7L);
        };
        assertThatThrownBy(write::run).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        org.mockito.Mockito.verifyNoInteractions(rewardManageRepository, attachmentAssignmentPolicy);
        assertThat(foreign.getRwrdNm()).isEqualTo("foreign reward");
    }

    @Test
    @DisplayName("포상 전체 조회 - 페이징")
    void getRewardList_Success() {
        // Given
        RewardManage entity = RewardManage.builder().rwrdSn(1L).rwrdNm("Excellence").build();
        given(rewardManageRepository.findAll(PAGEABLE)).willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = rewardManageService.getRewardList(null, PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getRwardNm()).isEqualTo("Excellence");
    }

    @Test
    @DisplayName("이름으로 포상 검색 - 페이징")
    void getRewardList_SearchByName() {
        // Given
        RewardManage entity = RewardManage.builder().rwrdSn(1L).rwrdNm("Gold Prize").build();
        given(rewardManageRepository.findByRwrdNmContaining("Gold", PAGEABLE))
                .willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));

        // When
        var result = rewardManageService.getRewardList("Gold", PAGEABLE);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("포상 등록")
    void createReward_Success() {
        authorize("REWARD_CREATE");
        // Given
        RewardManageDto dto = RewardManageDto.builder()
                .rwardNm("New Reward")
                .atchFileSn(101L)
                .build();
        RewardManage savedEntity = RewardManage.builder().rwrdSn(2L).rwrdNm("New Reward").build();
        given(rewardManageRepository.save(any(RewardManage.class))).willReturn(savedEntity);

        // When
        RewardManageDto result = rewardManageService.createReward(dto);

        // Then
        assertThat(result.getRwrdSn()).isEqualTo(2L);
        org.mockito.ArgumentCaptor<RewardManage> saved =
                org.mockito.ArgumentCaptor.forClass(RewardManage.class);
        org.mockito.Mockito.verify(rewardManageRepository).save(saved.capture());
        assertThat(saved.getValue().getAtchFileSn()).isEqualTo(101L);
        org.mockito.Mockito.verify(attachmentAssignmentPolicy).assertAssignable(101L);
    }

    @Test
    @DisplayName("🚨 감사 필드는 요청 값을 저장하지 않고, 승인 컬럼에는 아무것도 쓰지 않는다 — 승인 절차가 제품에 없다")
    void createReward_ignoresClientAuditFieldsAndWritesNoApproval() {
        authorize("REWARD_CREATE");
        RewardManageDto dto = RewardManageDto.builder()
                .rwardNm("포상")
                .frstRgtrId("forged-writer")
                .lastMdfrId("forged-writer")
                .build();
        given(rewardManageRepository.save(any(RewardManage.class))).willAnswer(invocation -> invocation.getArgument(0));

        rewardManageService.createReward(dto);

        org.mockito.ArgumentCaptor<RewardManage> saved = org.mockito.ArgumentCaptor.forClass(RewardManage.class);
        org.mockito.Mockito.verify(rewardManageRepository).save(saved.capture());
        RewardManage entity = saved.getValue();
        // [2026-10-19] 종전에는 새 포상을 언제나 대기('N')로 적었다 — 아무도 승인할 수 없는 대기였다.
        assertThat(entity.getConfmYn()).isNull();
        assertThat(entity.getAtrzrId()).isNull();
        assertThat(entity.getAprvDt()).isNull();
        assertThat(entity.getRtnRsnCn()).isNull();
        assertThat(entity.getIfmlAtrzSn()).isNull();
        assertThat(entity.getFrstRgtrId()).isNull();
        assertThat(entity.getLastMdfrId()).isNull();
        assertThat(entity.getRwrdNm()).isEqualTo("포상");
    }

    @Test
    @DisplayName("승인 필드는 API 계약에 없고 남은 물리 컬럼의 매핑은 읽기 전용이다 — 없는 승인 절차를 약속하지 않는다")
    void approvalSurfaceIsRetiredAndRetainedColumnsAreReadOnly() throws Exception {
        assertThat(java.util.Arrays.stream(RewardManageDto.class.getDeclaredFields()).map(java.lang.reflect.Field::getName))
                .doesNotContain("sanctnerId", "confmAt", "sanctnDt", "returnResn", "ifmlAtrzSn");
        for (String column : List.of("atrzrId", "confmYn", "aprvDt", "rtnRsnCn", "ifmlAtrzSn")) {
            jakarta.persistence.Column mapping =
                    RewardManage.class.getDeclaredField(column).getAnnotation(jakarta.persistence.Column.class);
            assertThat(mapping).as(column + " 매핑").isNotNull();
            assertThat(mapping.insertable()).as(column + " 은 앱이 쓰지 않는다(insertable)").isFalse();
            assertThat(mapping.updatable()).as(column + " 은 앱이 쓰지 않는다(updatable)").isFalse();
        }
    }

    @Test
    @DisplayName("포상 등록 - 첨부 할당 거부 시 저장하지 않는다")
    void createReward_deniedAttachmentDoesNotSave() {
        authorize("REWARD_CREATE");
        RewardManageDto dto = RewardManageDto.builder()
                .rwardNm("New Reward")
                .atchFileSn(101L)
                .build();
        org.mockito.Mockito.doThrow(new BusinessException(CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> rewardManageService.createReward(dto))
                .isInstanceOf(BusinessException.class);

        org.mockito.Mockito.verify(attachmentAssignmentPolicy).assertAssignable(101L);
        org.mockito.Mockito.verifyNoInteractions(rewardManageRepository);
    }

    // [2026-09-05 DEC-OPS-036] 수정·삭제 경로 — 종전에는 등록만 되고 고칠 수 없었다.
    @Test
    @DisplayName("포상 수정 — 화면이 편집하는 필드와 첨부파일을 갱신하고 식별자는 유지한다")
    void updateReward_Success() {
        authorize("REWARD_UPDATE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("U1").rwrdCd("R01")
                .rwrdYmd("20260101").rwrdNm("Old").cntrbCn("old").atchFileSn(100L).build();
        entity.setFrstRgtrId("foreign-writer");
        org.springframework.test.util.ReflectionTestUtils.setField(entity, "version", 0);
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));
        RewardManageDto dto = RewardManageDto.builder().rwrdSn(999L).rwardwnrId("U2").rwardCode("R02")
                .rwardDe("20260202").rwardNm("New").pblenCn("new").atchFileSn(202L).version(0).build();

        RewardManageDto result = rewardManageService.updateReward(7L, dto);

        assertThat(result.getRwrdSn()).isEqualTo(7L);
        assertThat(result.getRwardwnrId()).isEqualTo("U2");
        assertThat(result.getRwardCode()).isEqualTo("R02");
        assertThat(result.getRwardDe()).isEqualTo("20260202");
        assertThat(result.getRwardNm()).isEqualTo("New");
        assertThat(result.getPblenCn()).isEqualTo("new");
        assertThat(result.getAtchFileSn()).isEqualTo(202L);
        assertThat(result.getFrstRgtrId()).isEqualTo("foreign-writer");
        verify(attachmentAssignmentPolicy).assertAssignable(202L);
        // 응답이 올라간 버전을 싣도록 먼저 내보낸다(@Version 은 flush 때 오른다).
        verify(rewardManageRepository).flush();
    }

    @Test
    @DisplayName("[2026-10-18] 포상 수정 — 읽은 버전이 다르면 409, 버전이 없으면 400 이고 기록을 바꾸지 않는다")
    void updateReward_rejectsStaleOrMissingVersion() {
        authorize("REWARD_UPDATE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("U1").rwrdCd("R01").rwrdNm("Current").build();
        org.springframework.test.util.ReflectionTestUtils.setField(entity, "version", 6);
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));

        assertThatThrownBy(() -> rewardManageService.updateReward(7L, RewardManageDto.builder()
                .rwardwnrId("U2").rwardCode("R02").rwardNm("Stale").version(5).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> rewardManageService.updateReward(7L, RewardManageDto.builder()
                .rwardwnrId("U2").rwardCode("R02").rwardNm("No version").build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(entity.getRwrdNm()).isEqualTo("Current");
        org.mockito.Mockito.verify(rewardManageRepository, org.mockito.Mockito.never()).flush();
        org.mockito.Mockito.verifyNoInteractions(attachmentAssignmentPolicy);
    }

    @Test
    @DisplayName("포상 삭제")
    void deleteReward_Success() {
        authorize("REWARD_DELETE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdNm("Old").build();
        entity.setFrstRgtrId("foreign-writer");
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));

        rewardManageService.deleteReward(7L);

        verify(rewardManageRepository).delete(entity);
    }

    @Test
    @DisplayName("없는 포상의 수정·삭제는 RESOURCE_NOT_FOUND")
    void updateOrDelete_NotFound() {
        authorize("REWARD_UPDATE");
        given(rewardManageRepository.findById(9L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> rewardManageService.updateReward(9L, RewardManageDto.builder().build()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        authorize("REWARD_DELETE");
        assertThatThrownBy(() -> rewardManageService.deleteReward(9L)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(rewardManageRepository, never()).delete(any(RewardManage.class));
    }
}
