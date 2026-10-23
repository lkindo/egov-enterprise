package nuri.business.service.file;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** Actual reference SQL plus the same community membership port used by board reads. */
class BoardAttachmentReachabilityTest {
    private JdbcTemplate jdbc;
    private SingleConnectionDataSource source;
    private CommunityBoardAccessPort membership;
    private JdbcAttachmentReferenceResolver resolver;

    @BeforeEach
    void createDatabase() {
        source=new SingleConnectionDataSource("jdbc:h2:mem:board-file-"+java.util.UUID.randomUUID(),"sa","",true);
        jdbc=new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE tb_bbs_master(bbs_id VARCHAR(20) PRIMARY KEY,cmnty_sn BIGINT,use_yn CHAR(1) DEFAULT 'Y' NOT NULL)");
        jdbc.execute("CREATE TABLE tb_bbs_item(bbs_id VARCHAR(20),atch_file_sn BIGINT,frst_rgtr_id VARCHAR(20),user_id VARCHAR(20),scrt_yn CHAR(1),use_yn CHAR(1) DEFAULT 'Y',pst_bgng_ymd VARCHAR(8),pst_end_ymd VARCHAR(8))");
        jdbc.update("INSERT INTO tb_bbs_master(bbs_id,cmnty_sn) VALUES('COMMUNITY',7),('PUBLIC',NULL)");
        membership=mock(CommunityBoardAccessPort.class);
        resolver=new JdbcAttachmentReferenceResolver(jdbc,List.of(() -> List.of(AttachmentSource.BOARD)),membership);
        // [2026-10-23 ADR-0040 결정 3] 서울 2026-10-23 00:30 으로 고정한다(시계의 시간대는 UTC).
        resolver.useClock(FIXED);
    }

    private static final java.time.Clock FIXED =
            java.time.Clock.fixed(java.time.Instant.parse("2026-10-22T15:30:00Z"), java.time.ZoneOffset.UTC);
    private static final String TODAY = "20261023";
    private static final String YESTERDAY = "20261022";
    private static final String TOMORROW = "20261024";

    @AfterEach
    void closeDatabase() { source.destroy(); org.springframework.security.core.context.SecurityContextHolder.clearContext(); }

    private void post(String board,String secret) {
        jdbc.update("INSERT INTO tb_bbs_item(bbs_id,atch_file_sn,frst_rgtr_id,user_id,scrt_yn) VALUES(?,101,'writer-login','writer-esntl',?)",board,secret);
    }

    @Test
    void unapprovedCommunityMemberCannotReadNonSecretAttachment() {
        post("COMMUNITY","N");
        var denied=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(denied.sharedGrant()).isFalse(); assertThat(denied.ownerGrant()).isFalse();
        assertThat(denied.resolutionFailed()).isFalse();
        verify(membership).isApprovedMember(7L,"reader-esntl");
    }

    @Test
    void approvedMembershipIsCheckedAgainAfterRevocation() {
        post("COMMUNITY","N");
        when(membership.isApprovedMember(7L,"reader-esntl")).thenReturn(true).thenReturn(false);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isFalse();
    }

    @Test
    void postOwnershipDoesNotBypassTheCommunityGate() {
        post("COMMUNITY","Y");
        assertThat(resolver.resolve(101L,"writer-login","writer-esntl").ownerGrant()).isFalse();
        when(membership.isApprovedMember(7L,"writer-esntl")).thenReturn(true);
        var owner=resolver.resolve(101L,"writer-login","writer-esntl");
        assertThat(owner.ownerGrant()).isTrue(); assertThat(owner.sharedGrant()).isFalse();
    }

    @Test
    void secretPostIsNotSharedEvenWithApprovedMembership() {
        post("COMMUNITY","Y");
        when(membership.isApprovedMember(7L,"reader-esntl")).thenReturn(true);
        var denied=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(denied.sharedGrant()).isFalse(); assertThat(denied.ownerGrant()).isFalse();
    }

    @Test
    void publicBoardPreservesBothOwnerIdentityAxesWithoutSwappingThem() {
        post("PUBLIC","Y");
        assertThat(resolver.resolve(101L,"writer-login",null).ownerGrant()).isTrue();
        assertThat(resolver.resolve(101L,null,"writer-esntl").ownerGrant()).isTrue();
        assertThat(resolver.resolve(101L,"writer-esntl","writer-login").ownerGrant()).isFalse();
        verifyNoInteractions(membership);
    }

