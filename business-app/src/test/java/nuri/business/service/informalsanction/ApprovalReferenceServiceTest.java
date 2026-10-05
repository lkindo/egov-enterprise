package nuri.business.service.informalsanction;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import nuri.business.domain.informalsanction.ApprovalProcessType;
import nuri.business.domain.informalsanction.ApprovalReferenceDesignator;
import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.ApprovalStatus;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionDetailId;
import nuri.business.domain.informalsanction.InformalSanctionDetailRepository;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import nuri.business.domain.informalsanction.InformalSanctionHistoryId;
import nuri.business.domain.informalsanction.InformalSanctionHistoryRepository;
import nuri.business.domain.informalsanction.InformalSanctionProcess;
import nuri.business.domain.informalsanction.InformalSanctionProcessRepository;
import nuri.business.domain.informalsanction.InformalSanctionReference;
import nuri.business.domain.informalsanction.InformalSanctionReferenceRepository;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.ApprovalReferenceDto;
import nuri.business.service.informalsanction.dto.ApprovalStageRequest;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
import nuri.business.service.informalsanction.dto.InformalSanctionMapperImpl;
import nuri.business.service.informalsanction.event.SanctionStatusChangedEvent;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.foundation.core.event.NotificationRequestedEvent;
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
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 결재 참조자 계약(2026-10-04 결재 동선 개선 D4).
 *
 * <p>참조자는 결재하지 않고 읽기만 한다. 한 번 지정되면 그 문서의 모든 상태·모든 차수를 읽고(재상신에서 빠져도), 쓰기 힌트는
 * 하나도 켜지지 않는다. 기안자가 상신·재상신 때 지정하고, 기안자가 그 차수에 아무도 지정하지 않았으면 지금 차례인 결재자가
 * 더한다. 지정은 본인·결재선·사용 중·결재 조회 권한·문서 누적 20명을 보고, 이미 참조자인 사람은 무시한다. 지정되면, 그리고
 * 최종 결과(승인·반려)가 나면 그 차수 참조자에게 알린다 — 다른 알림과 eventId 를 섞지 않는다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("결재 참조자 계약")
