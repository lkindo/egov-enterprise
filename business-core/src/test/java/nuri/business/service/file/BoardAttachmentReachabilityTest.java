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
 * 보지 않는 단언만 둬 모든 생성물에서 그대로 돈다.
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
}
