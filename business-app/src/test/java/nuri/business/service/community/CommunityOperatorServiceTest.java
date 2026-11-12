package nuri.business.service.community;

import com.querydsl.jpa.impl.JPAQueryFactory;
import nuri.business.domain.community.Community;
import nuri.business.domain.community.CommunityMemberStatus;
import nuri.business.domain.community.CommunityRepository;
import nuri.business.domain.community.CommunityUser;
import nuri.business.domain.community.CommunityUserId;
import nuri.business.domain.community.CommunityUserRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.community.dto.CommunityDto;
import nuri.business.service.community.dto.CommunityOperatorRequests;
import nuri.business.support.AuthorizationTestPrincipal;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.template.TemplateAssignmentPolicy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 커뮤니티 운영자(GAP-CMTY-001, DEC-OPS-416) — mngrYn='Y' 는 그 커뮤니티 하나의 관리 권한이다(H3).
 *
 * <p>운영자는 사용 중인 커뮤니티의 승인 회원(P)이면서 운영자 표시가 있어야 하고, 다른 커뮤니티·신청(A)·탈퇴(W)·일반 회원은 403 이다.
 * 신원 축은 esntlId 다(tb_cmnty_user_map.user_id). 운영자를 0명으로 만드는 탈퇴·해제는 관리자만 한다.
 */
@DisplayName("커뮤니티 운영자 범위 인가 계약")
class CommunityOperatorServiceTest {

    private static final long A = 101L;
    private static final long B = 202L;
    private static final String OPERATOR = "ESNTL_OPERATOR";
    private static final String MEMBER = "ESNTL_MEMBER";

    private CommunityRepository communities;
    private CommunityUserRepository memberships;
    private UserRepository users;
    private ApplicationEventPublisher events;
    private CommunityService service;
    /** (커뮤니티, esntlId) → 회원 행. findById·findByIdForUpdate 가 같은 행을 돌려준다. */
    private final Map<CommunityUserId, CommunityUser> rows = new HashMap<>();
    private final Map<Long, Community> communityRows = new HashMap<>();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        communities = mock(CommunityRepository.class);
        memberships = mock(CommunityUserRepository.class);
        users = mock(UserRepository.class);
        events = mock(ApplicationEventPublisher.class);
        ObjectProvider<TemplateAssignmentPolicy> templates = mock(ObjectProvider.class);
        service = new CommunityService(communities, memberships, mock(JPAQueryFactory.class), users, templates, events);
        when(communities.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(communityRows.get(i.<Long>getArgument(0))));
        when(communities.findByIdForUpdate(anyLong())).thenAnswer(i -> Optional.ofNullable(communityRows.get(i.<Long>getArgument(0))));
        when(memberships.findById(any())).thenAnswer(i -> Optional.ofNullable(rows.get(i.<CommunityUserId>getArgument(0))));
        when(memberships.findByIdForUpdate(any())).thenAnswer(i -> Optional.ofNullable(rows.get(i.<CommunityUserId>getArgument(0))));
        when(memberships.countOperators(anyLong())).thenAnswer(i -> rows.values().stream()
                .filter(row -> row.getId().getCmntySn().equals(i.getArgument(0)) && row.isOperator()).count());
        community(A, "Y");
        community(B, "Y");
        member(A, OPERATOR, "P", "Y");
        member(A, MEMBER, "P", "N");
        authenticate(OPERATOR, "ROLE_USER");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void community(long cmntySn, String useYn) {
        Community community = Community.builder().cmntySn(cmntySn).cmntyNm("커뮤니티" + cmntySn).cmntyIntroCn("소개")
                .regSeCd("REGC01").tmpltId("TMPL1").useYn(useYn).build();
        ReflectionTestUtils.setField(community, "version", 3);
        communityRows.put(cmntySn, community);
    }

