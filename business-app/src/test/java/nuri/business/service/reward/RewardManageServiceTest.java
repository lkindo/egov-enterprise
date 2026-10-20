package nuri.business.service.reward;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import nuri.foundation.core.exception.BusinessException;
import java.util.Optional;

import nuri.business.domain.reward.RewardManage;
import nuri.business.domain.reward.RewardManageRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.reward.dto.RewardManageDto;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("RewardManageService (포상 관리) 테스트")
class RewardManageServiceTest {

    @Mock
    private RewardManageRepository rewardManageRepository;

    @Mock
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RewardManageService rewardManageService;

    private static final Pageable PAGEABLE = PageRequest.of(0, 10);
    private static final String AWARDEE = "USR_000000000001";

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

    private static User account(String esntlId, String status) {
        return User.builder().esntlId(esntlId).userId("login-" + esntlId).userNm("이름-" + esntlId)
                .pswd("{bcrypt}x").userSttsCd(status).build();
    }

    /** 수상자 계정이 있고 그 상태가 status 다. 이름·부서는 담당자 검색과 같은 최소 프로필로 돌아온다. */
    private void givenAwardee(String esntlId, String status) {
        given(userRepository.findById(esntlId)).willReturn(Optional.of(account(esntlId, status)));
        org.mockito.Mockito.lenient().when(userRepository.findProfilesByEsntlIds(List.of(esntlId)))
                .thenReturn(List.of(new UserSearchDto(esntlId, "이름-" + esntlId, "부서-" + esntlId, false)));
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
        var dto = RewardManageDto.builder().rwardNm("changed").rwardwnrId(AWARDEE).atchFileSn(101L).build();
        Runnable write = switch (operation) {
            case "CREATE" -> () -> rewardManageService.createReward(dto);
            case "UPDATE" -> () -> rewardManageService.updateReward(7L, dto);
            default -> () -> rewardManageService.deleteReward(7L);
        };
        assertThatThrownBy(write::run).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        // 권한이 없으면 수상자 계정도 조회하지 않는다 — 권한 없는 호출로 계정 존재를 알아내지 못한다.
        org.mockito.Mockito.verifyNoInteractions(rewardManageRepository, attachmentAssignmentPolicy, userRepository);
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
        // 수상자 식별자가 없는 행만 있으면 계정을 조회하지 않는다(빈 in 조건은 전체 조회가 될 수 있다).
        org.mockito.Mockito.verifyNoInteractions(userRepository);
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
        // 공백뿐인 검색어는 검색어가 없는 것과 같다.
        given(rewardManageRepository.findAll(PAGEABLE)).willReturn(new PageImpl<>(List.of(entity), PAGEABLE, 1));
        assertThat(rewardManageService.getRewardList("   ", PAGEABLE).getContent()).hasSize(1);
        verify(rewardManageRepository, never()).findByRwrdNmContaining(org.mockito.ArgumentMatchers.eq("   "), any());
    }

    @Test
    @DisplayName("[2026-10-20] 목록은 한 페이지의 수상자 이름·부서를 한 번에 읽어 싣고, 지워진 계정은 식별자만 남긴다")
    void getRewardList_resolvesAwardeeNamesInOneBatch() {
        RewardManage first = RewardManage.builder().rwrdSn(1L).rwrdUserId("U1").rwrdNm("A").build();
        RewardManage second = RewardManage.builder().rwrdSn(2L).rwrdUserId("U1").rwrdNm("B").build();
        RewardManage ghost = RewardManage.builder().rwrdSn(3L).rwrdUserId("GONE").rwrdNm("C").build();
        given(rewardManageRepository.findAll(PAGEABLE))
                .willReturn(new PageImpl<>(List.of(first, second, ghost), PAGEABLE, 3));
        given(userRepository.findProfilesByEsntlIds(List.of("U1", "GONE")))
                .willReturn(List.of(new UserSearchDto("U1", "홍길동", "총무과", false)));

        var rows = rewardManageService.getRewardList(null, PAGEABLE).getContent();

        assertThat(rows).extracting(RewardManageDto::getRwardwnrNm).containsExactly("홍길동", "홍길동", null);
        assertThat(rows).extracting(RewardManageDto::getRwardwnrDeptNm).containsExactly("총무과", "총무과", null);
        assertThat(rows.get(2).getRwardwnrId()).isEqualTo("GONE");
        // 같은 수상자는 한 번만 묻고, 행마다 따로 조회하지 않는다.
        verify(userRepository).findProfilesByEsntlIds(List.of("U1", "GONE"));
        verify(userRepository, never()).findById(anyString());
    }

