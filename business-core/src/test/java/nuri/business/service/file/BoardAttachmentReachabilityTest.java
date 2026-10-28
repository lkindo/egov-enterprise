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

/**
 * Actual reference SQL plus the same community membership port used by board reads.
 *
 * <p>조회 대행 권한(BOARD_READ_ALL)에 기대는 논리 삭제·게시 종료·예약 글 단언은 게시판 소유 권한이라 게시판과 함께 빠지는
 * business-app 의 {@code BoardAttachmentReadAllReachabilityTest} 로 옮겼다(T2 2026-10-23~, DEC-OPS-257 ①). 이 클래스는 권한 원장을
 * 보지 않는 단언만 둬 모든 생성물에서 그대로 돈다. 그 가운데 권한 없이 보는 게시 기간·사용 여부 경계는 business-core PIT 가 resolver 의
 * 비교 변이를 잡도록 여기에도 둔다(app 시험은 core PIT 에서 돌지 않는다).
 */
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

    /**
     * [2026-10-23 ADR-0040 A0·결정 3] 게시 기간의 날짜 경계를 권한 없는 사용자로 본다. 종료일이 지난 글과 시작일 전인 예약 글은
     * 공유 근거가 아니고, 종료일·시작일 당일과 빈 값·NULL 은 게시 중이다. 두 절은 따로라 한쪽이 열려 있어도 다른 쪽이 닫으면 닫힌다.
     * 작성자의 소유 근거는 기간과 무관하다.
     *
     * <p>[왜 core 에 두는가] 조회 대행 권한의 면제는 게시판 소유 권한이라 business-app 의
     * {@code BoardAttachmentReadAllReachabilityTest} 가 본다. 그러나 날짜 비교는 이 모듈의 resolver 에 있고 business-core PIT
     * (CI {@code business-core-file} 범위)는 app 시험을 돌리지 않는다. 그래서 권한 원장을 보지 않는 경계 단언을 여기에도 둬 그
     * 범위가 당일 비교 변이를 잡게 하고, 모든 생성물에서도 그대로 돈다.
     */
    @Test
    void postingWindowDateBoundariesDecideSharingWithoutAnyPermission() {
        post("PUBLIC","N");

        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=NULL, pst_end_ymd=?", YESTERDAY);
        var ended=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(ended.sharedGrant()).as("종료일이 어제인 글").isFalse();
        assertThat(ended.resolutionFailed()).isFalse();
        assertThat(resolver.resolve(101L,"writer-login","writer-esntl").ownerGrant()).as("작성자는 종료 글의 첨부도 받는다").isTrue();
        assertShared("종료일 당일은 게시 중", null, TODAY, true);
        assertShared("종료일이 내일", null, TOMORROW, true);
        assertShared("빈 종료일", null, "", true);
        assertShared("NULL 종료일", null, null, true);

        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=?, pst_end_ymd=NULL", TOMORROW);
        var scheduled=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(scheduled.sharedGrant()).as("시작일이 내일인 예약 글").isFalse();
        assertThat(scheduled.resolutionFailed()).isFalse();
        assertThat(resolver.resolve(101L,"writer-login","writer-esntl").ownerGrant()).as("작성자는 예약 글의 첨부도 받는다").isTrue();
        assertShared("시작일 당일은 게시 중", TODAY, null, true);
        assertShared("시작일이 어제", YESTERDAY, null, true);
        assertShared("빈 시작일", "", null, true);

        assertShared("종료일이 열려 있어도 시작 전이면 닫힌다", TOMORROW, TOMORROW, false);
        assertShared("시작했어도 종료일이 지나면 닫힌다", YESTERDAY, YESTERDAY, false);
        assertShared("시작일·종료일이 모두 당일이면 게시 중", TODAY, TODAY, true);
    }

    /**
     * [DIP S7, GAP-DOMAIN-001 ②·ADR-0040 결정 1] 논리 삭제 글과 사용 안 함 게시판을 권한 없는 사용자로 본다. 삭제 글(N·NULL)의 첨부는
     * 공유 근거가 아니고 작성자 소유 근거는 남는다. 사용 안 함 게시판은 공유와 작성자 소유 근거를 모두 닫는다(D1 기각 ②). 조회 대행
     * 권한의 면제는 business-app 의 {@code BoardAttachmentReadAllReachabilityTest} 가 보고, 이 단언은 core PIT 가 사용 여부 변이를 잡게
     * 여기에도 둔다.
     */
    @Test
    void logicallyDeletedPostOrUnusedBoardClosesSharingWithoutAnyPermission() {
        post("PUBLIC","N");
        jdbc.update("UPDATE tb_bbs_item SET use_yn='N'");
        var deletedPost=resolver.resolve(101L,"reader-login","reader-esntl");
        assertThat(deletedPost.sharedGrant()).as("논리 삭제 글").isFalse();
        assertThat(deletedPost.resolutionFailed()).isFalse();
        assertThat(resolver.resolve(101L,"writer-login","writer-esntl").ownerGrant()).as("작성자는 삭제 글의 첨부도 받는다").isTrue();
        jdbc.update("UPDATE tb_bbs_item SET use_yn=NULL");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).as("사용 여부가 NULL 인 글").isFalse();

        jdbc.update("UPDATE tb_bbs_item SET use_yn='Y'");
        jdbc.update("UPDATE tb_bbs_master SET use_yn='N' WHERE bbs_id='PUBLIC'");
        var unusedBoard=resolver.resolve(101L,"writer-login","writer-esntl");
        assertThat(unusedBoard.sharedGrant()).as("사용 안 함 게시판의 글").isFalse();
        assertThat(unusedBoard.ownerGrant()).as("사용 안 함 게시판은 작성자 소유 근거도 닫는다").isFalse();
        assertThat(unusedBoard.resolutionFailed()).isFalse();
    }

    private void assertShared(String description,String startYmd,String endYmd,boolean expected) {
        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=?, pst_end_ymd=?",startYmd,endYmd);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).as(description).isEqualTo(expected);
    }
}