    private CommunityUser member(long cmntySn, String esntlId, String status, String manager) {
        CommunityUser row = CommunityUser.builder().id(new CommunityUserId(cmntySn, esntlId)).mbrSttsCd(status)
                .mngrYn(manager).joinYmd("20261101").useYn("W".equals(status) ? "N" : "Y").build();
        rows.put(row.getId(), row);
        return row;
    }

    private static void authenticate(String esntlId, String group) {
        SecurityContextHolder.getContext().setAuthentication(
                AuthorizationTestPrincipal.authentication("login-" + esntlId, esntlId, group));
    }

    private static CommonErrorCode code(Runnable call) {
        try {
            call.run();
        } catch (BusinessException e) {
            return (CommonErrorCode) e.getErrorCode();
        }
        throw new AssertionError("BusinessException expected");
    }

    @Test
    @DisplayName("개설자는 그 커뮤니티의 첫 운영자다 — 승인 회원(P)·mngrYn Y·esntlId 로 등록한다")
    void creatorBecomesFirstOperator() {
        authenticate("ESNTL_CREATOR", "ROLE_ADMIN");
        when(communities.save(any(Community.class))).thenAnswer(i -> {
            Community saved = i.getArgument(0);
            ReflectionTestUtils.setField(saved, "cmntySn", 303L);
            return saved;
        });

        service.createCommunity("login-ESNTL_CREATOR", CommunityDto.builder().cmntyNm("새 커뮤니티").build());

        ArgumentCaptor<CommunityUser> saved = ArgumentCaptor.forClass(CommunityUser.class);
        verify(memberships).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo(new CommunityUserId(303L, "ESNTL_CREATOR"));
        assertThat(saved.getValue().isOperator()).isTrue();
        assertThat(saved.getValue().isNew()).as("기존 행을 merge 하지 않고 INSERT 한다").isTrue();
    }

    @Test
    @DisplayName("운영자는 자기 커뮤니티의 가입 신청을 승인·반려한다")
    void operatorDecidesOwnCommunityRequests() {
        CommunityUser applicant = member(A, "ESNTL_APPLICANT", "A", "N");
        service.approveMember(A, "ESNTL_APPLICANT");
        assertThat(applicant.isApproved()).isTrue();

        CommunityUser other = member(A, "ESNTL_OTHER", "A", "N");
        service.rejectMember(A, "ESNTL_OTHER");
        verify(memberships).delete(other);
    }