    @Test
    void optionalCommunityPackAbsenceAndDatabaseFailureDoNotCreateGrants() {
        post("COMMUNITY","N");
        var coreOnly=new JdbcAttachmentReferenceResolver(jdbc,List.of(() -> List.of(AttachmentSource.BOARD)));
        assertThat(coreOnly.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isFalse();
        when(membership.isApprovedMember(7L,"reader-esntl")).thenThrow(new org.springframework.dao.QueryTimeoutException("unavailable"));
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").resolutionFailed()).isTrue();
    }

    @Test
    void ordinaryPublicPostStillCreatesSharedReachability() {
        post("PUBLIC","N");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
    }

    /** [DIP S7, GAP-DOMAIN-001 ②] 논리 삭제된 공개 글의 첨부는 번호를 알아도 공유 근거가 되지 않는다. */
    @Test
    void logicallyDeletedPostOrBoardNoLongerSharesItsAttachment() {
        post("PUBLIC","N");
        jdbc.update("UPDATE tb_bbs_item SET use_yn='N'");
        var deletedPost=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(deletedPost.sharedGrant()).isFalse();
        assertThat(deletedPost.resolutionFailed()).isFalse();
        // 작성자는 자기 첨부를 계속 받는다 — 소유 근거는 사용 여부와 무관하다.
        assertThat(resolver.resolve(101L,"writer-login","writer-esntl").ownerGrant()).isTrue();

        // 조회 대행 권한도 글의 논리 삭제는 면제하지 않는다(그 관리자 경로는 FILE_READ_ALL 이다).
        authenticateWith("BOARD_READ_ALL");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isFalse();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();

        jdbc.update("UPDATE tb_bbs_item SET use_yn='Y'");
        jdbc.update("UPDATE tb_bbs_master SET use_yn='N' WHERE bbs_id='PUBLIC'");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isFalse();
        // [2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판은 조회 대행 권한자에게 공유 근거가 된다 — 본문을 그 사람에게 여는 것과 같다.
        authenticateWith("BOARD_READ_ALL");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();

        jdbc.update("UPDATE tb_bbs_master SET use_yn='Y' WHERE bbs_id='PUBLIC'");
        jdbc.update("UPDATE tb_bbs_item SET use_yn=NULL");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isFalse();
    }

    /**
     * [2026-10-23 ADR-0040 A0] 게시 종료일이 지난 글의 첨부는 승인 회원에게도 공유 근거가 아니다. 작성자는 자기 첨부를 계속 받고,
     * 조회 대행 권한(BOARD_READ_ALL)은 본문처럼 기간만 면제받는다. 종료일 당일과 빈 값은 게시 중이다.
     */
    @Test
    void endedPostSharesOnlyWithReadAllWhileTheOwnerKeepsItsGrant() {
        String today = TODAY;
        String yesterday = YESTERDAY;
        post("COMMUNITY","N");
        when(membership.isApprovedMember(7L,"reader-esntl")).thenReturn(true);
        when(membership.isApprovedMember(7L,"writer-esntl")).thenReturn(true);

        jdbc.update("UPDATE tb_bbs_item SET pst_end_ymd=?", yesterday);
        var ended=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(ended.sharedGrant()).isFalse();
        assertThat(ended.resolutionFailed()).isFalse();
        assertThat(resolver.resolve(101L,"writer-login","writer-esntl").ownerGrant()).isTrue();
        authenticateWith("BOARD_READ_ALL");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();

        jdbc.update("UPDATE tb_bbs_item SET pst_end_ymd=?", today);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        jdbc.update("UPDATE tb_bbs_item SET pst_end_ymd=''");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
    }

    /**
     * [2026-10-23 ADR-0040 결정 3] 게시 시작일 전인 예약 글의 첨부는 승인 회원에게도 공유 근거가 아니다. 작성자는 소유 근거로 자기
     * 첨부를 받고(본문과 같다), 조회 대행 권한(BOARD_READ_ALL)은 본문처럼 기간을 면제받는다. 시작일 당일·빈 값은 게시 중이다.
     * 종료일 조건과 따로 둔 절이라, 종료일이 열려 있어도 시작 전이면 닫힌다.
     */
    @Test
    void scheduledPostSharesOnlyWithReadAllWhileTheOwnerKeepsItsGrant() {
        post("COMMUNITY","N");
        when(membership.isApprovedMember(7L,"reader-esntl")).thenReturn(true);
        when(membership.isApprovedMember(7L,"writer-esntl")).thenReturn(true);

        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=?, pst_end_ymd=NULL", TOMORROW);
        var scheduled=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(scheduled.sharedGrant()).isFalse();
        assertThat(scheduled.resolutionFailed()).isFalse();
        assertThat(resolver.resolve(101L,"writer-login","writer-esntl").ownerGrant()).isTrue();
        authenticateWith("BOARD_READ_ALL");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();

        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=?", TODAY);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=''");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
    }

    private static void authenticateWith(String permission) {
        var principal=nuri.foundation.security.service.CustomUserDetails.builder().userId("reader-login").esntlId("reader-esntl")
                .userNm("reader").groups(List.of("ROLE_USER")).permissions(List.of(permission))
                .authorizationVersion(nuri.business.security.authorization.PermissionCodes.CATALOG_VERSION)
                .enabled(true).lockAt("N").build();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }
}
