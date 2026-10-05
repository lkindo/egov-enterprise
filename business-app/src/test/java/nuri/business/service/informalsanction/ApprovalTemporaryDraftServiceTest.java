package nuri.business.service.informalsanction;

import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraft;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftLine;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftLineId;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftLineRepository;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftReference;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftReferenceId;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftReferenceRepository;
import nuri.business.domain.informalsanction.ApprovalTemporaryDraftRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftDto;
import nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest;
import nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftSummaryDto;
import nuri.business.service.informalsanction.dto.ApproverProfileDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
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
import java.util.ArrayList;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 결재 기안 서버 임시저장 계약(2026-10-03 결재 동선 개선 D3, DEC-OPS-219).
 *
 * <p>본인만 다루고(남의 번호는 404), 형식만 보고 저장하며(자격은 다시 열 때 판정), 1인 20건 상한을 사용자 행을 잠근 뒤
 * 세고, 상신은 번호·기안자·버전이 맞는 임시저장을 먼저 지운 뒤 같은 트랜잭션에서 올린다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("결재 기안 임시저장 계약")
class ApprovalTemporaryDraftServiceTest {
    private static final String OWNER = "owner";

    @Mock private ApprovalTemporaryDraftRepository draftRepository;
    @Mock private ApprovalTemporaryDraftLineRepository lineRepository;
    @Mock private ApprovalTemporaryDraftReferenceRepository referenceRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApprovalLineAssistService lineAssistService;
    @Mock private InformalSanctionService informalSanctionService;
    @InjectMocks private ApprovalTemporaryDraftService service;
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

    private static ApprovalTemporaryDraft draft(long sn, String task, String title, String body, int version) {
        ApprovalTemporaryDraft draft = ApprovalTemporaryDraft.create(OWNER, task, title, body);
        ReflectionTestUtils.setField(draft, "ifmlAtrzTmprStrgSn", sn);
        ReflectionTestUtils.setField(draft, "version", version);
        ReflectionTestUtils.setField(draft, "mdfcnDt", LocalDateTime.of(2026, 10, 3, 9, 30));
        return draft;
    }

    private static ApprovalTemporaryDraftLine line(long sn, int seq, String userId, ApprovalStageKind kind) {
        return ApprovalTemporaryDraftLine.create(new ApprovalTemporaryDraftLineId(sn, BigDecimal.valueOf(seq), userId), kind);
    }

    private static ApprovalTemporaryDraftReference reference(long sn, String userId) {
        return ApprovalTemporaryDraftReference.create(new ApprovalTemporaryDraftReferenceId(sn, userId));
    }

    private static ApprovalStageRequest stage(ApprovalStageKind kind, String... approvers) {
        return new ApprovalStageRequest(kind, Arrays.asList(approvers));
    }

    private static ApprovalTemporaryDraftRequest request(String task, String title, String body,
                                                         List<ApprovalStageRequest> stages) {
        return ApprovalTemporaryDraftRequest.builder().taskSeCd(task).docTtl(title).docCn(body).stages(stages).build();
    }

    private static ApprovalTemporaryDraftRequest withReferences(List<ApprovalStageRequest> stages, String... references) {
        return ApprovalTemporaryDraftRequest.builder().docTtl("제목").stages(stages)
                .references(Arrays.asList(references)).build();
    }

    /** 결재자 판정과 참조자 판정을 함께 실은 사전 확인 결과. */
    private static ApproverProfileDto profile(String id, String name, String reason, String referenceReason) {
        boolean known = !"NOT_FOUND".equals(reason) && !"INACTIVE".equals(reason);
        return new ApproverProfileDto(id, known ? name : null, known ? "부서" : null, false, reason == null, reason,
                referenceReason == null, referenceReason);
    }

    private void taskTypes(CommonCodeDto... codes) {
        given(informalSanctionService.getTaskTypes()).willReturn(List.of(codes));
    }

    private void ownerRowExists() {
        given(userRepository.findByEsntlIdForUpdate(OWNER)).willReturn(Optional.of(User.builder().esntlId(OWNER).build()));
    }

    private static BusinessException rejection(Runnable call) {
        try {
            call.run();
        } catch (BusinessException e) {
            return e;
        }
        throw new AssertionError("거부되어야 한다");
    }

