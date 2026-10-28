package nuri.business.service.board.attachment;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.JdbcAttachmentReferenceResolver;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * 게시판 첨부의 공유 근거 가운데 조회 대행 권한({@link PermissionCodes#BOARD_READ_ALL})에 기대는 경계를 실제 참조 SQL 로 본다.
 *
 * <p>[왜 게시판 시험 디렉터리인가] 판정 SQL 은 business-core 의 {@link JdbcAttachmentReferenceResolver} 에 있지만, 이 권한은
 * 게시판 기능 소유다. 생성기는 구성마다 권한 코드 상수를 다시 만들고 원장에 없는 코드는 늘 거부하므로, 게시판이 빠진 생성물에서는
 * 이 단언이 제품 결함 없이 붉었다(T2, 2026-10-23~). 그 구성에서는 게시판 참조원을 등록하는 기여자도 없어 이 분기에 닿지 않는다.
 * 그래서 게시판과 함께 빠지는 이 디렉터리로 옮겼다(DEC-OPS-257 ①, 일정의 {@code ScheduleAttachmentAccessTest} 와 같은 배치).
 * 권한을 보지 않는 나머지 도달성 단언은 business-core 의 {@code BoardAttachmentReachabilityTest} 에 남는다.
 */
class BoardAttachmentReadAllReachabilityTest {
    /** 서울 2026-10-23 00:30 이다(시계의 시간대는 UTC) — ADR-0040 결정 3. */
    private static final Clock FIXED = Clock.fixed(Instant.parse("2026-10-22T15:30:00Z"), ZoneOffset.UTC);
    private static final String TODAY = "20261023";
    private static final String YESTERDAY = "20261022";
    private static final String TOMORROW = "20261024";

    private JdbcTemplate jdbc;
    private SingleConnectionDataSource source;
    private CommunityBoardAccessPort membership;
    private JdbcAttachmentReferenceResolver resolver;

    @BeforeEach
    void createDatabase() {
        source=new SingleConnectionDataSource("jdbc:h2:mem:board-read-all-file-"+java.util.UUID.randomUUID(),"sa","",true);
        jdbc=new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE tb_bbs_master(bbs_id VARCHAR(20) PRIMARY KEY,cmnty_sn BIGINT,use_yn CHAR(1) DEFAULT 'Y' NOT NULL)");
        jdbc.execute("CREATE TABLE tb_bbs_item(bbs_id VARCHAR(20),atch_file_sn BIGINT,frst_rgtr_id VARCHAR(20),user_id VARCHAR(20),scrt_yn CHAR(1),use_yn CHAR(1) DEFAULT 'Y',pst_bgng_ymd VARCHAR(8),pst_end_ymd VARCHAR(8))");
        jdbc.update("INSERT INTO tb_bbs_master(bbs_id,cmnty_sn) VALUES('COMMUNITY',7),('PUBLIC',NULL)");
        membership=mock(CommunityBoardAccessPort.class);
        resolver=new JdbcAttachmentReferenceResolver(jdbc,List.of(() -> List.of(AttachmentSource.BOARD)),membership);
        // 다른 패키지의 패키지 전용 시계 주입 — BoardAttachmentAccessTest 와 같은 선례다.
        ReflectionTestUtils.invokeMethod(resolver, "useClock", FIXED);
    }

    @AfterEach
    void closeDatabase() { source.destroy(); SecurityContextHolder.clearContext(); }

    private void post(String board,String secret) {
        jdbc.update("INSERT INTO tb_bbs_item(bbs_id,atch_file_sn,frst_rgtr_id,user_id,scrt_yn) VALUES(?,101,'writer-login','writer-esntl',?)",board,secret);
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
        authenticateWith(PermissionCodes.BOARD_READ_ALL);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isFalse();
        SecurityContextHolder.clearContext();

        jdbc.update("UPDATE tb_bbs_item SET use_yn='Y'");
        jdbc.update("UPDATE tb_bbs_master SET use_yn='N' WHERE bbs_id='PUBLIC'");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isFalse();
        // [2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판은 조회 대행 권한자에게 공유 근거가 된다 — 본문을 그 사람에게 여는 것과 같다.
        authenticateWith(PermissionCodes.BOARD_READ_ALL);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        SecurityContextHolder.clearContext();

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
        authenticateWith(PermissionCodes.BOARD_READ_ALL);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        SecurityContextHolder.clearContext();

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
        authenticateWith(PermissionCodes.BOARD_READ_ALL);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        SecurityContextHolder.clearContext();

        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=?", TODAY);
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
        jdbc.update("UPDATE tb_bbs_item SET pst_bgng_ymd=''");
        assertThat(resolver.resolve(101L,"reader-login","reader-esntl").sharedGrant()).isTrue();
    }

    private static void authenticateWith(String permission) {
        var principal=CustomUserDetails.builder().userId("reader-login").esntlId("reader-esntl")
                .userNm("reader").groups(List.of("ROLE_USER")).permissions(List.of(permission))
                .authorizationVersion(PermissionCodes.CATALOG_VERSION)
                .enabled(true).lockAt("N").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
    }
}