    @Test
    @DisplayName("🔒 A 커뮤니티의 운영자가 B 커뮤니티를 다루면 403 — 아무것도 바꾸지 않는다")
    void operatorOfAnotherCommunityIsDenied() {
        CommunityUser applicant = member(B, "ESNTL_APPLICANT", "A", "N");
        CommunityUser bMember = member(B, "ESNTL_B_MEMBER", "P", "N");
        CommunityUser bOperator = member(B, "ESNTL_B_OPERATOR", "P", "Y");
        Pageable page = PageRequest.of(0, 20);

        assertThat(code(() -> service.approveMember(B, "ESNTL_APPLICANT"))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.rejectMember(B, "ESNTL_APPLICANT"))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.withdrawMemberAsOperator(B, "ESNTL_B_MEMBER"))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.designateOperator(B, "ESNTL_B_MEMBER", true))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.designateOperator(B, "ESNTL_B_OPERATOR", false))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.getMembersAsOperator(B, null, page))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.updateProfileAsOperator(B, new CommunityOperatorRequests.ProfileRequest("탈취", "소개", 3))))
                .isEqualTo(CommonErrorCode.ACCESS_DENIED);

        assertThat(applicant.isRequested()).isTrue();
        assertThat(bMember.isApproved()).isTrue();
        assertThat(bMember.isOperator()).isFalse();
        assertThat(bOperator.isOperator()).isTrue();
        assertThat(communityRows.get(B).getCmntyNm()).isEqualTo("커뮤니티" + B);
        verify(memberships, never()).delete(any());
    }

    @ParameterizedTest(name = "[{index}] 상태 {0}, 운영자 표시 {1}")
    @CsvSource({"A, Y", "W, Y", "P, N"})
    @DisplayName("🔒 신청(A)·탈퇴(W) 행의 운영자 표시와 일반 회원(P·N)은 운영 권한이 아니다 — 403")
    void nonOperatorRowsAreDenied(String status, String manager) {
        member(A, "ESNTL_ACTOR", status, manager);
        member(A, "ESNTL_APPLICANT", "A", "N");
        authenticate("ESNTL_ACTOR", "ROLE_USER");

        assertThat(code(() -> service.approveMember(A, "ESNTL_APPLICANT"))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.withdrawMemberAsOperator(A, MEMBER))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(code(() -> service.getMembersAsOperator(A, null, PageRequest.of(0, 20)))).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(rows.get(new CommunityUserId(A, "ESNTL_APPLICANT")).isRequested()).isTrue();
    }

    @Test
    @DisplayName("🔒 사용 중지된 커뮤니티의 운영자도 403 — 관리자는 사용 중지된 커뮤니티도 다룬다")
    void inactiveCommunityOperatorIsDenied() {
        community(A, "N");
        member(A, "ESNTL_APPLICANT", "A", "N");
        assertThat(code(() -> service.approveMember(A, "ESNTL_APPLICANT"))).isEqualTo(CommonErrorCode.ACCESS_DENIED);

        authenticate("ESNTL_ADMIN", "ROLE_ADMIN");
        assertThatCode(() -> service.approveMember(A, "ESNTL_APPLICANT")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("운영자의 강제 탈퇴는 일반 회원만 — 운영자(본인 포함)는 먼저 해제해야 하고(409) 신청 행은 400")
    void operatorWithdrawsOnlyGeneralMembers() {
        service.withdrawMemberAsOperator(A, MEMBER);
        assertThat(rows.get(new CommunityUserId(A, MEMBER)).isWithdrawn()).isTrue();

        member(A, "ESNTL_CO_OPERATOR", "P", "Y");
        assertThat(code(() -> service.withdrawMemberAsOperator(A, "ESNTL_CO_OPERATOR"))).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(code(() -> service.withdrawMemberAsOperator(A, OPERATOR))).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(rows.get(new CommunityUserId(A, "ESNTL_CO_OPERATOR")).isOperator()).isTrue();

        member(A, "ESNTL_APPLICANT", "A", "N");
        assertThat(code(() -> service.withdrawMemberAsOperator(A, "ESNTL_APPLICANT"))).isEqualTo(CommonErrorCode.INVALID_STATE);
    }

    @Test
    @DisplayName("🔒 마지막 운영자는 본인 탈퇴·해제를 할 수 없다(409) — 운영자가 둘이면 한 명은 나갈 수 있고, 관리자는 마지막 운영자도 처리한다")
    void lastOperatorCannotLeave() {
        assertThat(code(() -> service.withdrawMember(A, OPERATOR))).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(code(() -> service.designateOperator(A, OPERATOR, false))).isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(rows.get(new CommunityUserId(A, OPERATOR)).isOperator()).isTrue();
        verify(communities, org.mockito.Mockito.atLeastOnce()).findByIdForUpdate(eq(A));

        service.designateOperator(A, MEMBER, true);
        assertThat(rows.get(new CommunityUserId(A, MEMBER)).isOperator()).isTrue();
        service.withdrawMember(A, OPERATOR);
        assertThat(rows.get(new CommunityUserId(A, OPERATOR)).isWithdrawn()).isTrue();
        assertThat(rows.get(new CommunityUserId(A, OPERATOR)).isOperator()).as("탈퇴는 운영자 표시를 지운다").isFalse();

        authenticate("ESNTL_ADMIN", "ROLE_ADMIN");
        service.designateOperator(A, MEMBER, false);
        assertThat(rows.get(new CommunityUserId(A, MEMBER)).isOperator()).isFalse();
    }

    @Test
    @DisplayName("운영자 지정은 승인 회원만 — 신청·탈퇴 행은 400 이고 표시가 바뀌지 않는다")
    void designationNeedsApprovedMember() {
        CommunityUser applicant = member(A, "ESNTL_APPLICANT", "A", "N");
        CommunityUser withdrawn = member(A, "ESNTL_LEFT", "W", "N");
        assertThat(code(() -> service.designateOperator(A, "ESNTL_APPLICANT", true))).isEqualTo(CommonErrorCode.INVALID_STATE);
        assertThat(code(() -> service.designateOperator(A, "ESNTL_LEFT", true))).isEqualTo(CommonErrorCode.INVALID_STATE);
        assertThat(applicant.getMngrYn()).isEqualTo("N");
        assertThat(withdrawn.getMngrYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("운영자의 소개 수정은 이름·소개만 바꾸고 사용 여부·템플릿을 지키며, 읽은 버전이 다르면 409")
    void operatorProfileUpdateKeepsAdminFields() {
        service.updateProfileAsOperator(A, new CommunityOperatorRequests.ProfileRequest("새 이름", "새 소개", 3));
        Community community = communityRows.get(A);
        assertThat(community.getCmntyNm()).isEqualTo("새 이름");
        assertThat(community.getCmntyIntroCn()).isEqualTo("새 소개");
        assertThat(community.getTmpltId()).isEqualTo("TMPL1");
        assertThat(community.getUseYn()).isEqualTo("Y");

        assertThat(code(() -> service.updateProfileAsOperator(A, new CommunityOperatorRequests.ProfileRequest("늦은 저장", "소개", 2))))
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(community.getCmntyNm()).isEqualTo("새 이름");
    }

    @Test
    @DisplayName("운영자 회원 목록은 그 커뮤니티의 회원만 이름과 함께 돌려준다")
    void operatorListsOwnMembers() {
        when(memberships.findByIdCmntySn(eq(A), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(rows.get(new CommunityUserId(A, MEMBER)))));
        var page = service.getMembersAsOperator(A, null, PageRequest.of(0, 20));
        assertThat(page.getContent()).extracting(m -> m.userId()).containsExactly(MEMBER);
        verify(memberships, never()).findByIdCmntySn(eq(B), any(Pageable.class));
    }

    @Test
    @DisplayName("가입 신청은 그 커뮤니티의 운영자에게도 알린다 — 신청자 본인과 이미 알린 권한 보유자는 빼고, 링크는 커뮤니티 상세다")
    void joinRequestNotifiesOperators() {
        when(users.findActiveEsntlIdsHoldingPermission("COMMUNITY_APPROVE")).thenReturn(List.of("ESNTL_ADMIN"));
        when(memberships.findOperatorIds(A)).thenReturn(List.of(OPERATOR, "ESNTL_ADMIN"));

        service.joinCommunity(A, "ESNTL_NEWCOMER");

        ArgumentCaptor<Object> published = ArgumentCaptor.forClass(Object.class);
        verify(events, org.mockito.Mockito.times(2)).publishEvent(published.capture());
        List<NotificationRequestedEvent> notices = published.getAllValues().stream()
                .map(NotificationRequestedEvent.class::cast).toList();
        assertThat(notices).extracting(NotificationRequestedEvent::receiverEsntlId).containsExactly("ESNTL_ADMIN", OPERATOR);
        assertThat(notices.get(1).linkUrl()).isEqualTo("/cop/cmy/selectCommunityDetail/" + A);
        ArgumentCaptor<CommunityUser> request = ArgumentCaptor.forClass(CommunityUser.class);
        verify(memberships).save(request.capture());
        assertThat(request.getValue().getMbrSttsCd()).isEqualTo(CommunityMemberStatus.REQUESTED.code());
        assertThat(request.getValue().isOperator()).as("신청자는 운영자가 아니다").isFalse();
    }
}