    @Test
    @DisplayName("목록은 최근에 고친 순 그대로 싣고, 결재선 사람 수와 업무 구분 이름을 붙인다")
    void listsSummariesWithApproverCountsAndTaskNames() {
        given(draftRepository.findTop20ByAplcntIdOrderByMdfcnDtDescIfmlAtrzTmprStrgSnDesc(OWNER)).willReturn(List.of(
                draft(7, "T1", "출장 신청", "본문", 3), draft(5, "OLD", null, null, 0), draft(4, null, "제목만", null, 1)));
        given(lineRepository.findForDrafts(List.of(7L, 5L, 4L))).willReturn(List.of(
                line(7, 1, "a", ApprovalStageKind.APPROVAL), line(7, 1, "b", ApprovalStageKind.APPROVAL),
                line(7, 2, "c", ApprovalStageKind.AGREEMENT), line(5, 1, "a", ApprovalStageKind.APPROVAL)));
        taskTypes(new CommonCodeDto("COM075", "T1", "출장", null, "Y"),
                new CommonCodeDto("COM075", "T1", "중복 코드는 앞의 이름", null, "Y"),
                new CommonCodeDto("COM075", "T2", null, null, "Y"),
                new CommonCodeDto("COM075", null, "코드 없는 행", null, "Y"));

        List<ApprovalTemporaryDraftSummaryDto> result = service.getTemporaryDrafts(OWNER);

        assertThat(result).extracting(ApprovalTemporaryDraftSummaryDto::temporaryDraftSn,
                        ApprovalTemporaryDraftSummaryDto::taskSeCd, ApprovalTemporaryDraftSummaryDto::taskSeNm,
                        ApprovalTemporaryDraftSummaryDto::docTtl, ApprovalTemporaryDraftSummaryDto::approverCount,
                        ApprovalTemporaryDraftSummaryDto::version)
                .containsExactly(tuple(7L, "T1", "출장", "출장 신청", 3, 3),
                        tuple(5L, "OLD", "", null, 1, 0),
                        tuple(4L, null, "", "제목만", 0, 1));
        assertThat(result.getFirst().mdfcnDt()).isEqualTo(LocalDateTime.of(2026, 10, 3, 9, 30));
    }

    @Test
    @DisplayName("업무 구분 이름이 비어 있는 코드는 빈 이름이다")
    void blankTaskNameIsEmpty() {
        given(draftRepository.findTop20ByAplcntIdOrderByMdfcnDtDescIfmlAtrzTmprStrgSnDesc(OWNER))
                .willReturn(List.of(draft(1, "T2", null, null, 0)));
        given(lineRepository.findForDrafts(List.of(1L))).willReturn(List.of());
        taskTypes(new CommonCodeDto("COM075", "T2", null, null, "Y"));

        assertThat(service.getTemporaryDrafts(OWNER)).singleElement()
                .satisfies(summary -> assertThat(summary.taskSeNm()).isEmpty());
    }

    @Test
    @DisplayName("임시저장이 없으면 빈 목록이고 결재선·업무 구분을 읽지 않는다")
    void emptyListReadsNothingElse() {
        given(draftRepository.findTop20ByAplcntIdOrderByMdfcnDtDescIfmlAtrzTmprStrgSnDesc(OWNER)).willReturn(List.of());

        assertThat(service.getTemporaryDrafts(OWNER)).isEmpty();
        verifyNoInteractions(lineRepository, referenceRepository, informalSanctionService);
    }

