package nuri.business.service.informalsanction;

import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionDetail;
import nuri.business.domain.informalsanction.InformalSanctionDetailId;
import nuri.business.domain.informalsanction.InformalSanctionDetailRepository;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.ApprovalSuggestionsDto;
import nuri.business.service.informalsanction.dto.ApproverProfileDto;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** 기안 화면의 결재선 제안과 결재자 사전 확인 계약. 상신 때 서버가 하는 검사와 같은 판정을 앞당긴다. */
@ExtendWith(MockitoExtension.class)
@DisplayName("결재선 제안·결재자 사전 확인 계약")
class ApprovalLineAssistServiceTest {
    @Mock private InformalSanctionRepository sanctionRepository;
    @Mock private InformalSanctionDetailRepository detailRepository;
    @Mock private UserRepository userRepository;
    @Mock private CommonCodeService commonCodeService;
    @InjectMocks private ApprovalLineAssistService service;
    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        security.when(SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("owner"));
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private static InformalSanction document(long sn, String task, String reqYmd) {
        return InformalSanction.builder().ifmlAtrzSn(sn).aplcntId("owner").aprvrId("a").taskSeCd(task)
                .reqYmd(reqYmd).aprvYn("A").build();
    }

    private static InformalSanctionDetail line(long sn, int order, String userId) {
        return InformalSanctionDetail.create(new InformalSanctionDetailId(sn, BigDecimal.ONE,
                BigDecimal.valueOf(order), userId), order == 1 ? ApprovalStageKind.APPROVAL : ApprovalStageKind.AGREEMENT, false);
    }

    private void users(String... active) {
        List<UserSearchDto> profiles = new ArrayList<>();
        List<User> rows = new ArrayList<>();
        for (String id : active) {
            boolean inactive = id.startsWith("off");
            profiles.add(new UserSearchDto(id, "이름-" + id, "부서", id.equals("b")));
            rows.add(User.builder().esntlId(id).userId(id).userNm("이름-" + id).pswd("{bcrypt}x")
                    .userSttsCd(inactive ? "D" : "P").build());
        }
        lenient().when(userRepository.findProfilesByEsntlIds(any())).thenReturn(profiles);
        lenient().when(userRepository.findAllById(any())).thenReturn(rows);
        lenient().when(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_APPROVE"))
                .thenReturn(Arrays.stream(active).filter(id -> !id.equals("noperm")).toList());
        // [D4] 참조자는 결재 조회 권한으로 판정한다 — noread 만 그 권한이 없다.
        lenient().when(userRepository.findActiveEsntlIdsHoldingPermission("APPROVAL_READ"))
                .thenReturn(Arrays.stream(active).filter(id -> !id.equals("noread")).toList());
    }

    @Test
    @DisplayName("같은 업무 구분에서 가장 자주 쓴 결재선을 먼저, 다른 업무는 업무마다 하나씩 최근 순으로 제안한다")
    void suggestsMostUsedLinePerTask() {
        given(sanctionRepository.findTop40ByAplcntIdOrderByIfmlAtrzSnDesc("owner")).willReturn(List.of(
                document(4, "T1", "20260930"), document(3, "T2", "20260920"),
                document(2, "T1", "20260910"), document(1, "T1", "20260901")));
        given(detailRepository.findForDocuments(any())).willReturn(List.of(
                line(4, 1, "a"), line(3, 1, "c"), line(2, 1, "a"), line(1, 1, "b"), line(1, 2, "a")));
        users("a", "b", "c");
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of(
                new CommonCodeDto("COM075", "T1", "출장", null, "Y"), new CommonCodeDto("COM075", "T2", "교육", null, "Y")));

        ApprovalSuggestionsDto result = service.getSuggestions("owner", "T1");

        assertThat(result.lines()).extracting(l -> l.useCount(), l -> l.lastReqYmd(), l -> l.taskSeNm())
                .containsExactly(tuple(2, "20260930", "출장"), tuple(1, "20260901", "출장"));
        assertThat(result.lines().getFirst().stages()).singleElement()
                .satisfies(stage -> assertThat(stage.approvers()).extracting(ApproverProfileDto::esntlId).containsExactly("a"));
        assertThat(result.otherLines()).singleElement().satisfies(other -> assertThat(other.taskSeCd()).isEqualTo("T2"));
        assertThat(result.recentApprovers()).extracting(ApproverProfileDto::esntlId).containsExactly("a", "c", "b");
        assertThat(result.recentApprovers()).filteredOn(ApproverProfileDto::absent).extracting(ApproverProfileDto::esntlId)
                .containsExactly("b");
    }