    @Test
    @DisplayName("[2026-10-20] 프로필 조회가 같은 사람을 두 줄로 돌려줘도(부재 기록 조인) 첫 줄의 이름·부서를 쓴다")
    void getRewardList_keepsFirstProfileWhenLookupRepeatsAPerson() {
        RewardManage reward = RewardManage.builder().rwrdSn(1L).rwrdUserId("U1").rwrdNm("A").build();
        given(rewardManageRepository.findAll(PAGEABLE)).willReturn(new PageImpl<>(List.of(reward), PAGEABLE, 1));
        given(userRepository.findProfilesByEsntlIds(List.of("U1"))).willReturn(List.of(
                new UserSearchDto("U1", "홍길동", "총무과", false), new UserSearchDto("U1", "홍길동", "총무과", true)));

        var row = rewardManageService.getRewardList(null, PAGEABLE).getContent().get(0);

        assertThat(row.getRwardwnrNm()).isEqualTo("홍길동");
        assertThat(row.getRwardwnrDeptNm()).isEqualTo("총무과");
    }

    @Test
    @DisplayName("포상 등록")
    void createReward_Success() {
        authorize("REWARD_CREATE");
        givenAwardee(AWARDEE, "P");
        // Given
        RewardManageDto dto = RewardManageDto.builder()
                .rwardNm("New Reward")
                .rwardwnrId(AWARDEE)
                .atchFileSn(101L)
                .build();
        RewardManage savedEntity = RewardManage.builder().rwrdSn(2L).rwrdUserId(AWARDEE).rwrdNm("New Reward").build();
        given(rewardManageRepository.save(any(RewardManage.class))).willReturn(savedEntity);

        // When
        RewardManageDto result = rewardManageService.createReward(dto);

        // Then
        assertThat(result.getRwrdSn()).isEqualTo(2L);
        assertThat(result.getRwardwnrNm()).isEqualTo("이름-" + AWARDEE);
        assertThat(result.getRwardwnrDeptNm()).isEqualTo("부서-" + AWARDEE);
        org.mockito.ArgumentCaptor<RewardManage> saved =
                org.mockito.ArgumentCaptor.forClass(RewardManage.class);
        org.mockito.Mockito.verify(rewardManageRepository).save(saved.capture());
        assertThat(saved.getValue().getAtchFileSn()).isEqualTo(101L);
        assertThat(saved.getValue().getRwrdUserId()).isEqualTo(AWARDEE);
        org.mockito.Mockito.verify(attachmentAssignmentPolicy).assertAssignable(101L);
    }

