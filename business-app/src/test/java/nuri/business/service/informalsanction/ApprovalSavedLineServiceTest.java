package nuri.business.service.informalsanction;

import nuri.business.domain.informalsanction.ApprovalSavedLine;
import nuri.business.domain.informalsanction.ApprovalSavedLineApprover;
import nuri.business.domain.informalsanction.ApprovalSavedLineApproverId;
import nuri.business.domain.informalsanction.ApprovalSavedLineApproverRepository;
import nuri.business.domain.informalsanction.ApprovalSavedLineRepository;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.informalsanction.dto.ApprovalSavedLineDto;
import nuri.business.service.informalsanction.dto.ApprovalSavedLineRequest;
import nuri.business.service.informalsanction.dto.ApprovalSavedLineSummaryDto;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.ApproverProfileDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 나의 결재선 계약(2026-10-16 결재 동선 개선 D2, DEC-OPS-328).
 *
 * <p>주인 본인만 다루고(남의 번호는 404), 저장과 불러오기 모두 결재자 자격(본인 아님·사용 중·결재 권한)을 지금 기준으로 다시
 * 판정하며, 1인 20개 상한을 사용자 행을 잠근 뒤 센다. 불러올 때 자격을 잃은 사람은 이름 없이 빼고 그 수만 싣는다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("나의 결재선 계약")
class ApprovalSavedLineServiceTest {
    private static final String OWNER = "owner";