    @Test
    @DisplayName("남의 목록·단건은 읽을 수 없다 — 관리자 대리 열람도 없다")
    void readsAreSelfOnly() {
        assertThat(rejection(() -> service.getTemporaryDrafts("someone")).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(rejection(() -> service.getTemporaryDraft("someone", 1L)).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(draftRepository, lineRepository);
    }

    @Test
    @DisplayName("기안자 식별자가 비었거나 20자를 넘으면 입력 오류다(20자는 받는다)")
    void applicantIdentifierShape() {
        for (String applicant : new String[]{null, " ", "x".repeat(21)}) {
            assertThat(rejection(() -> service.getTemporaryDrafts(applicant)).getErrorCode())
                    .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        String longest = "x".repeat(20);
        authenticate(longest);
        given(draftRepository.findTop20ByAplcntIdOrderByMdfcnDtDescIfmlAtrzTmprStrgSnDesc(longest)).willReturn(List.of());

        assertThat(service.getTemporaryDrafts(longest)).isEmpty();
    }

    @Test
    @DisplayName("이어 쓰기는 단계 순서·유형과 사람마다 지금 자격을 싣는다 — 이름은 사전 확인의 공개 수준을 따른다")
    void opensDraftWithCurrentEligibility() {
        given(draftRepository.findByIfmlAtrzTmprStrgSnAndAplcntId(7L, OWNER))
                .willReturn(Optional.of(draft(7, "T1", "출장 신청", "본문", 2)));
        given(lineRepository.findForDrafts(List.of(7L))).willReturn(List.of(
                line(7, 1, "a", ApprovalStageKind.AGREEMENT), line(7, 1, "off", ApprovalStageKind.AGREEMENT),
                line(7, 2, "boss", ApprovalStageKind.APPROVAL)));
        given(lineAssistService.checkApprovers(OWNER, List.of("a", "off", "boss"))).willReturn(List.of(
                new ApproverProfileDto("a", "가", "부서", false, true, null, true, null),
                new ApproverProfileDto("off", null, null, false, false, "INACTIVE", false, "INACTIVE"),
                new ApproverProfileDto("boss", "다", "부서", true, true, null, true, null)));
        taskTypes(new CommonCodeDto("COM075", "T1", "출장", null, "Y"));

        ApprovalTemporaryDraftDto result = service.getTemporaryDraft(OWNER, 7L);

        assertThat(result.temporaryDraftSn()).isEqualTo(7L);
        assertThat(result.taskSeCd()).isEqualTo("T1");
        assertThat(result.taskSeNm()).isEqualTo("출장");
        assertThat(result.docTtl()).isEqualTo("출장 신청");
        assertThat(result.docCn()).isEqualTo("본문");
        assertThat(result.version()).isEqualTo(2);
        assertThat(result.mdfcnDt()).isEqualTo(LocalDateTime.of(2026, 10, 3, 9, 30));
        assertThat(result.stages()).extracting(stage -> stage.kind())
                .containsExactly(ApprovalStageKind.AGREEMENT, ApprovalStageKind.APPROVAL);
        assertThat(result.stages().getFirst().approvers())
                .extracting(ApproverProfileDto::esntlId, ApproverProfileDto::userNm, ApproverProfileDto::ineligibleReason)
                .containsExactly(tuple("a", "가", null), tuple("off", null, "INACTIVE"));
        assertThat(result.stages().get(1).approvers()).extracting(ApproverProfileDto::esntlId).containsExactly("boss");
    }

    @Test
    @DisplayName("결재선 없이 저장한 임시저장도 열리고, 지금 쓰지 않는 업무 구분은 이름이 비어 있다")
    void opensDraftWithoutLine() {
        given(draftRepository.findByIfmlAtrzTmprStrgSnAndAplcntId(3L, OWNER))
                .willReturn(Optional.of(draft(3, "GONE", "제목", null, 0)));
        given(lineRepository.findForDrafts(List.of(3L))).willReturn(List.of());
        given(lineAssistService.checkApprovers(OWNER, List.of())).willReturn(List.of());
        taskTypes();

        ApprovalTemporaryDraftDto result = service.getTemporaryDraft(OWNER, 3L);

        assertThat(result.stages()).isEmpty();
        assertThat(result.taskSeNm()).isEmpty();
    }

    @Test
    @DisplayName("남의 임시저장 번호는 없는 번호와 같이 404 다")
    void othersDraftLooksMissing() {
        given(draftRepository.findByIfmlAtrzTmprStrgSnAndAplcntId(9L, OWNER)).willReturn(Optional.empty());

        assertThat(rejection(() -> service.getTemporaryDraft(OWNER, 9L)).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(lineRepository, lineAssistService);
    }

    @Test
    @DisplayName("저장은 사용자 행을 잠근 뒤 세고, 단계 순서·유형대로 결재선을 남기며 알림·자격 확인을 하지 않는다")
    void createsDraftAfterLockingOwner() {
        ownerRowExists();
        given(draftRepository.countByAplcntId(OWNER)).willReturn(19L);
        given(draftRepository.save(any())).willAnswer(call -> {
            ApprovalTemporaryDraft saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzTmprStrgSn", 11L);
            ReflectionTestUtils.setField(saved, "version", 0);
            return saved;
        });
        taskTypes(new CommonCodeDto("COM075", "T1", "출장", null, "Y"));

        ApprovalTemporaryDraftSummaryDto result = service.createTemporaryDraft(OWNER, request("T1", "  ", "본문",
                List.of(stage(ApprovalStageKind.AGREEMENT, "a", "owner"), stage(ApprovalStageKind.APPROVAL, "boss"))));

        InOrder order = inOrder(userRepository, draftRepository, lineRepository);
        order.verify(userRepository).findByEsntlIdForUpdate(OWNER);
        order.verify(draftRepository).countByAplcntId(OWNER);
        ArgumentCaptor<ApprovalTemporaryDraft> saved = ArgumentCaptor.forClass(ApprovalTemporaryDraft.class);
        order.verify(draftRepository).save(saved.capture());
        assertThat(saved.getValue().getAplcntId()).isEqualTo(OWNER);
        assertThat(saved.getValue().getTaskSeCd()).isEqualTo("T1");
        assertThat(saved.getValue().getDocTtl()).as("공백 제목은 비운다").isNull();
        assertThat(saved.getValue().getDocCn()).isEqualTo("본문");
        assertThat(savedLines(order)).extracting(l -> l.getId().getIfmlAtrzTmprStrgSn(), l -> l.getId().getAtrzSeq(),
                        l -> l.getId().getUserId(), ApprovalTemporaryDraftLine::getAcrdYn)
                .containsExactly(tuple(11L, BigDecimal.ONE, "a", "Y"), tuple(11L, BigDecimal.ONE, "owner", "Y"),
                        tuple(11L, BigDecimal.valueOf(2), "boss", "N"));
        assertThat(result).isEqualTo(new ApprovalTemporaryDraftSummaryDto(11L, "T1", "출장", null, 3, 0, 0, null));
        verifyNoInteractions(lineAssistService);
    }

    private List<ApprovalTemporaryDraftLine> savedLines(InOrder order) {
        ArgumentCaptor<List<ApprovalTemporaryDraftLine>> lines = ArgumentCaptor.captor();
        order.verify(lineRepository).saveAll(lines.capture());
        return lines.getValue();
    }

    @Test
    @DisplayName("한 사람이 20건까지 둔다 — 스무 번째가 있으면 409(C014) 로 거부하고 저장하지 않는다")
    void capsDraftsPerApplicant() {
        ownerRowExists();
        given(draftRepository.countByAplcntId(OWNER)).willReturn(20L);

        BusinessException rejected = rejection(() -> service.createTemporaryDraft(OWNER, request(null, "제목", null, null)));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(rejected.getMessage()).contains("20건");
        verify(draftRepository, never()).save(any());
        verifyNoInteractions(lineRepository);
    }

    @Test
    @DisplayName("저장 전에 기안자 본인인지 보고, 사용자 행이 없으면 저장하지 않는다")
    void createRequiresOwnerAndExistingUser() {
        assertThat(rejection(() -> service.createTemporaryDraft("someone", request(null, "제목", null, null)))
                .getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(userRepository, draftRepository);

        given(userRepository.findByEsntlIdForUpdate(OWNER)).willReturn(Optional.empty());
        assertThat(rejection(() -> service.createTemporaryDraft(OWNER, request(null, "제목", null, null)))
                .getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(draftRepository);
    }

    static Stream<ApprovalTemporaryDraftRequest> onlyOnePartFilled() {
        return Stream.of(request("T1", null, null, null), request(null, "제목", null, null),
                request(null, null, "본문", null), request(null, null, null, List.of(stage(ApprovalStageKind.APPROVAL, "a"))));
    }

    @ParameterizedTest
    @MethodSource("onlyOnePartFilled")
    @DisplayName("업무 구분·제목·본문·결재선 중 하나만 있어도 저장한다")
    void savesWhenAnyPartIsFilled(ApprovalTemporaryDraftRequest request) {
        ownerRowExists();
        given(draftRepository.save(any())).willAnswer(call -> {
            ApprovalTemporaryDraft saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzTmprStrgSn", 2L);
            return saved;
        });
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());

        service.createTemporaryDraft(OWNER, request);

        verify(draftRepository).save(any());
    }

    static Stream<ApprovalTemporaryDraftRequest> nothingToSave() {
        return Stream.of(request(null, null, null, null), request(" ", "  ", "\n", List.of()));
    }

    @ParameterizedTest
    @MethodSource("nothingToSave")
    @DisplayName("저장할 내용이 하나도 없으면(공백만 있어도) 입력 오류다")
    void rejectsEmptyDraft(ApprovalTemporaryDraftRequest request) {
        ownerRowExists();

        BusinessException rejected = rejection(() -> service.createTemporaryDraft(OWNER, request));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(rejected.getMessage()).contains("저장할 내용이 없습니다");
        verify(draftRepository, never()).save(any());
    }

    static Stream<ApprovalTemporaryDraftRequest> oversizedText() {
        return Stream.of(request("x".repeat(13), null, null, null), request(null, "x".repeat(257), null, null),
                request(null, null, "x".repeat(4001), null));
    }

    @ParameterizedTest
    @MethodSource("oversizedText")
    @DisplayName("업무 구분 12자·제목 256자·본문 4000자를 넘으면 입력 오류다")
    void rejectsOversizedText(ApprovalTemporaryDraftRequest request) {
        ownerRowExists();

        assertThat(rejection(() -> service.createTemporaryDraft(OWNER, request)).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verify(draftRepository, never()).save(any());
    }

    @Test
    @DisplayName("길이 경계(12·256·4000자)는 받는다")
    void acceptsTextAtTheLimit() {
        ownerRowExists();
        given(draftRepository.save(any())).willAnswer(call -> call.getArgument(0));
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());

        service.createTemporaryDraft(OWNER, request("x".repeat(12), "y".repeat(256), "z".repeat(4000), null));

        ArgumentCaptor<ApprovalTemporaryDraft> saved = ArgumentCaptor.forClass(ApprovalTemporaryDraft.class);
        verify(draftRepository).save(saved.capture());
        assertThat(saved.getValue().getTaskSeCd()).hasSize(12);
        assertThat(saved.getValue().getDocTtl()).hasSize(256);
        assertThat(saved.getValue().getDocCn()).hasSize(4000);
    }

    static Stream<List<ApprovalStageRequest>> malformedLines() {
        List<ApprovalStageRequest> eleven = IntStream.rangeClosed(1, 11)
                .mapToObj(i -> stage(ApprovalStageKind.APPROVAL, "u" + i)).toList();
        String[] elevenPeople = IntStream.rangeClosed(1, 11).mapToObj(i -> "p" + i).toArray(String[]::new);
        List<ApprovalStageRequest> fiftyOne = new ArrayList<>();
        for (int s = 0; s < 6; s++) {
            int stageNo = s;
            int size = s < 5 ? 10 : 1;
            fiftyOne.add(stage(ApprovalStageKind.APPROVAL,
                    IntStream.range(0, size).mapToObj(i -> "s" + stageNo + "u" + i).toArray(String[]::new)));
        }
        return Stream.of(eleven,
                Collections.singletonList(null),
                List.of(new ApprovalStageRequest(null, List.of("a"))),
                List.of(new ApprovalStageRequest(ApprovalStageKind.APPROVAL, null)),
                List.of(stage(ApprovalStageKind.APPROVAL)),
                List.of(stage(ApprovalStageKind.APPROVAL, elevenPeople)),
                List.of(stage(ApprovalStageKind.APPROVAL, (String) null)),
                List.of(stage(ApprovalStageKind.APPROVAL, " ")),
                List.of(stage(ApprovalStageKind.APPROVAL, "x".repeat(21))),
                List.of(stage(ApprovalStageKind.APPROVAL, " a")),
                List.of(stage(ApprovalStageKind.APPROVAL, "a"), stage(ApprovalStageKind.AGREEMENT, "a")),
                fiftyOne);
    }

    @ParameterizedTest
    @MethodSource("malformedLines")
    @DisplayName("결재선 형식(단계 10개·단계마다 1~10명·빈 식별자·20자·공백·중복·전체 50명)을 어기면 입력 오류다")
    void rejectsMalformedLine(List<ApprovalStageRequest> stages) {
        ownerRowExists();

        assertThat(rejection(() -> service.createTemporaryDraft(OWNER, request(null, "제목", null, stages))).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verify(draftRepository, never()).save(any());
    }

    @Test
    @DisplayName("빈 단계는 저장하지 않는다고 사유로 말한다")
    void emptyStageReasonIsExplicit() {
        ownerRowExists();

        assertThat(rejection(() -> service.createTemporaryDraft(OWNER, request(null, "제목", null,
                List.of(stage(ApprovalStageKind.APPROVAL))))).getMessage()).contains("결재자가 없는 단계는 저장하지 않습니다");
    }

    @Test
    @DisplayName("결재선 형식 경계(10단계·단계마다 10명·20자 식별자·전체 50명)는 받으며 본인·자격 없는 사람도 받는다")
    void acceptsLineAtTheLimits() {
        ownerRowExists();
        given(draftRepository.save(any())).willAnswer(call -> {
            ApprovalTemporaryDraft saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzTmprStrgSn", 1L);
            return saved;
        });
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());
        // 10단계, 첫 단계 10명(20자 식별자·본인·비활성 계정 포함), 둘째~아홉째 4명씩, 마지막 8명 — 전체 정확히 50명.
        List<ApprovalStageRequest> tenStages = new ArrayList<>();
        tenStages.add(stage(ApprovalStageKind.APPROVAL, "x".repeat(20), "owner", "off", "a3", "a4", "a5", "a6", "a7",
                "a8", "a9"));
        for (int s = 2; s <= 9; s++) {
            tenStages.add(stage(ApprovalStageKind.AGREEMENT, "s" + s + "a", "s" + s + "b", "s" + s + "c", "s" + s + "d"));
        }
        tenStages.add(stage(ApprovalStageKind.APPROVAL,
                IntStream.range(0, 8).mapToObj(i -> "z" + i).toArray(String[]::new)));

        ApprovalTemporaryDraftSummaryDto result = service.createTemporaryDraft(OWNER, request(null, null, null, tenStages));

        assertThat(result.approverCount()).isEqualTo(50);
        InOrder order = inOrder(lineRepository);
        assertThat(savedLines(order)).hasSize(50).extracting(l -> l.getId().getAtrzSeq())
                .contains(BigDecimal.ONE, BigDecimal.TEN);
        verifyNoInteractions(lineAssistService);
    }

    @Test
    @DisplayName("다른 곳에서 고친 버전으로는 고칠 수 없다 — 409(C013), 결재선도 그대로다")
    void updateRejectsStaleVersion() {
        given(draftRepository.findOwnedForUpdate(7L, OWNER)).willReturn(Optional.of(draft(7, "T1", "제목", null, 3)));
        ApprovalTemporaryDraftRequest stale = request("T1", "새 제목", null, null);
        stale.setVersion(2);

        BusinessException rejected = rejection(() -> service.updateTemporaryDraft(OWNER, 7L, stale));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        verifyNoInteractions(lineRepository);
        verify(draftRepository, never()).flush();
    }

    @Test
    @DisplayName("고칠 때는 버전이 필수다 — 없으면 잠그기 전에 입력 오류다")
    void updateRequiresVersion() {
        BusinessException rejected = rejection(() -> service.updateTemporaryDraft(OWNER, 7L, request("T1", null, null, null)));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(draftRepository, lineRepository);
    }

    @Test
    @DisplayName("고치기는 내용을 바꾸고 결재선을 지운 뒤 다시 넣으며, 올라간 버전을 돌려준다")
    void updateReplacesContentAndLine() {
        ApprovalTemporaryDraft current = draft(7, "T1", "제목", "본문", 3);
        ReflectionTestUtils.setField(current, "mdfcnDt", null);
        given(draftRepository.findOwnedForUpdate(7L, OWNER)).willReturn(Optional.of(current));
        taskTypes(new CommonCodeDto("COM075", "T2", "교육", null, "Y"));
        ApprovalTemporaryDraftRequest changed = request("T2", "새 제목", " ", List.of(stage(ApprovalStageKind.APPROVAL, "a")));
        changed.setVersion(3);

        ApprovalTemporaryDraftSummaryDto result = service.updateTemporaryDraft(OWNER, 7L, changed);

        assertThat(current.getTaskSeCd()).isEqualTo("T2");
        assertThat(current.getDocTtl()).isEqualTo("새 제목");
        assertThat(current.getDocCn()).as("공백 본문은 비운다").isNull();
        assertThat(current.getMdfcnDt()).as("결재선만 바뀌어도 버전이 오르도록 수정 시각을 고친다").isNotNull();
        InOrder order = inOrder(lineRepository, draftRepository);
        order.verify(lineRepository).deleteForDraft(7L);
        assertThat(savedLines(order)).extracting(l -> l.getId().getUserId(), l -> l.getId().getAtrzSeq())
                .containsExactly(tuple("a", BigDecimal.ONE));
        order.verify(draftRepository).flush();
        assertThat(result.temporaryDraftSn()).isEqualTo(7L);
        assertThat(result.taskSeNm()).isEqualTo("교육");
        assertThat(result.approverCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("남의 임시저장은 고치거나 지울 수 없다 — 본인이 아니면 403, 남의 번호는 404")
    void writesAreOwnerOnly() {
        ApprovalTemporaryDraftRequest body = request("T1", null, null, null);
        body.setVersion(0);
        assertThat(rejection(() -> service.updateTemporaryDraft("someone", 7L, body)).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(rejection(() -> service.deleteTemporaryDraft("someone", 7L)).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(draftRepository);

        given(draftRepository.findOwnedForUpdate(anyLong(), anyString())).willReturn(Optional.empty());
        assertThat(rejection(() -> service.updateTemporaryDraft(OWNER, 8L, body)).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        assertThat(rejection(() -> service.deleteTemporaryDraft(OWNER, 8L)).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(draftRepository, never()).delete(any());
        verifyNoInteractions(lineRepository);
    }

    @Test
    @DisplayName("지우기는 잠근 내 임시저장을 지운다")
    void deletesOwnedDraft() {
        ApprovalTemporaryDraft current = draft(7, "T1", null, null, 0);
        given(draftRepository.findOwnedForUpdate(7L, OWNER)).willReturn(Optional.of(current));

        service.deleteTemporaryDraft(OWNER, 7L);

        verify(draftRepository).delete(current);
    }

    @Test
    @DisplayName("임시저장을 이어 써서 올리면 번호·기안자·버전이 맞는 임시저장을 먼저 지우고 상신한다")
    void submitConsumesDraftBeforeRegistering() {
        InformalSanctionDto dto = InformalSanctionDto.builder().aplcntId(OWNER).taskSeCd("T1").build();
        List<ApprovalStageRequest> stages = List.of(stage(ApprovalStageKind.APPROVAL, "boss"));
        List<String> references = List.of("cc");
        given(draftRepository.deleteOwnedVersion(7L, OWNER, 3)).willReturn(1);
        given(informalSanctionService.registerInformalSanction(dto, stages, references)).willReturn(42L);

        assertThat(service.submitWithTemporaryDraft(dto, stages, references, 7L, 3)).isEqualTo(42L);

        InOrder order = inOrder(draftRepository, informalSanctionService);
        order.verify(draftRepository).deleteOwnedVersion(7L, OWNER, 3);
        // [D4] 참조자는 상신 요청의 것을 상신 검사로 넘긴다 — 임시저장 참조자는 임시저장과 함께 지워진다.
        order.verify(informalSanctionService).registerInformalSanction(dto, stages, references);
    }

    @Test
    @DisplayName("이미 상신했거나 버전이 다른 임시저장으로는 올리지 않는다 — 409(C013)")
    void submitRejectsConsumedOrStaleDraft() {
        InformalSanctionDto dto = InformalSanctionDto.builder().aplcntId(OWNER).taskSeCd("T1").build();
        given(draftRepository.deleteOwnedVersion(7L, OWNER, 3)).willReturn(0);

        BusinessException rejected = rejection(() -> service.submitWithTemporaryDraft(dto, List.of(), null, 7L, 3));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        verifyNoInteractions(informalSanctionService);
    }

    @Test
    @DisplayName("임시저장 번호와 버전은 함께 와야 한다 — 하나만 오면 지우지도 올리지도 않는다")
    void submitRequiresBothDraftReferences() {
        InformalSanctionDto dto = InformalSanctionDto.builder().aplcntId(OWNER).taskSeCd("T1").build();

        assertThat(rejection(() -> service.submitWithTemporaryDraft(dto, List.of(), null, 7L, null)).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(rejection(() -> service.submitWithTemporaryDraft(dto, List.of(), null, null, 3)).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verify(draftRepository, never()).deleteOwnedVersion(any(), any(), any());
        verifyNoInteractions(informalSanctionService);
    }

    @Test
    @DisplayName("임시저장 번호가 1 미만이거나 버전이 음수면 지우지도 상신하지도 않는다 — 컨트롤러는 이 값을 검사하지 않는다")
    void submitRejectsInvalidDraftReferenceValues() {
        InformalSanctionDto dto = InformalSanctionDto.builder().aplcntId(OWNER).taskSeCd("T1").build();

        for (long[] reference : new long[][]{{0L, 1L}, {-3L, 1L}, {7L, -1L}}) {
            assertThat(rejection(() -> service.submitWithTemporaryDraft(dto, List.of(), null, reference[0], (int) reference[1]))
                    .getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        verify(draftRepository, never()).deleteOwnedVersion(any(), any(), any());
        verifyNoInteractions(informalSanctionService);
    }

    @Test
    @DisplayName("남의 이름으로 올리며 임시저장을 지울 수 없다")
    void submitIsSelfOnly() {
        InformalSanctionDto dto = InformalSanctionDto.builder().aplcntId("someone").taskSeCd("T1").build();

        assertThat(rejection(() -> service.submitWithTemporaryDraft(dto, List.of(), null, 7L, 3)).getErrorCode())
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(draftRepository, never()).deleteOwnedVersion(anyLong(), anyString(), anyInt());
        verify(informalSanctionService, never()).registerInformalSanction(any(), anyList(), any());
    }

    // ── [2026-10-04 D4] 임시저장 참조자 ───────────────────────────────────────────────────────────────────────

    /** 저장소가 번호를 매긴 것처럼 — 참조자 행의 기본 키가 임시저장 번호를 요구한다. */
    private static ApprovalTemporaryDraft numbered(ApprovalTemporaryDraft draft) {
        ReflectionTestUtils.setField(draft, "ifmlAtrzTmprStrgSn", 2L);
        return draft;
    }

    private List<ApprovalTemporaryDraftReference> savedReferences(InOrder order) {
        ArgumentCaptor<List<ApprovalTemporaryDraftReference>> references = ArgumentCaptor.captor();
        order.verify(referenceRepository).saveAll(references.capture());
        return references.getValue();
    }

    @Test
    @DisplayName("참조자도 결재선 뒤에 저장하고 목록 줄의 참조자 수로 돌려준다 — 자격 확인·알림은 하지 않는다")
    void createSavesReferencesWithLine() {
        ownerRowExists();
        given(draftRepository.save(any())).willAnswer(call -> {
            ApprovalTemporaryDraft saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzTmprStrgSn", 11L);
            return saved;
        });
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());

        ApprovalTemporaryDraftSummaryDto result = service.createTemporaryDraft(OWNER,
                withReferences(List.of(stage(ApprovalStageKind.APPROVAL, "boss")), "cc2", "cc1", "owner"));

        InOrder order = inOrder(lineRepository, referenceRepository);
        assertThat(savedLines(order)).extracting(l -> l.getId().getUserId()).containsExactly("boss");
        assertThat(savedReferences(order)).extracting(r -> r.getId().getIfmlAtrzTmprStrgSn(), r -> r.getId().getUserId())
                .as("요청 순서대로, 기안자 본인도 형식만 보고 받는다(자격은 다시 열 때·상신 때 판정)")
                .containsExactly(tuple(11L, "cc2"), tuple(11L, "cc1"), tuple(11L, "owner"));
        assertThat(result.referenceCount()).isEqualTo(3);
        assertThat(result.approverCount()).isEqualTo(1);
        verifyNoInteractions(lineAssistService);
    }

    @Test
    @DisplayName("참조자만 있어도 저장할 내용이다")
    void referencesAloneAreWorthSaving() {
        ownerRowExists();
        given(draftRepository.save(any())).willAnswer(call -> numbered(call.getArgument(0)));
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());
        ApprovalTemporaryDraftRequest onlyReferences = ApprovalTemporaryDraftRequest.builder()
                .references(List.of("cc")).build();

        assertThat(service.createTemporaryDraft(OWNER, onlyReferences).referenceCount()).isEqualTo(1);
    }

    static Stream<List<String>> malformedReferences() {
        List<String> twentyOne = IntStream.rangeClosed(1, 21).mapToObj(i -> "r" + i).toList();
        return Stream.of(twentyOne, Collections.singletonList(null), List.of(" "), List.of("x".repeat(21)),
                List.of(" cc"), List.of("cc", "cc"), List.of("boss"));
    }

    @ParameterizedTest
    @MethodSource("malformedReferences")
    @DisplayName("참조자 형식(20명·빈 값·20자·공백·중복·결재선과 겹침)을 어기면 입력 오류다")
    void rejectsMalformedReferences(List<String> references) {
        ownerRowExists();

        assertThat(rejection(() -> service.createTemporaryDraft(OWNER, withReferences(
                List.of(stage(ApprovalStageKind.APPROVAL, "boss")), references.toArray(String[]::new)))).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verify(draftRepository, never()).save(any());
        verifyNoInteractions(referenceRepository);
    }

    @Test
    @DisplayName("결재선과 겹치는 참조자는 사유로 말한다")
    void overlappingReferenceReasonIsExplicit() {
        ownerRowExists();

        assertThat(rejection(() -> service.createTemporaryDraft(OWNER, withReferences(
                List.of(stage(ApprovalStageKind.APPROVAL, "boss")), "boss"))).getMessage())
                .contains("결재선에 있는 사람은 참조자로 저장할 수 없습니다");
    }

    @Test
    @DisplayName("참조자 20명·20자 식별자는 받는다")
    void acceptsReferencesAtTheLimit() {
        ownerRowExists();
        given(draftRepository.save(any())).willAnswer(call -> numbered(call.getArgument(0)));
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());
        String[] twenty = IntStream.range(0, 20).mapToObj(i -> i == 0 ? "y".repeat(20) : "r" + i).toArray(String[]::new);

        assertThat(service.createTemporaryDraft(OWNER, withReferences(null, twenty)).referenceCount()).isEqualTo(20);
    }

    @Test
    @DisplayName("고치기는 참조자도 지운 뒤 다시 넣는다(같은 사람이어도 기본 키가 부딪히지 않게 삭제가 먼저다)")
    void updateReplacesReferences() {
        given(draftRepository.findOwnedForUpdate(7L, OWNER)).willReturn(Optional.of(draft(7, "T1", "제목", null, 3)));
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());
        ApprovalTemporaryDraftRequest changed = withReferences(null, "cc");
        changed.setVersion(3);

        ApprovalTemporaryDraftSummaryDto result = service.updateTemporaryDraft(OWNER, 7L, changed);

        InOrder order = inOrder(referenceRepository, draftRepository);
        order.verify(referenceRepository).deleteForDraft(7L);
        assertThat(savedReferences(order)).extracting(r -> r.getId().getUserId()).containsExactly("cc");
        order.verify(draftRepository).flush();
        assertThat(result.referenceCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("버전이 다르면 참조자도 그대로다")
    void staleUpdateLeavesReferences() {
        given(draftRepository.findOwnedForUpdate(7L, OWNER)).willReturn(Optional.of(draft(7, "T1", "제목", null, 3)));
        ApprovalTemporaryDraftRequest stale = withReferences(null, "cc");
        stale.setVersion(2);

        assertThat(rejection(() -> service.updateTemporaryDraft(OWNER, 7L, stale)).getErrorCode())
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        verifyNoInteractions(referenceRepository);
    }

    @Test
    @DisplayName("목록 줄은 임시저장마다 참조자 수를 센다")
    void listCountsReferences() {
        given(draftRepository.findTop20ByAplcntIdOrderByMdfcnDtDescIfmlAtrzTmprStrgSnDesc(OWNER)).willReturn(List.of(
                draft(7, null, "제목", null, 0), draft(5, null, "다른 제목", null, 0)));
        given(referenceRepository.findForDrafts(List.of(7L, 5L))).willReturn(List.of(
                reference(7, "a"), reference(7, "b"), reference(5, "a")));
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());

        assertThat(service.getTemporaryDrafts(OWNER)).extracting(ApprovalTemporaryDraftSummaryDto::referenceCount)
                .containsExactly(2, 1);
    }

    @Test
    @DisplayName("이어 쓰기는 참조자마다 지금 참조 자격을 사전 확인으로 판정해 싣는다")
    void opensDraftWithReferenceEligibility() {
        given(draftRepository.findByIfmlAtrzTmprStrgSnAndAplcntId(7L, OWNER))
                .willReturn(Optional.of(draft(7, null, "제목", null, 1)));
        given(lineRepository.findForDrafts(List.of(7L))).willReturn(List.of());
        given(lineAssistService.checkApprovers(OWNER, List.of())).willReturn(List.of());
        given(referenceRepository.findForDrafts(List.of(7L))).willReturn(List.of(reference(7, "cc"), reference(7, "gone")));
        given(lineAssistService.checkApprovers(OWNER, List.of("cc", "gone"))).willReturn(List.of(
                profile("cc", "참조", "NO_PERMISSION", null), profile("gone", "x", "NOT_FOUND", "NOT_FOUND")));
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());

        ApprovalTemporaryDraftDto result = service.getTemporaryDraft(OWNER, 7L);

        assertThat(result.references()).extracting(ApproverProfileDto::esntlId, ApproverProfileDto::userNm,
                        ApproverProfileDto::referenceEligible, ApproverProfileDto::referenceIneligibleReason)
                .as("결재 권한이 없어도 참조자는 될 수 있고, 없는 계정은 이름 없이 사유만 싣는다")
                .containsExactly(tuple("cc", "참조", true, null), tuple("gone", null, false, "NOT_FOUND"));
    }

    @Test
    @DisplayName("참조자가 없는 임시저장은 참조 자격을 확인하지 않는다")
    void opensDraftWithoutReferencesSkipsReferenceCheck() {
        given(draftRepository.findByIfmlAtrzTmprStrgSnAndAplcntId(7L, OWNER))
                .willReturn(Optional.of(draft(7, null, "제목", null, 1)));
        given(lineRepository.findForDrafts(List.of(7L))).willReturn(List.of(line(7, 1, "boss", ApprovalStageKind.APPROVAL)));
        given(lineAssistService.checkApprovers(OWNER, List.of("boss"))).willReturn(List.of(profile("boss", "결재", null, null)));
        given(informalSanctionService.getTaskTypes()).willReturn(List.of());

        assertThat(service.getTemporaryDraft(OWNER, 7L).references()).isEmpty();
        verify(lineAssistService, never()).checkApprovers(OWNER, List.of());
    }

    @Test
    @DisplayName("저장한 임시저장은 결재선만 바뀌어도 수정 시각이 바뀐다(엔티티)")
    void reviseAlwaysTouchesModificationTime() {
        ApprovalTemporaryDraft entity = ApprovalTemporaryDraft.create(OWNER, "T1", "제목", "본문");
        assertThat(entity.getMdfcnDt()).isNull();

        entity.revise("T1", "제목", "본문");

        assertThat(entity.getMdfcnDt()).isNotNull();
        assertThatThrownBy(() -> ApprovalTemporaryDraft.create(null, null, null, null))
                .isInstanceOf(NullPointerException.class);
    }
}