    @Test
    @DisplayName("🚨 감사 필드는 요청 값을 저장하지 않고, 승인 컬럼에는 아무것도 쓰지 않는다 — 승인 절차가 제품에 없다")
    void createReward_ignoresClientAuditFieldsAndWritesNoApproval() {
        authorize("REWARD_CREATE");
        givenAwardee(AWARDEE, "P");
        RewardManageDto dto = RewardManageDto.builder()
                .rwardNm("포상")
                .rwardwnrId(AWARDEE)
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
        // 첨부가 없으면 첨부 배정 검사를 하지 않는다.
        org.mockito.Mockito.verifyNoInteractions(attachmentAssignmentPolicy);
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
        givenAwardee(AWARDEE, "P");
        RewardManageDto dto = RewardManageDto.builder()
                .rwardNm("New Reward")
                .rwardwnrId(AWARDEE)
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

    /**
     * [2026-10-20] 수상자는 사용자 검색으로 고르는 내부 식별자다. 종전에는 아무 문자열이나 받아 없는 사람에게 포상이 기록됐다.
     * 계정이 없거나 사용 중이 아니면 400 과 다음 행동을 적은 문구로 거부하고, 저장·첨부 배정까지 가지 않는다.
     */
    @ParameterizedTest
    @ValueSource(strings = {"MISSING", "BLANK", "D", "A", "NULL_STATUS"})
    @DisplayName("[2026-10-20] 없거나 사용 중이 아닌 수상자의 포상 등록은 400 이고 저장·첨부 배정을 하지 않는다")
    void createReward_rejectsMissingOrInactiveAwardee(String awardeeCase) {
        authorize("REWARD_CREATE");
        String awardeeId = switch (awardeeCase) {
            case "BLANK" -> "  ";
            case "MISSING" -> "GHOST";
            default -> AWARDEE;
        };
        switch (awardeeCase) {
            case "MISSING" -> given(userRepository.findById("GHOST")).willReturn(Optional.empty());
            case "NULL_STATUS" -> {
                User account = account(AWARDEE, "P");
                ReflectionTestUtils.setField(account, "userSttsCd", null);
                given(userRepository.findById(AWARDEE)).willReturn(Optional.of(account));
            }
            case "BLANK" -> { }
            default -> given(userRepository.findById(AWARDEE)).willReturn(Optional.of(account(AWARDEE, awardeeCase)));
        }
        RewardManageDto dto = RewardManageDto.builder().rwardNm("포상").rwardwnrId(awardeeId).rwardCode("R01")
                .atchFileSn(101L).build();

        String expected = switch (awardeeCase) {
            case "BLANK" -> RewardManageService.AWARDEE_REQUIRED;
            case "MISSING" -> RewardManageService.AWARDEE_NOT_FOUND;
            default -> RewardManageService.AWARDEE_INACTIVE;
        };
        assertThatThrownBy(() -> rewardManageService.createReward(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessage(expected)
                // 사용 중이 아닌 계정의 이름을 거부 문구로 알려 주지 않는다.
                .message().doesNotContain("이름-");

        org.mockito.Mockito.verifyNoInteractions(rewardManageRepository, attachmentAssignmentPolicy);
        verify(userRepository, never()).findProfilesByEsntlIds(anyCollection());
    }

    @Test
    @DisplayName("[2026-10-20] 수상자를 바꾸는 수정은 새 수상자가 사용 중이어야 하고, 아니면 400 이며 기록을 바꾸지 않는다")
    void updateReward_rejectsInactiveNewAwardee() {
        authorize("REWARD_UPDATE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("U1").rwrdCd("R01").rwrdNm("Current").build();
        ReflectionTestUtils.setField(entity, "version", 0);
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));
        given(userRepository.findById("RETIRED")).willReturn(Optional.of(account("RETIRED", "D")));

        assertThatThrownBy(() -> rewardManageService.updateReward(7L, RewardManageDto.builder()
                .rwardwnrId("RETIRED").rwardCode("R01").rwardNm("Changed").version(0).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessage(RewardManageService.AWARDEE_INACTIVE);

        assertThat(entity.getRwrdUserId()).isEqualTo("U1");
        assertThat(entity.getRwrdNm()).isEqualTo("Current");
        verify(rewardManageRepository, never()).flush();
        org.mockito.Mockito.verifyNoInteractions(attachmentAssignmentPolicy);
    }

    @Test
    @DisplayName("[2026-10-20] 수상자를 그대로 두는 수정은 그 계정이 사용 중지돼도 된다 — 받은 당시의 기록을 고칠 수 있어야 한다")
    void updateReward_keepsUnchangedAwardeeEvenIfNoLongerActive() {
        authorize("REWARD_UPDATE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("RETIRED").rwrdCd("R01").rwrdNm("Old").build();
        ReflectionTestUtils.setField(entity, "version", 3);
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));
        given(userRepository.findProfilesByEsntlIds(List.of("RETIRED")))
                .willReturn(List.of(new UserSearchDto("RETIRED", "퇴직자", "총무과", false)));

        RewardManageDto result = rewardManageService.updateReward(7L, RewardManageDto.builder()
                .rwardwnrId("RETIRED").rwardCode("R01").rwardNm("오타 정정").version(3).build());

        assertThat(entity.getRwrdNm()).isEqualTo("오타 정정");
        assertThat(result.getRwardwnrNm()).isEqualTo("퇴직자");
        assertThat(result.getRwardwnrDeptNm()).isEqualTo("총무과");
        // 상태는 보지 않는다 — 수상자가 바뀌지 않았다.
        verify(userRepository, never()).findById(anyString());
        verify(rewardManageRepository).flush();
    }

    // [2026-09-05 DEC-OPS-036] 수정·삭제 경로 — 종전에는 등록만 되고 고칠 수 없었다.
    @Test
    @DisplayName("포상 수정 — 화면이 편집하는 필드와 첨부파일을 갱신하고 식별자는 유지한다")
    void updateReward_Success() {
        authorize("REWARD_UPDATE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("U1").rwrdCd("R01")
                .rwrdYmd("20260101").rwrdNm("Old").cntrbCn("old").atchFileSn(100L).build();
        entity.setFrstRgtrId("foreign-writer");
        ReflectionTestUtils.setField(entity, "version", 0);
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));
        givenAwardee("U2", "P");
        RewardManageDto dto = RewardManageDto.builder().rwrdSn(999L).rwardwnrId("U2").rwardCode("R02")
                .rwardDe("20260202").rwardNm("New").pblenCn("new").atchFileSn(202L).version(0).build();

        RewardManageDto result = rewardManageService.updateReward(7L, dto);

        assertThat(result.getRwrdSn()).isEqualTo(7L);
        assertThat(result.getRwardwnrId()).isEqualTo("U2");
        assertThat(result.getRwardwnrNm()).isEqualTo("이름-U2");
        assertThat(result.getRwardCode()).isEqualTo("R02");
        assertThat(result.getRwardDe()).isEqualTo("20260202");
        assertThat(result.getRwardNm()).isEqualTo("New");
        assertThat(result.getPblenCn()).isEqualTo("new");
        assertThat(result.getAtchFileSn()).isEqualTo(202L);
        assertThat(result.getFrstRgtrId()).isEqualTo("foreign-writer");
        verify(attachmentAssignmentPolicy).assertAssignable(202L);
        // 바뀐 수상자는 사용 중인지 본다.
        verify(userRepository).findById("U2");
        // 응답이 올라간 버전을 싣도록 먼저 내보낸다(@Version 은 flush 때 오른다).
        verify(rewardManageRepository).flush();
    }

    @Test
    @DisplayName("포상 수정 — 첨부를 바꾸지 않으면 첨부 배정을 다시 검사하지 않고 기존 첨부를 유지한다")
    void updateReward_keepsAttachmentWithoutReassignment() {
        authorize("REWARD_UPDATE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("U1").rwrdCd("R01").rwrdNm("Old")
                .atchFileSn(100L).build();
        ReflectionTestUtils.setField(entity, "version", 0);
        given(rewardManageRepository.findById(7L)).willReturn(Optional.of(entity));

        rewardManageService.updateReward(7L, RewardManageDto.builder().rwardwnrId("U1").rwardCode("R01")
                .rwardNm("Same file").atchFileSn(100L).version(0).build());
        assertThat(entity.getAtchFileSn()).isEqualTo(100L);
        rewardManageService.updateReward(7L, RewardManageDto.builder().rwardwnrId("U1").rwardCode("R01")
                .rwardNm("No file").version(0).build());
        assertThat(entity.getAtchFileSn()).isEqualTo(100L);

        org.mockito.Mockito.verifyNoInteractions(attachmentAssignmentPolicy);
    }

    @Test
    @DisplayName("[2026-10-18] 포상 수정 — 읽은 버전이 다르면 409, 버전이 없으면 400 이고 기록을 바꾸지 않는다")
    void updateReward_rejectsStaleOrMissingVersion() {
        authorize("REWARD_UPDATE");
        RewardManage entity = RewardManage.builder().rwrdSn(7L).rwrdUserId("U1").rwrdCd("R01").rwrdNm("Current").build();
        ReflectionTestUtils.setField(entity, "version", 6);
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
        // 버전 판정이 수상자 판정보다 먼저다 — 낡은 화면의 요청으로 계정을 조회하지 않는다.
        org.mockito.Mockito.verifyNoInteractions(attachmentAssignmentPolicy, userRepository);
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