class ApprovalReferenceServiceTest {
    @Mock private InformalSanctionRepository informalSanctionRepository;
    @Mock private InformalSanctionDetailRepository detailRepository;
    @Mock private InformalSanctionHistoryRepository historyRepository;
    @Mock private InformalSanctionProcessRepository processRepository;
    @Mock private InformalSanctionReferenceRepository referenceRepository;
    @Mock private CommonCodeService commonCodeService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private UserRepository userRepository;
    @Mock private EntityManager entityManager;
    @Spy private InformalSanctionMapper informalSanctionMapper = new InformalSanctionMapperImpl();
    @InjectMocks private InformalSanctionService service;
    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        actor("owner");
        permissions("APPROVAL_READ", "APPROVAL_APPROVE", "APPROVAL_CANCEL", "APPROVAL_CREATE");
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private void actor(String userId) {
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of(userId));
        // 참조 행의 감사 컬럼은 로그인 ID 다 — esntlId 와 다른 값을 둬야 두 축을 섞으면 드러난다.
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("login-" + userId));
    }

    private void permissions(String... held) {
        Set<String> granted = Set.of(held);
        security.when(() -> SecurityUtil.hasPermission(anyString()))
                .thenAnswer(invocation -> granted.contains(invocation.<String>getArgument(0)));
    }

    private static InformalSanction header(String status, int cycle) {
        InformalSanction document = InformalSanction.builder().ifmlAtrzSn(7L)
                .aplcntId("owner").aprvrId("first").taskSeCd("TASK").reqYmd("20260916")
                .docTtl("원래 제목").docCn("본문 " + cycle).aprvYn(status).atrzCycl(BigDecimal.valueOf(cycle)).build();
        ReflectionTestUtils.setField(document, "version", 3);
        return document;
    }

    private static InformalSanctionHistory history(int cycle, String status) {
        return InformalSanctionHistory.create(header(status, cycle));
    }

    private static InformalSanctionDetail line(int cycle, int order, String userId, ApprovalStatus status) {
        InformalSanctionDetail detail = InformalSanctionDetail.create(new InformalSanctionDetailId(
                7L, BigDecimal.valueOf(cycle), BigDecimal.valueOf(order), userId), ApprovalStageKind.APPROVAL, false);
        ReflectionTestUtils.setField(detail, "aprvYn", status.getCode());
        return detail;
    }

    /** {@code by} 가 {@code cycle} 차수에 {@code userId} 를 참조자로 지정한 행. 기안자는 owner 다. */
    private static InformalSanctionReference reference(int cycle, String userId, String by) {
        return InformalSanctionReference.designate(header("A", cycle), userId, by, "login-" + by,
                LocalDateTime.of(2026, 10, 4, 9, cycle));
    }

    private void references(InformalSanctionReference... rows) {
        given(referenceRepository.findForDocuments(List.of(7L))).willReturn(List.of(rows));
    }

    private void detail(InformalSanction document, String viewer, List<InformalSanctionDetail> lines,
                        List<InformalSanctionHistory> revisions, InformalSanctionReference... rows) {
        given(informalSanctionRepository.findByIdAndParticipant(7L, viewer)).willReturn(Optional.of(document));
        given(detailRepository.findForDocuments(List.of(7L))).willReturn(lines);
        given(historyRepository.findForDocuments(List.of(7L))).willReturn(revisions);
        references(rows);
        lenient().doAnswer(call -> {
            List<UserSearchDto> profiles = new ArrayList<>();
            java.util.Collection<String> ids = call.getArgument(0);
            for (String id : ids) profiles.add(new UserSearchDto(id, "이름-" + id, "부서-" + id, false));
            return profiles;
        }).when(userRepository).findProfilesByEsntlIds(any());
    }

    /** 한 테스트 안에서 다른 보는 사람으로 다시 열 때 읽기 저장소의 기대를 지운다(하나씩 — 제네릭 가변 인자 경고를 피한다). */
    private void resetReads() {
        org.mockito.Mockito.reset(informalSanctionRepository);
        org.mockito.Mockito.reset(detailRepository);
        org.mockito.Mockito.reset(historyRepository);
        org.mockito.Mockito.reset(referenceRepository);
    }

    private InformalSanctionHistory writable(InformalSanction document, List<InformalSanctionDetail> lines) {
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        lenient().when(detailRepository.findRevision(7L, document.getAtrzCycl())).thenReturn(lines);
        InformalSanctionHistory current = InformalSanctionHistory.create(document);
        lenient().when(historyRepository.findById(new InformalSanctionHistoryId(7L, document.getAtrzCycl())))
                .thenReturn(Optional.of(current));
        return current;
    }

    private static User user(String id, String status) {
        return User.builder().esntlId(id).userId(id).userNm("이름-" + id).pswd("{bcrypt}x").userSttsCd(status).build();
    }

    /** 결재자(APPROVAL_APPROVE)와 참조 대상(APPROVAL_READ)이 모두 사용 중이다. noread 는 조회 권한이 없다. */
    private void users(String... ids) {
        lenient().when(userRepository.findAllById(any())).thenAnswer(call -> {
            List<User> found = new ArrayList<>();
            Iterable<String> requested = call.getArgument(0);
            for (String id : requested) {
                if (id.startsWith("ghost")) continue;
                found.add(user(id, id.startsWith("off") ? "D" : "P"));
            }
            return found;
        });
        lenient().when(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).thenReturn(List.of(ids));
        lenient().when(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_READ"))
                .thenReturn(Arrays.stream(ids).filter(id -> !id.startsWith("noread")).toList());
    }

    private void knownTask() {
        given(commonCodeService.getCodesByGroup("COM075"))
                .willReturn(List.of(new CommonCodeDto("COM075", "TASK", "검증 업무", null, "Y")));
    }

    private static InformalSanctionDto draft() {
        return InformalSanctionDto.builder().taskSeCd("TASK").aplcntId("owner")
                .reqYmd("20260917").docTtl("새 제목").docCn("새 본문").build();
    }

    private static List<ApprovalStageRequest> approver(String... users) {
        return List.of(new ApprovalStageRequest(ApprovalStageKind.APPROVAL, List.of(users)));
    }

    private List<NotificationRequestedEvent> notifications() {
        ArgumentCaptor<Object> events = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeast(0)).publishEvent(events.capture());
        return events.getAllValues().stream().filter(NotificationRequestedEvent.class::isInstance)
                .map(NotificationRequestedEvent.class::cast).toList();
    }

    private List<NotificationRequestedEvent> notifications(String title) {
        return notifications().stream().filter(event -> title.equals(event.title())).toList();
    }

    private List<InformalSanctionReference> savedReferences() {
        ArgumentCaptor<List<InformalSanctionReference>> saved = ArgumentCaptor.captor();
        verify(referenceRepository).saveAll(saved.capture());
        return saved.getValue();
    }

    private void registerSaves() {
        given(informalSanctionRepository.save(any(InformalSanction.class))).willAnswer(call -> {
            InformalSanction saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "ifmlAtrzSn", 7L);
            return saved;
        });
    }

    private static BusinessException rejection(Runnable call) {
        try {
            call.run();
        } catch (BusinessException e) {
            return e;
        }
        throw new AssertionError("거부되어야 한다");
    }

    // ── 열람 ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("참조자는 모든 차수와 처리 이력을 읽고 지금 본문·버전을 보지만, 쓰기 힌트는 하나도 켜지지 않는다")
    void referenceReadsEveryRevisionButCannotWrite() {
        InformalSanction document = header("A", 2);
        InformalSanctionProcess revise = InformalSanctionProcess.record(header("A", 1), ApprovalProcessType.REVISE, "owner",
                "login-owner", null, null, "고치기 전 본문", LocalDateTime.of(2026, 10, 1, 9, 0));
        given(processRepository.findForDocuments(List.of(7L))).willReturn(List.of(revise));
        detail(document, "cc", List.of(line(1, 1, "first", ApprovalStatus.REJECTED), line(2, 1, "second", ApprovalStatus.ACTIVE)),
                List.of(history(2, "A"), history(1, "R")), reference(1, "cc", "owner"));
        actor("cc");

        InformalSanctionDto dto = service.getInformalSanction(7L, "cc");

        assertThat(dto.isReferenceViewer()).isTrue();
        assertThat(dto.getAtrzCycl()).as("이전 차수에 지정됐어도 지금 차수를 본다").isEqualTo(2);
        assertThat(dto.getDocCn()).isEqualTo("본문 2");
        assertThat(dto.getVersion()).isEqualTo(3);
        assertThat(dto.getHistory()).extracting(revision -> revision.atrzCycl()).containsExactly(2, 1);
        assertThat(dto.getProcessHistory()).singleElement()
                .satisfies(row -> assertThat(row.content()).isEqualTo("고치기 전 본문"));
        assertThat(dto.getStages()).singleElement()
                .satisfies(stage -> assertThat(stage.approvers().getFirst().userId()).isEqualTo("second"));
        assertThat(List.of(dto.isCanApprove(), dto.isCanWithdraw(), dto.isCanResubmit(), dto.isCanRemind(),
                dto.isCanReplaceApprover(), dto.isCanAnswerSupplement(), dto.isCanRequestSupplement(),
                dto.isCanAddReference())).containsOnly(false);
        assertThat(dto.getReferences()).extracting(ApprovalReferenceDto::userId, ApprovalReferenceDto::userNm,
                        ApprovalReferenceDto::deptNm, ApprovalReferenceDto::atrzCycl, ApprovalReferenceDto::designator)
                .containsExactly(tuple("cc", "이름-cc", "부서-cc", 1, ApprovalReferenceDesignator.DRAFTER));
        assertThat(dto.getReferences().getFirst().designatedAt()).isEqualTo(LocalDateTime.of(2026, 10, 4, 9, 1));
    }

    @Test
    @DisplayName("반려·회수·승인으로 끝난 문서도 참조자는 계속 읽는다")
    void referenceReadsFinishedDocuments() {
        for (String status : new String[]{"R", "W", "C"}) {
            resetReads();
            InformalSanction document = header(status, 1);
            detail(document, "cc", List.of(line(1, 1, "first", ApprovalStatus.CANCELLED)), List.of(history(1, status)),
                    reference(1, "cc", "owner"));
            actor("cc");

            InformalSanctionDto dto = service.getInformalSanction(7L, "cc");

            assertThat(dto.getAprvYn()).isEqualTo(status);
            assertThat(dto.isReferenceViewer()).isTrue();
            assertThat(dto.isCanResubmit()).as("기안자 힌트는 참조자에게 켜지지 않는다").isFalse();
        }
    }

    /**
     * [개정 1] 숨은 참조가 아니다 — 보는 사람은 자기가 볼 수 있는 가장 높은 차수까지 지정된 참조자를 사람마다 한 줄(그 사람에게
     * 보이는 가장 최근 지정)로 본다. 종전 계약(지정 차수가 보는 사람의 차수 안에 있어야 보인다)은 차수 2 결재자에게 차수 2 를 함께
     * 읽는 차수 1 참조자를 숨겼다 — 그 숨김을 고정하던 단언을 이 규칙으로 바꿨다.
     */
    @Test
    @DisplayName("참조자 목록은 보는 사람이 볼 수 있는 가장 높은 차수까지 지정된 사람을 사람마다 한 줄로 싣는다 — 이전 차수 결재자는 뒤에 처음 지정된 참조자를 보지 않는다")
    void referenceListShowsEveryoneUpToTheViewersLatestCycle() {
        InformalSanction document = header("A", 2);
        InformalSanctionReference early = reference(1, "cc1", "owner");
        InformalSanctionReference late = reference(2, "cc2", "second");
        InformalSanctionReference again = reference(2, "cc1", "owner");
        List<InformalSanctionDetail> lines = List.of(line(1, 1, "first", ApprovalStatus.REJECTED),
                line(2, 1, "second", ApprovalStatus.ACTIVE));
        List<InformalSanctionHistory> revisions = List.of(history(2, "A"), history(1, "R"));

        detail(document, "first", lines, revisions, early, late, again);
        actor("first");
        assertThat(service.getInformalSanction(7L, "first").getReferences())
                .extracting(ApprovalReferenceDto::userId, ApprovalReferenceDto::atrzCycl)
                .as("차수 1 만 보는 사람에게 cc1 은 차수 1 지정으로 보이고, 차수 2 에 처음 지정된 cc2 는 보이지 않는다")
                .containsExactly(tuple("cc1", 1));

        for (String viewer : new String[]{"second", "owner", "cc2"}) {
            resetReads();
            detail(document, viewer, lines, revisions, early, late, again);
            actor(viewer);
            assertThat(service.getInformalSanction(7L, viewer).getReferences())
                    .extracting(ApprovalReferenceDto::userId, ApprovalReferenceDto::atrzCycl, ApprovalReferenceDto::designator)
                    .as(viewer + " — 차수 1 에 지정된 사람도 보이고, 다시 지정된 사람은 가장 최근 지정 한 줄이다(처음 지정된 순서)")
                    .containsExactly(tuple("cc1", 2, ApprovalReferenceDesignator.DRAFTER),
                            tuple("cc2", 2, ApprovalReferenceDesignator.APPROVER));
        }
    }

    @Test
    @DisplayName("참조자가 없으면 참조자 이름을 조회하지 않는다")
    void detailWithoutReferencesSkipsProfiles() {
        InformalSanction document = header("A", 1);
        given(informalSanctionRepository.findByIdAndParticipant(7L, "owner")).willReturn(Optional.of(document));
        given(detailRepository.findForDocuments(List.of(7L))).willReturn(List.of());
        given(historyRepository.findForDocuments(List.of(7L))).willReturn(List.of(history(1, "A")));

        InformalSanctionDto dto = service.getInformalSanction(7L, "owner");

        assertThat(dto.getReferences()).isEmpty();
        assertThat(dto.isReferenceViewer()).isFalse();
        verify(userRepository, never()).findProfilesByEsntlIds(any());
    }

    @Test
    @DisplayName("참조된 결재 목록은 참조자에게도 404 가 아니다 — 지금 차수를 싣고, 참조자 목록은 상세에만 싣는다")
    void referencedListRendersForPureReference() {
        InformalSanction document = header("A", 2);
        Pageable page = PageRequest.of(0, 20);
        given(informalSanctionRepository.findReferenced("cc", "%제목%", "20260901", "20260930", "A", page))
                .willReturn(new PageImpl<>(List.of(document), page, 1));
        given(detailRepository.findVisibleForDocuments(List.of(7L), "cc"))
                .willReturn(List.of(line(2, 1, "second", ApprovalStatus.ACTIVE)));
        given(historyRepository.findVisibleForDocuments(List.of(7L), "cc")).willReturn(List.of(history(2, "A")));
        references(reference(1, "cc", "owner"));
        actor("cc");

        var result = service.getReferencedApprovalList("cc", ApprovalListFilter.of("제목", "20260901", "20260930", "A"), page);

        assertThat(result.getContent()).singleElement().satisfies(dto -> {
            assertThat(dto.getAtrzCycl()).isEqualTo(2);
            assertThat(dto.isReferenceViewer()).isTrue();
            assertThat(dto.getReferences()).isEmpty();
            assertThat(dto.isCanApprove()).isFalse();
            assertThat(dto.isCanAddReference()).isFalse();
        });
        // 목록은 참조자 이름을 조회하지 않는다(결재선 부재 표시만 조회한다).
        verify(userRepository, never()).findProfilesByEsntlIds(org.mockito.ArgumentMatchers.argThat(
                ids -> ids != null && ids.contains("cc")));
    }

    @Test
    @DisplayName("참조된 결재 목록은 본인 것만 — 남의 목록은 403")
    void referencedListIsSelfOnly() {
        assertThat(rejection(() -> service.getReferencedApprovalList("someone", ApprovalListFilter.NONE,
                PageRequest.of(0, 20))).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verify(informalSanctionRepository, never()).findReferenced(any(), any(), any(), any(), any(), any());
    }

    // ── 결재자 추가 힌트 ───────────────────────────────────────────────────────────────────────────────

    private InformalSanctionDto hintFor(String viewer, ApprovalStatus viewerStatus, InformalSanctionReference... rows) {
        InformalSanction document = header("A", 2);
        detail(document, viewer, List.of(line(2, 1, viewer, viewerStatus)), List.of(history(2, "A"), history(1, "R")), rows);
        actor(viewer);
        return service.getInformalSanction(7L, viewer);
    }

    @Test
    @DisplayName("지금 차례인 결재자는 기안자가 이 차수에 아무도 지정하지 않았을 때만 참조자를 더할 수 있다")
    void canAddReferenceOnlyWhenDrafterDesignatedNoneThisCycle() {
        assertThat(hintFor("second", ApprovalStatus.ACTIVE).isCanAddReference()).isTrue();
        assertThat(hintFor("second", ApprovalStatus.ACTIVE, reference(1, "cc", "owner")).isCanAddReference())
                .as("기안자가 이전 차수에만 지정했으면 이 차수에는 더할 수 있다").isTrue();
        assertThat(hintFor("second", ApprovalStatus.ACTIVE, reference(2, "cc", "peer")).isCanAddReference())
                .as("다른 결재자가 더한 것은 막지 않는다").isTrue();
        assertThat(hintFor("second", ApprovalStatus.ACTIVE, reference(2, "cc", "owner")).isCanAddReference())
                .as("기안자가 이 차수에 지정했으면 더할 수 없다").isFalse();
        assertThat(hintFor("second", ApprovalStatus.WAITING).isCanAddReference()).as("차례가 아니다").isFalse();
        InformalSanctionReference[] twenty = IntStream.range(0, 20)
                .mapToObj(i -> reference(1, "r" + i, "peer")).toArray(InformalSanctionReference[]::new);
        assertThat(hintFor("second", ApprovalStatus.ACTIVE, twenty).isCanAddReference())
                .as("20명이 찼어도 이전 차수에만 지정된 사람은 이 차수에 다시 지정할 수 있다 — 쓰기 검사와 같은 판정").isTrue();
        InformalSanctionReference[] twentyThisCycle = IntStream.range(0, 20)
                .mapToObj(i -> reference(2, "r" + i, "peer")).toArray(InformalSanctionReference[]::new);
        assertThat(hintFor("second", ApprovalStatus.ACTIVE, twentyThisCycle).isCanAddReference())
                .as("20명이 모두 이 차수에 이미 있으면 더 지정할 사람이 없다").isFalse();
        assertThat(hintFor("second", ApprovalStatus.ACTIVE,
                Arrays.copyOf(twenty, 19)).isCanAddReference()).as("19명이면 더할 수 있다").isTrue();
        InformalSanctionReference[] nineteenPeopleTwentyRows = Arrays.copyOf(twenty, 20);
        nineteenPeopleTwentyRows[19] = reference(2, "r0", "peer");
        assertThat(hintFor("second", ApprovalStatus.ACTIVE, nineteenPeopleTwentyRows).isCanAddReference())
                .as("20명은 행 수가 아니라 서로 다른 사람 수다 — 다시 지정된 사람은 자리를 더 차지하지 않는다").isTrue();
        permissions("APPROVAL_READ");
        assertThat(hintFor("second", ApprovalStatus.ACTIVE).isCanAddReference()).as("결재 권한을 회수했다").isFalse();
    }

    // ── 기안자 지정 ────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("상신 때 지정한 참조자는 차수 1·기안자 지정으로 결재 이력 뒤에 남고, 결재 순서 알림과 다른 eventId 로 알린다")
    void registerDesignatesReferencesAfterRevision() {
        knownTask();
        users("boss", "cc1", "cc2");
        registerSaves();

        service.registerInformalSanction(draft(), approver("boss"), List.of("cc2", "cc1"));

        InOrder order = inOrder(historyRepository, detailRepository, referenceRepository);
        order.verify(historyRepository).saveAndFlush(any());
        order.verify(detailRepository).saveAll(any());
        order.verify(referenceRepository).saveAll(any());
        assertThat(savedReferences()).extracting(r -> r.getId().getIfmlAtrzSn(), r -> r.getId().getUserId(),
                        InformalSanctionReference::getAtrzCycl, InformalSanctionReference::getChgUserIdntfr,
                        InformalSanctionReference::getFrstRgtrId)
                .containsExactly(tuple(7L, "cc2", BigDecimal.ONE, "owner", "login-owner"),
                        tuple(7L, "cc1", BigDecimal.ONE, "owner", "login-owner"));
        List<NotificationRequestedEvent> designated = notifications("참조로 지정되었습니다");
        assertThat(designated).extracting(NotificationRequestedEvent::receiverEsntlId).containsExactly("cc1", "cc2");
        assertThat(designated).extracting(NotificationRequestedEvent::linkUrl).containsOnly("/approvals?tab=REFERENCED&doc=7");
        assertThat(designated.getFirst().content()).startsWith("「새 제목」 결재(번호 7)");
        NotificationRequestedEvent turn = notifications("결재 순서 도래").getFirst();
        assertThat(designated).extracting(NotificationRequestedEvent::eventId).doesNotContain(turn.eventId())
                .containsOnly(designated.getFirst().eventId());
    }

    @Test
    @DisplayName("참조자 없이 올리면 참조 행도, 참조 자격 조회도 없다")
    void registerWithoutReferencesTouchesNothing() {
        knownTask();
        users("boss");
        registerSaves();

        service.registerInformalSanction(draft(), approver("boss"), List.of());
        service.registerInformalSanction(draft(), approver("boss"));

        verify(referenceRepository, never()).saveAll(any());
        verify(userRepository, never()).findActiveEsntlIdsHoldingPermission("APPROVAL_READ");
        assertThat(notifications("참조로 지정되었습니다")).isEmpty();
    }

    static Stream<Object[]> invalidDesignations() {
        List<String> twentyOne = IntStream.rangeClosed(1, 21).mapToObj(i -> "r" + i).toList();
        return Stream.of(
                new Object[]{twentyOne, "한 번에 20명까지"},
                new Object[]{Collections.singletonList(null), "참조자를 지정해 주세요"},
                new Object[]{List.of(" "), "참조자를 지정해 주세요"},
                new Object[]{List.of("x".repeat(21)), "참조자를 지정해 주세요"},
                new Object[]{List.of(" cc"), "참조자를 지정해 주세요"},
                new Object[]{List.of("cc", "cc"), "같은 참조자를 중복 지정할 수 없습니다"},
                new Object[]{List.of("owner"), "기안자 본인은 참조자로 지정할 수 없습니다"},
                new Object[]{List.of("boss"), "결재선에 있는 사람은 참조자로 지정할 수 없습니다"},
                new Object[]{List.of("cc", "off1"), "사용 중이 아닌 계정은 참조자로 지정할 수 없습니다: 이름-off1"},
                new Object[]{List.of("cc", "ghost1"), "참조자로 지정할 수 없는 사용자입니다."},
                new Object[]{List.of("noread1", "cc", "noread2"),
                        "결재 조회 권한이 없는 사용자는 참조자로 지정할 수 없습니다: 이름-noread1, 이름-noread2"});
    }

    @ParameterizedTest
    @MethodSource("invalidDesignations")
    @DisplayName("기안자 지정은 형식·중복·본인·결재선·사용 중·결재 조회 권한을 보고, 무엇이 문제인지 400 으로 말한다")
    void designationRejectsWithReason(List<String> references, String reason) {
        knownTask();
        users("boss", "cc", "off1", "noread1", "noread2");

        BusinessException rejected = rejection(() -> service.registerInformalSanction(draft(), approver("boss"), references));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(rejected.getMessage()).contains(reason);
        assertThat(rejected.getMessage()).as("없는 식별자는 되돌려 주지 않는다").doesNotContain("ghost1");
        verify(informalSanctionRepository, never()).save(any());
        verify(referenceRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("조회 권한이 없는 사람의 이름이 비어 있으면 '이름 없는 사용자' 로 말한다")
    void unreadableWithoutNameIsNamedGenerically() {
        knownTask();
        given(userRepository.findAllById(any())).willAnswer(call -> {
            List<User> found = new ArrayList<>();
            Iterable<String> requested = call.getArgument(0);
            for (String id : requested) {
                User row = user(id, "P");
                if (id.equals("blank")) ReflectionTestUtils.setField(row, "userNm", " ");
                found.add(row);
            }
            return found;
        });
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).willReturn(List.of("boss"));
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_READ")).willReturn(List.of("boss"));

        assertThat(rejection(() -> service.registerInformalSanction(draft(), approver("boss"), List.of("blank")))
                .getMessage()).endsWith(": 이름 없는 사용자");
    }

    @Test
    @DisplayName("결재 권한이 없어도 조회 권한이 있으면 참조자가 될 수 있고, 20명·20자 식별자는 받는다")
    void designationAcceptsReadersAtTheLimit() {
        knownTask();
        String longest = "y".repeat(20);
        List<String> twenty = new ArrayList<>(IntStream.range(1, 20).mapToObj(i -> "r" + i).toList());
        twenty.add(longest);
        given(userRepository.findAllById(any())).willAnswer(call -> {
            List<User> found = new ArrayList<>();
            Iterable<String> requested = call.getArgument(0);
            for (String id : requested) found.add(user(id, "P"));
            return found;
        });
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE")).willReturn(List.of("boss"));
        given(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_READ")).willReturn(
                Stream.concat(Stream.of("boss"), twenty.stream()).toList());
        registerSaves();

        service.registerInformalSanction(draft(), approver("boss"), twenty);

        assertThat(savedReferences()).hasSize(20);
    }

    // ── 재상신 ─────────────────────────────────────────────────────────────────────────────────────────

    private void resubmittable(String status) {
        InformalSanction document = header(status, 1);
        given(informalSanctionRepository.findByIdForUpdate(7L)).willReturn(Optional.of(document));
        lenient().when(historyRepository.findById(new InformalSanctionHistoryId(7L, BigDecimal.ONE)))
                .thenReturn(Optional.of(InformalSanctionHistory.create(document)));
        knownTask();
    }

    /**
     * [개정 1] 지정은 차수 단위다. 종전 계약(재상신에서 이미 참조자인 사람은 무시 — 행·알림·자격 검사 모두 없음)을 바꿨다: 이전
     * 차수 참조자를 다시 보내면 새 차수의 행이 생겨 그 차수의 참조자가 되고, 지정 알림은 이 문서에 처음 참조되는 사람에게만 간다.
     */
    @Test
    @DisplayName("재상신에서 다시 보낸 이전 차수 참조자는 새 차수의 지정이 되고(행 생김), 지정 알림은 처음 참조되는 사람에게만 간다")
    void resubmitRedesignatesPreviousReferencesForTheNewCycle() {
        resubmittable("R");
        references(reference(1, "cc1", "owner"));
        users("boss", "cc1", "cc2");

        service.resubmitInformalSanction(7L, draft(), 3, approver("boss"), List.of("cc1", "cc2"));

        assertThat(savedReferences()).extracting(r -> r.getId().getUserId(), InformalSanctionReference::getAtrzCycl,
                        InformalSanctionReference::getChgUserIdntfr)
                .containsExactly(tuple("cc1", BigDecimal.valueOf(2), "owner"), tuple("cc2", BigDecimal.valueOf(2), "owner"));
        assertThat(notifications("참조로 지정되었습니다")).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("cc2");
    }

    @Test
    @DisplayName("재상신에서 이전 차수 참조자만 다시 보내도 새 차수의 행은 생기지만 지정 알림은 없다")
    void resubmitWithOnlyPreviousReferencesNotifiesNobody() {
        resubmittable("W");
        references(reference(1, "cc1", "owner"));
        users("boss", "cc1");

        service.resubmitInformalSanction(7L, draft(), 3, approver("boss"), List.of("cc1"));

        assertThat(savedReferences()).extracting(r -> r.getId().getUserId(), InformalSanctionReference::getAtrzCycl)
                .containsExactly(tuple("cc1", BigDecimal.valueOf(2)));
        assertThat(notifications("참조로 지정되었습니다")).isEmpty();
    }

    @Test
    @DisplayName("다시 지정하는 이전 차수 참조자도 지금 자격을 본다 — 그사이 사용 중지되면 이름을 밝혀 거부한다")
    void redesignationChecksCurrentEligibility() {
        resubmittable("R");
        references(reference(1, "off1", "owner"));
        users("boss", "off1");

        BusinessException rejected = rejection(() -> service.resubmitInformalSanction(7L, draft(), 3, approver("boss"),
                List.of("off1")));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(rejected.getMessage()).isEqualTo("사용 중이 아닌 계정은 참조자로 지정할 수 없습니다: 이름-off1");
        verify(referenceRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("이전 차수 참조자는 다음 차수의 결재자가 될 수 있다 — 겸직 금지는 같은 차수 기준이다")
    void previousReferenceMayApproveTheNextCycle() {
        resubmittable("R");
        references(reference(1, "cc1", "owner"));
        users("cc1");

        service.resubmitInformalSanction(7L, draft(), 3, approver("cc1"), List.of());

        verify(detailRepository).saveAll(any());
        verify(referenceRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("참조자는 문서 누적 20명이다 — 빠진 사람도 자리를 차지하고, 넘으면 지금 몇 명인지 말한다")
    void cumulativeCapCountsEveryReference() {
        resubmittable("R");
        references(IntStream.range(0, 19).mapToObj(i -> reference(1, "r" + i, "owner"))
                .toArray(InformalSanctionReference[]::new));
        users("boss", "new1", "new2");

        BusinessException rejected = rejection(() -> service.resubmitInformalSanction(7L, draft(), 3, approver("boss"),
                List.of("new1", "new2")));

        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(rejected.getMessage()).contains("20명까지").contains("지금 19명");
        verify(historyRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("누적 20명은 서로 다른 사람 수다 — 20명이 찬 문서도 이전 차수 참조자는 새 차수에 다시 지정할 수 있다")
    void cumulativeCapCountsPeopleNotRows() {
        resubmittable("R");
        references(IntStream.range(0, 20).mapToObj(i -> reference(1, "r" + i, "owner"))
                .toArray(InformalSanctionReference[]::new));
        users("boss", "r0");

        service.resubmitInformalSanction(7L, draft(), 3, approver("boss"), List.of("r0"));

        assertThat(savedReferences()).extracting(r -> r.getId().getUserId(), InformalSanctionReference::getAtrzCycl)
                .containsExactly(tuple("r0", BigDecimal.valueOf(2)));
    }

    @Test
    @DisplayName("누적 20명 경계 — 19명에 한 명은 받는다")
    void cumulativeCapAcceptsTheTwentieth() {
        resubmittable("R");
        references(IntStream.range(0, 19).mapToObj(i -> reference(1, "r" + i, "owner"))
                .toArray(InformalSanctionReference[]::new));
        users("boss", "new1");

        service.resubmitInformalSanction(7L, draft(), 3, approver("boss"), List.of("new1"));

        assertThat(savedReferences()).extracting(r -> r.getId().getUserId()).containsExactly("new1");
    }

    @Test
    @DisplayName("재상신의 새 결재선과 겹치는 참조자는 거부한다(이전 차수 참조자라도)")
    void resubmitRejectsOverlapWithNewLine() {
        resubmittable("R");
        users("cc1");

        assertThat(rejection(() -> service.resubmitInformalSanction(7L, draft(), 3, approver("cc1"), List.of("cc1")))
                .getMessage()).contains("결재선에 있는 사람");
    }

    // ── 최종 결과 알림 ──────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("최종 승인은 이 차수 참조자에게만 알린다 — 다시 지정된 이전 차수 참조자는 받고, 이 차수에 없는 참조자·기안자·결재선 사람은 빼며, 결과 알림과 다른 eventId 다")
    void finalApprovalNotifiesCurrentCycleReferences() {
        InformalSanction document = header("A", 2);
        writable(document, List.of(line(2, 1, "boss", ApprovalStatus.ACTIVE)));
        references(reference(1, "old", "owner"), reference(1, "again", "owner"), reference(2, "cc", "owner"),
                reference(2, "again", "owner"), reference(2, "boss", "owner"), reference(2, "owner", "peer"));
        users("cc", "again");
        actor("boss");

        service.confirmInformalSanction(7L, "C", "좋습니다", 3);

        List<NotificationRequestedEvent> results = notifications("결재가 완료되었습니다");
        assertThat(results).extracting(NotificationRequestedEvent::receiverEsntlId).containsExactly("again", "cc");
        assertThat(results.getFirst().linkUrl()).isEqualTo("/approvals?tab=REFERENCED&doc=7");
        assertThat(results.getFirst().content()).isEqualTo("「원래 제목」 결재(번호 7)가 최종 승인되었습니다. 참조로 받은 문서입니다.");
        ArgumentCaptor<Object> events = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeast(1)).publishEvent(events.capture());
        SanctionStatusChangedEvent applicantResult = events.getAllValues().stream()
                .filter(SanctionStatusChangedEvent.class::isInstance).map(SanctionStatusChangedEvent.class::cast)
                .findFirst().orElseThrow();
        assertThat(results.getFirst().eventId()).isNotEqualTo(applicantResult.getEventId());
    }

    @Test
    @DisplayName("반려도 이 차수 참조자에게 알리되 반려 사유는 싣지 않는다 — 다른 결재자에게 가는 알림과 eventId 를 섞지 않는다")
    void rejectionNotifiesCurrentCycleReferencesWithoutReason() {
        InformalSanction document = header("A", 1);
        writable(document, List.of(line(1, 1, "boss", ApprovalStatus.ACTIVE), line(1, 1, "peer", ApprovalStatus.ACTIVE)));
        references(reference(1, "cc", "owner"));
        users("cc");
        actor("boss");

        service.confirmInformalSanction(7L, "R", "사유".repeat(1500), 3);

        List<NotificationRequestedEvent> results = notifications("결재가 반려되었습니다");
        NotificationRequestedEvent toReference = results.stream().filter(e -> e.receiverEsntlId().equals("cc"))
                .findFirst().orElseThrow();
        NotificationRequestedEvent toPeer = results.stream().filter(e -> e.receiverEsntlId().equals("peer"))
                .findFirst().orElseThrow();
        assertThat(toReference.content()).isEqualTo("「원래 제목」 결재(번호 7)가 반려되었습니다. 참조로 받은 문서입니다.");
        assertThat(toReference.linkUrl()).isEqualTo("/approvals?tab=REFERENCED&doc=7");
        assertThat(toReference.eventId()).isNotEqualTo(toPeer.eventId());
    }

    /**
     * [개정 1] 참조 행은 사용자 삭제 뒤에도 남지만 알림 행은 사용자 FK 가 있고 업무 트랜잭션 안에서 저장된다 — 지워진 참조자에게
     * 보내면 승인·반려 전체가 되돌아간다. 실제로 있는 사용자에게만 보낸다(PostgreSQL 통합 시험이 FK 로 같은 경로를 본다).
     */
    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"C", "R"})
    @DisplayName("지워진 참조자에게는 최종 결과 알림을 보내지 않는다 — 남은 참조자는 받고 결재는 끝난다")
    void finalResultSkipsDeletedReferences(String decision) {
        InformalSanction document = header("A", 2);
        InformalSanctionHistory current = writable(document, List.of(line(2, 1, "boss", ApprovalStatus.ACTIVE)));
        references(reference(2, "cc", "owner"), reference(2, "ghostcc", "owner"));
        users("cc");
        actor("boss");

        service.confirmInformalSanction(7L, decision, "의견", 3);

        assertThat(document.getAprvYn()).isEqualTo(decision);
        assertThat(current.getAprvYn()).isEqualTo(decision);
        assertThat(notifications()).extracting(NotificationRequestedEvent::receiverEsntlId)
                .contains("cc").doesNotContain("ghostcc");
    }

    @Test
    @DisplayName("이 차수의 참조자가 모두 지워졌으면 최종 결과 알림은 하나도 없고 결재는 끝난다")
    void finalResultWithOnlyDeletedReferencesNotifiesNobody() {
        InformalSanction document = header("A", 1);
        writable(document, List.of(line(1, 1, "boss", ApprovalStatus.ACTIVE)));
        references(reference(1, "ghostcc", "owner"));
        users();
        actor("boss");

        service.confirmInformalSanction(7L, "C", null, 3);

        assertThat(document.getAprvYn()).isEqualTo("C");
        assertThat(notifications("결재가 완료되었습니다")).isEmpty();
    }

    @Test
    @DisplayName("중간 단계 승인과 회수는 참조자에게 알리지 않는다")
    void intermediateApprovalAndWithdrawalDoNotNotifyReferences() {
        InformalSanction document = header("A", 1);
        writable(document, List.of(line(1, 1, "boss", ApprovalStatus.ACTIVE), line(1, 2, "next", ApprovalStatus.WAITING)));
        lenient().when(referenceRepository.findForDocuments(List.of(7L))).thenReturn(List.of(reference(1, "cc", "owner")));
        actor("boss");

        service.confirmInformalSanction(7L, "C", null, 3);
        actor("owner");
        service.deleteInformalSanction(7L, 3);

        assertThat(notifications()).extracting(NotificationRequestedEvent::receiverEsntlId).doesNotContain("cc");
    }

    // ── 결재자 교체 ────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("이 차수의 참조자를 결재자로 바꿔 넣을 수 없다 — 이전 차수 참조자는 넣을 수 있다")
    void replaceRejectsCurrentCycleReference() {
        InformalSanction document = header("A", 2);
        writable(document, List.of(line(2, 1, "first", ApprovalStatus.ACTIVE)));
        references(reference(2, "cc", "owner"), reference(1, "old", "owner"));
        users("old");

        BusinessException rejected = rejection(() -> service.replaceApprover(7L, "first", "cc", 3));
        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(rejected.getMessage()).contains("이 차수의 참조자는 결재자로 바꿀 수 없습니다");
        verify(detailRepository, never()).delete(any());

        service.replaceApprover(7L, "first", "old", 3);
        verify(detailRepository).delete(any());
    }

    // ── 결재자 추가 ────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("지금 차례인 결재자가 더한 참조자는 결재자 지정으로 지금 차수에 남고, 알림과 문서 버전 증가가 따른다")
    void approverAddsReferences() {
        InformalSanction document = header("A", 2);
        writable(document, List.of(line(2, 1, "boss", ApprovalStatus.ACTIVE), line(2, 2, "next", ApprovalStatus.WAITING)));
        references(reference(1, "old", "owner"));
        users("cc1", "cc2", "old");
        actor("boss");

        // [개정 1] 이전 차수에만 있던 old 도 지금 차수의 지정이 된다(행은 생기고 지정 알림은 처음 참조되는 사람에게만 간다).
        assertThat(service.addReferences(7L, List.of("cc1", "old", "cc2"), 3)).isEqualTo(3);

        assertThat(savedReferences()).extracting(r -> r.getId().getUserId(), InformalSanctionReference::getAtrzCycl,
                        InformalSanctionReference::getChgUserIdntfr, InformalSanctionReference::getFrstRgtrId)
                .containsExactly(tuple("cc1", BigDecimal.valueOf(2), "boss", "login-boss"),
                        tuple("old", BigDecimal.valueOf(2), "boss", "login-boss"),
                        tuple("cc2", BigDecimal.valueOf(2), "boss", "login-boss"));
        assertThat(notifications("참조로 지정되었습니다")).extracting(NotificationRequestedEvent::receiverEsntlId)
                .containsExactly("cc1", "cc2");
        verify(entityManager).lock(document, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
        verify(processRepository, never()).save(any());
    }

    @Test
    @DisplayName("모두 이미 참조자면 아무것도 바꾸지 않고 0 을 돌려준다")
    void approverAddingExistingReferencesChangesNothing() {
        InformalSanction document = header("A", 1);
        writable(document, List.of(line(1, 1, "boss", ApprovalStatus.ACTIVE)));
        references(reference(1, "cc", "peer"));
        actor("boss");

        assertThat(service.addReferences(7L, List.of("cc"), 3)).isZero();

        verify(referenceRepository, never()).saveAll(any());
        verify(entityManager, never()).lock(any(), any());
        assertThat(notifications()).isEmpty();
    }

    /**
     * [개정 1] 차례 판정은 결재 처리와 같다 — 결재선에 없거나 아직 차례가 아니면 403, 이미 처리한 사람은 409(DEC-OPS-187 의 충돌
     * 문구). 종전 계약은 이미 처리한 사람도 403 으로 묶었다 — 다른 탭에서 승인한 뒤 누르면 권한 오류처럼 보였으므로 바꿨다.
     */
    @Test
    @DisplayName("결재선에 없는 사람·아직 차례가 아닌 사람은 403, 이미 처리한 사람은 결재 처리와 같은 문구의 409 다")
    void onlyTheCurrentApproverMayAdd() {
        InformalSanction document = header("A", 1);
        writable(document, List.of(line(1, 1, "done", ApprovalStatus.APPROVED), line(1, 2, "boss", ApprovalStatus.ACTIVE),
                line(1, 3, "later", ApprovalStatus.WAITING)));
        given(processRepository.findForDocuments(List.of(7L))).willReturn(List.of());

        for (String actor : new String[]{"stranger", "later", "owner"}) {
            actor(actor);
            BusinessException rejected = rejection(() -> service.addReferences(7L, List.of("cc"), 3));
            assertThat(rejected.getErrorCode()).as(actor).isEqualTo(CommonErrorCode.ACCESS_DENIED);
            assertThat(rejected.getMessage()).isEqualTo("지금 차례인 결재자만 참조자를 더할 수 있습니다.");
        }
        actor("done");
        BusinessException processed = rejection(() -> service.addReferences(7L, List.of("cc"), 3));
        assertThat(processed.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(processed.getMessage()).isEqualTo("이미 처리한 결재입니다. 최신 상태를 확인해 주세요.");
        verify(referenceRepository, never()).findForDocuments(any());
        verify(referenceRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("결재선에서 빠진 결재자는 사유를 밝힌 409 다")
    void replacedOutApproverGetsConflict() {
        InformalSanction document = header("A", 1);
        writable(document, List.of(line(1, 1, "fourth", ApprovalStatus.ACTIVE)));
        given(processRepository.findForDocuments(List.of(7L))).willReturn(List.of(InformalSanctionProcess.record(document,
                ApprovalProcessType.REPLACE, "owner", "login-owner", "fourth", "first", null, LocalDateTime.now())));
        actor("first");

        assertThat(rejection(() -> service.addReferences(7L, List.of("cc"), 3)).getErrorCode())
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
    }

    @Test
    @DisplayName("기안자가 이 차수에 참조자를 지정했으면 409 로 사유를 말한다 — 이전 차수 지정은 막지 않는다")
    void drafterDesignationBlocksApproverThisCycleOnly() {
        InformalSanction document = header("A", 2);
        writable(document, List.of(line(2, 1, "boss", ApprovalStatus.ACTIVE)));
        references(reference(2, "cc", "owner"));
        actor("boss");

        BusinessException rejected = rejection(() -> service.addReferences(7L, List.of("other"), 3));
        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(rejected.getMessage()).isEqualTo("기안자가 참조자를 지정한 결재는 결재자가 참조자를 더할 수 없습니다.");

        org.mockito.Mockito.reset(referenceRepository);
        references(reference(1, "cc", "owner"));
        users("other");
        assertThat(service.addReferences(7L, List.of("other"), 3)).isEqualTo(1);
    }

    @Test
    @DisplayName("끝난 문서에는 더할 수 없고(409), 버전은 필수이며(400) 다르면 409 다")
    void addRequiresProgressAndVersion() {
        InformalSanction finished = header("C", 1);
        writable(finished, List.of(line(1, 1, "boss", ApprovalStatus.APPROVED)));
        actor("boss");
        BusinessException notInProgress = rejection(() -> service.addReferences(7L, List.of("cc"), 3));
        assertThat(notInProgress.getErrorCode()).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        // 끝난 문서라는 사유를 말한다 — 이미 처리한 결재(라인 상태)의 409 와 문구로 구분된다.
        assertThat(notInProgress.getMessage())
                .isEqualTo("이미 승인이 끝난 결재입니다. 참조자 추가할 수 없습니다. 최신 상태를 확인해 주세요.");

        org.mockito.Mockito.reset(informalSanctionRepository);
        org.mockito.Mockito.reset(detailRepository);
        writable(header("A", 1), List.of(line(1, 1, "boss", ApprovalStatus.ACTIVE)));
        BusinessException missingVersion = rejection(() -> service.addReferences(7L, List.of("cc"), null));
        assertThat(missingVersion.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(missingVersion.getMessage()).as("되돌릴 수 없으므로 버전 없이 사람을 보기 전에 거부한다")
                .isEqualTo("상세에서 받은 문서 버전을 함께 보내 주세요.");
        verify(referenceRepository, never()).findForDocuments(any());
        assertThat(rejection(() -> service.addReferences(7L, List.of("cc"), 2)).getErrorCode())
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        verify(referenceRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("결재자 추가도 기안자·지금 결재선 사람·조회 권한 없는 사람은 400 으로 거부한다")
    void approverAddUsesTheSameChecks() {
        InformalSanction document = header("A", 1);
        writable(document, List.of(line(1, 1, "boss", ApprovalStatus.ACTIVE), line(1, 2, "next", ApprovalStatus.WAITING)));
        lenient().when(referenceRepository.findForDocuments(List.of(7L))).thenReturn(List.of());
        users("noread1");
        actor("boss");

        assertThat(rejection(() -> service.addReferences(7L, List.of("owner"), 3)).getMessage()).contains("기안자 본인");
        assertThat(rejection(() -> service.addReferences(7L, List.of("next"), 3)).getMessage()).contains("결재선에 있는 사람");
        assertThat(rejection(() -> service.addReferences(7L, List.of("boss"), 3)).getMessage()).contains("결재선에 있는 사람");
        assertThat(rejection(() -> service.addReferences(7L, List.of("noread1"), 3)).getMessage()).contains("결재 조회 권한");
        verify(referenceRepository, never()).saveAll(any());
    }

    // ── 엔티티 ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("참조 행은 늘 새 행이고, 지정한 사람과 지정 차수로 기안자 지정·이 차수 지정을 가른다")
    void referenceEntityShape() {
        InformalSanctionReference row = reference(2, "cc", "owner");

        assertThat(row.isNew()).isTrue();
        assertThat(row.designatedBy("owner")).isTrue();
        assertThat(row.designatedBy("boss")).isFalse();
        assertThat(row.designatedIn(new BigDecimal("2"))).isTrue();
        assertThat(row.designatedIn(BigDecimal.ONE)).isFalse();
        assertThat(row.getAtrzCycl()).isEqualTo(BigDecimal.valueOf(2));
        assertThat(row.getId()).as("지정은 차수 단위다 — 같은 사람도 차수가 다르면 다른 행이다")
                .isNotEqualTo(reference(1, "cc", "owner").getId())
                .isEqualTo(reference(2, "cc", "boss").getId());
        assertThat(ApprovalReferenceDesignator.of(row, "owner")).isEqualTo(ApprovalReferenceDesignator.DRAFTER);
        assertThat(ApprovalReferenceDesignator.of(row, "someone")).isEqualTo(ApprovalReferenceDesignator.APPROVER);
        assertThatThrownBy(() -> InformalSanctionReference.designate(header("A", 1), "cc", null, "login", LocalDateTime.now()))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> InformalSanctionReference.designate(header("A", 1), "cc", "owner", null, LocalDateTime.now()))
                .isInstanceOf(NullPointerException.class);
    }
}