    @Mock private ApprovalSavedLineRepository lineRepository;
    @Mock private ApprovalSavedLineApproverRepository approverRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApprovalLineAssistService lineAssistService;
    @InjectMocks private ApprovalSavedLineService service;
    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        authenticate(OWNER);
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private void authenticate(String esntlId) {
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(esntlId));
    }

    private static ApprovalSavedLine line(long sn, String name) {
        ApprovalSavedLine line = ApprovalSavedLine.create(OWNER, name);
        ReflectionTestUtils.setField(line, "ifmlAtrzIndvAplnSn", sn);
        ReflectionTestUtils.setField(line, "mdfcnDt", LocalDateTime.of(2026, 10, 16, 9, 30));
        return line;
    }

    private static ApprovalSavedLineApprover row(long sn, int seq, String userId, ApprovalStageKind kind) {
        return ApprovalSavedLineApprover.create(new ApprovalSavedLineApproverId(sn, BigDecimal.valueOf(seq), userId), kind);
    }

    private static ApprovalStageRequest stage(ApprovalStageKind kind, String... approvers) {
        return new ApprovalStageRequest(kind, Arrays.asList(approvers));
    }

    private static ApprovalSavedLineRequest request(String name, List<ApprovalStageRequest> stages) {
        return ApprovalSavedLineRequest.builder().aplnNm(name).stages(stages).build();
    }

    /** 사전 확인 결과. 사용 중이 아니거나 없는 계정은 이름·부서가 비어 온다(ApprovalLineAssistService 와 같다). */
    private static ApproverProfileDto profile(String id, String reason) {
        boolean known = !"NOT_FOUND".equals(reason) && !"INACTIVE".equals(reason);
        return new ApproverProfileDto(id, known ? id + "님" : null, known ? "부서" : null, false, reason == null, reason,
                reason == null, reason);
    }

    private void eligible(String... ids) {
        given(lineAssistService.checkApprovers(eq(OWNER), anyList()))
                .willReturn(Arrays.stream(ids).map(id -> profile(id, null)).toList());
    }

    private void lockedOwner() {
        given(userRepository.findByEsntlIdForUpdate(OWNER)).willReturn(Optional.of(User.builder().esntlId(OWNER).build()));
    }

    @Test
    @DisplayName("목록은 이름 순 저장소 조회 결과에 단계 수와 결재자 수를 붙인다 — 결재자 이름은 싣지 않는다")
    void listsLinesWithCounts() {
        given(lineRepository.findTop20ByUserIdOrderByAplnNmAscIfmlAtrzIndvAplnSnAsc(OWNER))
                .willReturn(List.of(line(1L, "팀장 결재"), line(2L, "부서 합의")));
        given(approverRepository.findForLines(List.of(1L, 2L))).willReturn(List.of(
                row(1L, 1, "A", ApprovalStageKind.APPROVAL), row(1L, 2, "B", ApprovalStageKind.AGREEMENT),
                row(1L, 2, "C", ApprovalStageKind.AGREEMENT), row(2L, 1, "D", ApprovalStageKind.APPROVAL)));

        List<ApprovalSavedLineSummaryDto> lines = service.getSavedLines(OWNER);

        assertThat(lines).extracting(ApprovalSavedLineSummaryDto::savedLineSn, ApprovalSavedLineSummaryDto::aplnNm,
                        ApprovalSavedLineSummaryDto::stageCount, ApprovalSavedLineSummaryDto::approverCount)
                .containsExactly(tuple(1L, "팀장 결재", 2, 3), tuple(2L, "부서 합의", 1, 1));
        verifyNoInteractions(lineAssistService);
    }

    @Test
    @DisplayName("남의 목록·결재선은 요청한 사람이 주인이 아니면 저장소를 읽기 전에 거부한다(관리자도 대신 다루지 못한다)")
    void onlyOwnerReachesRepository() {
        authenticate("intruder");

        assertThatThrownBy(() -> service.getSavedLines(OWNER)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.getSavedLine(OWNER, 1L)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.createSavedLine(OWNER, request("이름", List.of(stage(ApprovalStageKind.APPROVAL, "A")))))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.deleteSavedLine(OWNER, 1L)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(lineRepository, approverRepository, userRepository, lineAssistService);
    }

    @Test
    @DisplayName("남의 결재선 번호는 없는 번호와 같이 404 다 — 불러오기·덮어쓰기·지우기 모두 번호와 주인을 함께 조건으로 둔다")
    void othersLineIsNotFound() {
        given(lineRepository.findByIfmlAtrzIndvAplnSnAndUserId(9L, OWNER)).willReturn(Optional.empty());
        given(lineRepository.findOwnedForUpdate(9L, OWNER)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSavedLine(OWNER, 9L)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        assertThatThrownBy(() -> service.updateSavedLine(OWNER, 9L, request("이름", List.of(stage(ApprovalStageKind.APPROVAL, "A")))))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        assertThatThrownBy(() -> service.deleteSavedLine(OWNER, 9L)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(lineRepository, never()).delete(any());
        verifyNoInteractions(approverRepository);
    }

    @Test
    @DisplayName("불러오기는 지금 자격을 다시 판정해 자격을 잃은 사람을 이름 없이 빼고, 사람이 모두 빠진 단계도 빼며 그 수를 싣는다")
    void loadDropsApproversWhoNoLongerQualify() {
        given(lineRepository.findByIfmlAtrzIndvAplnSnAndUserId(1L, OWNER)).willReturn(Optional.of(line(1L, "팀장 결재")));
        given(approverRepository.findForLines(List.of(1L))).willReturn(List.of(
                row(1L, 1, "GONE", ApprovalStageKind.APPROVAL),
                row(1L, 2, "B", ApprovalStageKind.AGREEMENT), row(1L, 2, "NOPERM", ApprovalStageKind.AGREEMENT),
                row(1L, 3, "C", ApprovalStageKind.APPROVAL), row(1L, 3, OWNER, ApprovalStageKind.APPROVAL)));
        given(lineAssistService.checkApprovers(OWNER, List.of("GONE", "B", "NOPERM", "C", OWNER))).willReturn(List.of(
                profile("GONE", "INACTIVE"), profile("B", null), profile("NOPERM", "NO_PERMISSION"), profile("C", null),
                profile(OWNER, "SELF")));

        ApprovalSavedLineDto loaded = service.getSavedLine(OWNER, 1L);

        assertThat(loaded.aplnNm()).isEqualTo("팀장 결재");
        assertThat(loaded.droppedApproverCount()).isEqualTo(3);
        assertThat(loaded.droppedStageCount()).as("1단계는 사람이 모두 빠졌다").isEqualTo(1);
        assertThat(loaded.stages()).extracting(stage -> stage.kind())
                .containsExactly(ApprovalStageKind.AGREEMENT, ApprovalStageKind.APPROVAL);
        assertThat(loaded.stages()).flatExtracting(stage -> stage.approvers())
                .extracting(ApproverProfileDto::esntlId).containsExactly("B", "C");
        assertThat(loaded.toString()).as("자격을 잃은 사람의 식별자도 응답에 남지 않는다").doesNotContain("GONE", "NOPERM");
    }

    @Test
    @DisplayName("저장은 결재자 자격을 판정해 자격 없는 사람이 하나라도 있으면 단계 번호만 밝혀 거부하고 아무것도 쓰지 않는다")
    void saveRejectsIneligibleApprovers() {
        lockedOwner();
        given(lineAssistService.checkApprovers(OWNER, List.of("A", "INACTIVE_ONE", "B"))).willReturn(List.of(
                profile("A", null), profile("INACTIVE_ONE", "INACTIVE"), profile("B", null)));

        assertThatThrownBy(() -> service.createSavedLine(OWNER, request("팀장 결재", List.of(
                stage(ApprovalStageKind.APPROVAL, "A"), stage(ApprovalStageKind.AGREEMENT, "INACTIVE_ONE", "B")))))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> {
                    assertThat(((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
                    assertThat(error).hasMessageStartingWith("2단계에 결재자로 지정할 수 없는 사람이 있어 저장하지 않았습니다")
                            .hasMessageNotContaining("INACTIVE_ONE");
                });
        verify(lineRepository, never()).save(any());
        verifyNoInteractions(approverRepository);
    }

    @Test
    @DisplayName("본인을 결재자로 넣은 결재선도 저장하지 않는다(SELF)")
    void saveRejectsSelf() {
        lockedOwner();
        given(lineAssistService.checkApprovers(OWNER, List.of(OWNER))).willReturn(List.of(profile(OWNER, "SELF")));

        assertThatThrownBy(() -> service.createSavedLine(OWNER, request("나", List.of(stage(ApprovalStageKind.APPROVAL, OWNER)))))
                .isInstanceOf(BusinessException.class).hasMessageStartingWith("1단계에 결재자로 지정할 수 없는 사람이");
        verify(lineRepository, never()).save(any());
    }

    @Test
    @DisplayName("한 사람이 20개를 넘게 저장하려 하면 사용자 행을 잠근 뒤 세어 409(C014)로 거부한다")
    void rejectsTwentyFirstLine() {
        lockedOwner();
        eligible("A");
        given(lineRepository.countByUserId(OWNER)).willReturn(20L);

        assertThatThrownBy(() -> service.createSavedLine(OWNER, request("스물한째", List.of(stage(ApprovalStageKind.APPROVAL, "A")))))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> {
                    assertThat(((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
                    assertThat(error).hasMessageContaining("20개까지");
                });
        InOrder order = inOrder(userRepository, lineRepository);
        order.verify(userRepository).findByEsntlIdForUpdate(OWNER);
        order.verify(lineRepository).countByUserId(OWNER);
        verify(lineRepository, never()).save(any());
    }

    @Test
    @DisplayName("같은 이름의 결재선이 있으면 409(C008)로 거부한다 — 이름의 앞뒤 공백은 걷고 비교한다")
    void rejectsDuplicateName() {
        lockedOwner();
        eligible("A");
        given(lineRepository.countByUserId(OWNER)).willReturn(3L);
        given(lineRepository.existsByUserIdAndAplnNm(OWNER, "팀장 결재")).willReturn(true);

        assertThatThrownBy(() -> service.createSavedLine(OWNER, request("  팀장 결재 ", List.of(stage(ApprovalStageKind.APPROVAL, "A")))))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE);
        verify(lineRepository, never()).save(any());
    }

    @Test
    @DisplayName("저장은 단계 순서대로 결재선 행을 쓰고 단계·결재자 수를 돌려준다")
    @SuppressWarnings("unchecked")
    void savesLineInStageOrder() {
        lockedOwner();
        eligible("A", "B", "C");
        given(lineRepository.countByUserId(OWNER)).willReturn(0L);
        given(lineRepository.save(any(ApprovalSavedLine.class))).willAnswer(call -> {
            ApprovalSavedLine saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzIndvAplnSn", 7L);
            return saved;
        });

        ApprovalSavedLineSummaryDto saved = service.createSavedLine(OWNER, request("팀장 결재", List.of(
                stage(ApprovalStageKind.AGREEMENT, "A", "B"), stage(ApprovalStageKind.APPROVAL, "C"))));

        assertThat(saved).extracting(ApprovalSavedLineSummaryDto::savedLineSn, ApprovalSavedLineSummaryDto::aplnNm,
                ApprovalSavedLineSummaryDto::stageCount, ApprovalSavedLineSummaryDto::approverCount)
                .containsExactly(7L, "팀장 결재", 2, 3);
        ArgumentCaptor<List<ApprovalSavedLineApprover>> rows = ArgumentCaptor.forClass(List.class);
        verify(approverRepository).saveAll(rows.capture());
        assertThat(rows.getValue()).extracting(r -> r.getId().getIfmlAtrzIndvAplnSn(), r -> r.getId().getAtrzSeq().intValue(),
                        r -> r.getId().getUserId(), ApprovalSavedLineApprover::kind)
                .containsExactly(tuple(7L, 1, "A", ApprovalStageKind.AGREEMENT), tuple(7L, 1, "B", ApprovalStageKind.AGREEMENT),
                        tuple(7L, 2, "C", ApprovalStageKind.APPROVAL));
    }

    @Test
    @DisplayName("덮어쓰기는 자격을 다시 판정하고, 다른 결재선과 이름이 겹치면 거부하며, 결재선 행을 지운 뒤 다시 넣는다")
    void overwriteRechecksAndReplacesRows() {
        ApprovalSavedLine existing = line(4L, "옛 이름");
        given(lineRepository.findOwnedForUpdate(4L, OWNER)).willReturn(Optional.of(existing));
        eligible("C");
        given(lineRepository.existsByUserIdAndAplnNmAndIfmlAtrzIndvAplnSnNot(OWNER, "새 이름", 4L)).willReturn(false);

        ApprovalSavedLineSummaryDto updated = service.updateSavedLine(OWNER, 4L,
                request("새 이름", List.of(stage(ApprovalStageKind.APPROVAL, "C"))));

        assertThat(updated.aplnNm()).isEqualTo("새 이름");
        assertThat(existing.getAplnNm()).isEqualTo("새 이름");
        InOrder order = inOrder(approverRepository);
        order.verify(approverRepository).deleteForLine(4L);
        order.verify(approverRepository).saveAll(anyList());

        given(lineRepository.existsByUserIdAndAplnNmAndIfmlAtrzIndvAplnSnNot(OWNER, "겹치는 이름", 4L)).willReturn(true);
        assertThatThrownBy(() -> service.updateSavedLine(OWNER, 4L,
                request("겹치는 이름", List.of(stage(ApprovalStageKind.APPROVAL, "C")))))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE);
    }

    @Test
    @DisplayName("덮어쓰기도 자격 없는 사람을 넣으면 거부하고 결재선 행을 건드리지 않는다")
    void overwriteRejectsIneligible() {
        given(lineRepository.findOwnedForUpdate(4L, OWNER)).willReturn(Optional.of(line(4L, "옛 이름")));
        given(lineAssistService.checkApprovers(OWNER, List.of("NOPERM")))
                .willReturn(List.of(profile("NOPERM", "NO_PERMISSION")));

        assertThatThrownBy(() -> service.updateSavedLine(OWNER, 4L,
                request("옛 이름", List.of(stage(ApprovalStageKind.APPROVAL, "NOPERM")))))
                .isInstanceOf(BusinessException.class).hasMessageStartingWith("1단계에 결재자로 지정할 수 없는 사람이");
        verifyNoInteractions(approverRepository);
    }

    @Test
    @DisplayName("지우기는 번호와 주인으로 잠근 내 결재선만 지운다(결재선 행은 FK 가 함께 지운다)")
    void deletesOwnedLine() {
        ApprovalSavedLine existing = line(4L, "옛 이름");
        given(lineRepository.findOwnedForUpdate(4L, OWNER)).willReturn(Optional.of(existing));

        service.deleteSavedLine(OWNER, 4L);

        verify(lineRepository).delete(existing);
    }

    static Stream<List<ApprovalStageRequest>> malformedStages() {
        return Stream.of(
                null,
                List.of(),
                Collections.singletonList(null),
                List.of(stage(ApprovalStageKind.APPROVAL)),
                List.of(new ApprovalStageRequest(null, List.of("A"))),
                List.of(stage(ApprovalStageKind.APPROVAL, "A"), stage(ApprovalStageKind.AGREEMENT, "A")),
                List.of(stage(ApprovalStageKind.APPROVAL, " A")),
                List.of(stage(ApprovalStageKind.APPROVAL, "A".repeat(21))),
                IntStream.range(0, 11).mapToObj(i -> stage(ApprovalStageKind.APPROVAL, "U" + i)).toList(),
                List.of(stage(ApprovalStageKind.APPROVAL, IntStream.range(0, 11).mapToObj(i -> "U" + i).toArray(String[]::new))),
                IntStream.range(0, 6).mapToObj(s -> stage(ApprovalStageKind.APPROVAL,
                        IntStream.range(0, 9).mapToObj(i -> "S" + s + "_" + i).toArray(String[]::new))).toList());
    }

    @ParameterizedTest
    @MethodSource("malformedStages")
    @DisplayName("결재선 형식(1~10단계·단계마다 1~10명·전체 50명·빈 값·중복)이 틀리면 자격을 묻기 전에 거부한다")
    void rejectsMalformedLine(List<ApprovalStageRequest> stages) {
        lockedOwner();

        assertThatThrownBy(() -> service.createSavedLine(OWNER, request("이름", stages)))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(lineAssistService, approverRepository);
        verify(lineRepository, never()).save(any());
    }

    @ParameterizedTest
    @MethodSource("blankOrLongNames")
    @DisplayName("이름이 비었거나 200자를 넘으면 거부한다")
    void rejectsBadName(String name) {
        lockedOwner();

        assertThatThrownBy(() -> service.createSavedLine(OWNER, request(name, List.of(stage(ApprovalStageKind.APPROVAL, "A")))))
                .isInstanceOf(BusinessException.class).hasMessageContaining("200자");
        verifyNoInteractions(lineAssistService);
    }

    static Stream<String> blankOrLongNames() {
        return Stream.of(null, "", "   ", "가".repeat(201));
    }

    @Test
    @DisplayName("요청한 사람 식별자가 비었거나 너무 길면 저장소를 읽지 않는다")
    void rejectsMalformedOwner() {
        assertThatThrownBy(() -> service.getSavedLines(" ")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.getSavedLine("x".repeat(21), 1L)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(lineRepository, approverRepository, lineAssistService);
        verify(userRepository, never()).findByEsntlIdForUpdate(anyString());
        verify(lineRepository, never()).findOwnedForUpdate(anyLong(), anyString());
    }
}