    @Test
    @DisplayName("결재한 적이 없으면 빈 제안이고 사용자 저장소를 읽지 않는다")
    void emptyHistoryReturnsEmpty() {
        given(sanctionRepository.findTop40ByAplcntIdOrderByIfmlAtrzSnDesc("owner")).willReturn(List.of());

        ApprovalSuggestionsDto result = service.getSuggestions("owner", null);

        assertThat(result.lines()).isEmpty();
        assertThat(result.recentApprovers()).isEmpty();
        verify(userRepository, never()).findProfilesByEsntlIds(any());
    }

    @Test
    @DisplayName("남의 제안은 읽을 수 없다")
    void suggestionsAreSelfOnly() {
        assertThatThrownBy(() -> service.getSuggestions("someone", null)).isInstanceOf(BusinessException.class);
        verify(sanctionRepository, never()).findTop40ByAplcntIdOrderByIfmlAtrzSnDesc(any());
    }

    @Test
    @DisplayName("사전 확인은 본인·권한 없음·사용 중 아님·없음을 상신 검사와 같은 사유로 알리고 비활성 계정의 이름은 숨긴다")
    void checkReportsSameReasonsAsSubmission() {
        users("a", "owner", "noperm", "off1");

        List<ApproverProfileDto> result = service.checkApprovers("owner", List.of("a", "owner", "noperm", "off1", "ghost", "a"));

        assertThat(result).extracting(ApproverProfileDto::esntlId, ApproverProfileDto::eligible,
                        ApproverProfileDto::ineligibleReason, ApproverProfileDto::userNm)
                .containsExactly(tuple("a", true, null, "이름-a"),
                        tuple("owner", false, "SELF", "이름-owner"),
                        tuple("noperm", false, "NO_PERMISSION", "이름-noperm"),
                        tuple("off1", false, "INACTIVE", null),
                        tuple("ghost", false, "NOT_FOUND", null));
    }

    /**
     * [2026-10-04 D4] 같은 확인 API 가 참조자 판정도 함께 싣는다 — 참조자는 결재 권한이 아니라 결재 조회 권한과 사용 중 여부로
     * 고른다. 결재 권한이 없어도 참조자는 될 수 있고, 조회 권한이 없으면 결재자가 될 수 있어도 참조자는 될 수 없다.
     */
    @Test
    @DisplayName("사전 확인은 참조자 판정(본인·조회 권한 없음·사용 중 아님·없음)을 결재자 판정과 따로 싣는다")
    void checkReportsReferenceEligibilitySeparately() {
        users("a", "owner", "noperm", "noread", "off1");

        List<ApproverProfileDto> result = service.checkApprovers("owner",
                List.of("a", "owner", "noperm", "noread", "off1", "ghost"));

        assertThat(result).extracting(ApproverProfileDto::esntlId, ApproverProfileDto::eligible,
                        ApproverProfileDto::referenceEligible, ApproverProfileDto::referenceIneligibleReason)
                .containsExactly(tuple("a", true, true, null),
                        tuple("owner", false, false, "SELF"),
                        tuple("noperm", false, true, null),
                        tuple("noread", true, false, "NO_READ_PERMISSION"),
                        tuple("off1", false, false, "INACTIVE"),
                        tuple("ghost", false, false, "NOT_FOUND"));
    }

    @Test
    @DisplayName("결재선 제안의 비활성 계정은 이름을 보이되 참조자로도 고를 수 없다")
    void suggestionInactiveProfileIsNotReferenceEligible() {
        given(sanctionRepository.findTop40ByAplcntIdOrderByIfmlAtrzSnDesc("owner")).willReturn(List.of(document(1, "T1", "20260901")));
        given(detailRepository.findForDocuments(any())).willReturn(List.of(line(1, 1, "off1")));
        users("off1");
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of());

        assertThat(service.getSuggestions("owner", null).recentApprovers()).singleElement().satisfies(profile -> {
            assertThat(profile.userNm()).isEqualTo("이름-off1");
            assertThat(profile.referenceEligible()).isFalse();
            assertThat(profile.referenceIneligibleReason()).isEqualTo("INACTIVE");
        });
    }

    @Test
    @DisplayName("사전 확인은 한 번에 50명까지이고 형식이 틀린 식별자는 거부한다")
    void checkRejectsOversizeAndMalformed() {
        assertThatThrownBy(() -> service.checkApprovers("owner", Collections.nCopies(51, "a")))
                .isInstanceOf(BusinessException.class).hasMessageContaining("50명");
        assertThatThrownBy(() -> service.checkApprovers("owner", List.of(" a")))
                .isInstanceOf(BusinessException.class);
        verify(userRepository, never()).findAllById(any());
    }
}
