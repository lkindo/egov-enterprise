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
        jdbc.execute("CREATE TABLE tb_bbs_master(bbs_id VARCHAR(20) PRIMARY KEY,cmnty_sn BIGINT)");
        jdbc.execute("CREATE TABLE tb_bbs_item(bbs_id VARCHAR(20),atch_file_sn BIGINT,frst_rgtr_id VARCHAR(20),user_id VARCHAR(20),scrt_yn CHAR(1))");
        jdbc.update("INSERT INTO tb_bbs_master VALUES('COMMUNITY',7),('PUBLIC',NULL)");
        membership=mock(CommunityBoardAccessPort.class);
        resolver=new JdbcAttachmentReferenceResolver(jdbc,List.of(() -> List.of(AttachmentSource.BOARD)),membership);
    }

    @AfterEach
    void closeDatabase() { source.destroy(); org.springframework.security.core.context.SecurityContextHolder.clearContext(); }

    private void post(String board,String secret) {
        jdbc.update("INSERT INTO tb_bbs_item VALUES(?,101,'writer-login','writer-esntl',?)",board,secret);
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
