package nuri.business.service.informalsanction;

import nuri.business.domain.file.FileMaster;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import nuri.business.service.file.FileAccessPolicy;
import nuri.business.service.file.JdbcAttachmentReferenceResolver;
import nuri.business.service.informalsanction.attachment.ApprovalAttachmentSourceContributor;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [V2_151] 약식결재 첨부의 열람·삭제 판정을 실제 JDBC 리졸버와 첨부 정책으로 검증한다(H3). 열람 범위는 본문 상세와 같다 — 기안자,
 * 그 차수 결재선(원결재자·대신 결정한 대리결재자), 참조자, 지금 유효한 대리결재자. 결재 전역 조회 권한은 없으므로 파일 관리자
 * ({@code FILE_READ_ALL})도 열지 못하고, 개인 귀속이라 일반 개별 삭제는 누구도 못 한다(ADR-0048). 임시저장의 첨부는 기안자만 연다.
 */
@DisplayName("약식결재 첨부 — 본문과 같은 열람 범위·개별 삭제 차단")
class ApprovalAttachmentAccessTest {
    private static final long CURRENT_FILE = 501L;
    private static final long FIRST_CYCLE_FILE = 500L;
    private static final long DRAFT_FILE = 600L;
    private static final DateTimeFormatter YMD = DateTimeFormatter.BASIC_ISO_DATE;

    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private FileAccessPolicy files;

    @BeforeEach
    void setUp() {
        database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2).build();
        jdbc = new JdbcTemplate(database);
        jdbc.execute("""
                CREATE TABLE tb_ifml_atrz_info (ifml_atrz_sn BIGINT PRIMARY KEY, aplcnt_id VARCHAR(20),
                    aprv_yn VARCHAR(1), atrz_cycl NUMERIC(7), atch_file_sn BIGINT)
                """);
        jdbc.execute("""
                CREATE TABLE tb_ifml_atrz_hstry (ifml_atrz_sn BIGINT, atrz_cycl NUMERIC(7), atch_file_sn BIGINT,
                    PRIMARY KEY (ifml_atrz_sn, atrz_cycl))
                """);
        jdbc.execute("""
                CREATE TABLE tb_ifml_atrz_dtl (ifml_atrz_sn BIGINT, atrz_cycl NUMERIC(7), atrz_seq NUMERIC(10),
                    user_id VARCHAR(20), aprv_yn VARCHAR(1), sbt_aprvr_id VARCHAR(20))
                """);
        jdbc.execute("CREATE TABLE tb_ifml_atrz_rfpr (ifml_atrz_sn BIGINT, atrz_cycl NUMERIC(7), user_id VARCHAR(20))");
        jdbc.execute("""
                CREATE TABLE tb_ifml_atrz_tmpr_strg (ifml_atrz_tmpr_strg_sn BIGINT PRIMARY KEY, aplcnt_id VARCHAR(20),
                    atch_file_sn BIGINT)
                """);
        jdbc.execute("""
                CREATE TABLE tb_user_absn (user_id VARCHAR(20) PRIMARY KEY, user_absn_yn VARCHAR(1),
                    sbt_aprvr_id VARCHAR(20), absn_bgng_ymd VARCHAR(8), absn_end_ymd VARCHAR(8))
                """);
        AttachmentSourceContributor approvals = new ApprovalAttachmentSourceContributor();
        files = new FileAccessPolicy(new JdbcAttachmentReferenceResolver(jdbc, List.of(approvals)));

        // 문서 7: 기안자 drafter. 1차수(첨부 500)는 old 가 반려했고, 2차수(첨부 501)는 지금 first 의 차례다(진행 중).
        jdbc.update("INSERT INTO tb_ifml_atrz_info VALUES (7, 'drafter', 'A', 2, ?)", CURRENT_FILE);
        jdbc.update("INSERT INTO tb_ifml_atrz_hstry VALUES (7, 1, ?)", FIRST_CYCLE_FILE);
        jdbc.update("INSERT INTO tb_ifml_atrz_hstry VALUES (7, 2, ?)", CURRENT_FILE);
        jdbc.update("INSERT INTO tb_ifml_atrz_dtl VALUES (7, 1, 1, 'old', 'R', NULL)");
        jdbc.update("INSERT INTO tb_ifml_atrz_dtl VALUES (7, 2, 1, 'first', 'A', NULL)");
        jdbc.update("INSERT INTO tb_ifml_atrz_dtl VALUES (7, 2, 2, 'second', 'W', NULL)");
        jdbc.update("INSERT INTO tb_ifml_atrz_rfpr VALUES (7, 1, 'reader')");
        jdbc.update("INSERT INTO tb_ifml_atrz_tmpr_strg VALUES (3, 'drafter', ?)", DRAFT_FILE);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (database != null) database.shutdown();
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(textBlock = """
            drafter,                 drafter,  NONE,          true,  true
            current-approver,        first,    NONE,          true,  false
            waiting-approver,        second,   NONE,          true,  false
            reference,               reader,   NONE,          true,  true
            first-cycle-approver,    old,      NONE,          false, true
            third-party,             stranger, NONE,          false, false
            file-admin,              stranger, FILE_READ_ALL, false, false
            """)
    @DisplayName("문서·차수 첨부는 본문 상세와 같은 사람만 연다 — 관리자 우회 없음")
    void documentAndRevisionAttachmentsFollowBodyScope(String scenario, String esntlId, String permission,
                                                       boolean currentReadable, boolean firstCycleReadable) {
        authenticate(esntlId, "NONE".equals(permission) ? List.of() : List.of(permission));

        assertReadable(CURRENT_FILE, currentReadable);
        assertReadable(FIRST_CYCLE_FILE, firstCycleReadable);
    }

    @Test
    @DisplayName("지금 유효한 대리결재자는 맡긴 사람 차례인 문서의 첨부를 연다 — 기간이 끝나거나 차례가 아니면 못 연다")
    void effectiveSubstituteReadsOnlyWhileDelegationIsActive() {
        String today = LocalDate.now(ZoneId.of("Asia/Seoul")).format(YMD);
        String yesterday = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1).format(YMD);
        authenticate("sub", List.of());

        absence("first", "Y", "sub", yesterday, today);
        assertReadable(CURRENT_FILE, true);
        assertReadable(FIRST_CYCLE_FILE, false);

        jdbc.update("UPDATE tb_user_absn SET absn_end_ymd = ? WHERE user_id = 'first'", yesterday);
        assertReadable(CURRENT_FILE, false);

        // 기다리는 사람(second)이 맡겨도 아직 차례가 아니면 근거가 없다.
        jdbc.update("DELETE FROM tb_user_absn");
        absence("second", "Y", "sub", yesterday, today);
        assertReadable(CURRENT_FILE, false);

        // 끝난 문서는 지금 대리결재 근거를 만들지 않는다.
        jdbc.update("DELETE FROM tb_user_absn");
        absence("first", "Y", "sub", yesterday, today);
        jdbc.update("UPDATE tb_ifml_atrz_info SET aprv_yn = 'C'");
        assertReadable(CURRENT_FILE, false);
    }

    @Test
    @DisplayName("대신 결정한 대리결재자는 그 차수의 첨부를 계속 연다")
    void substituteWhoDecidedKeepsReadingThatCycle() {
        jdbc.update("UPDATE tb_ifml_atrz_dtl SET aprv_yn = 'C', sbt_aprvr_id = 'sub' WHERE atrz_cycl = 2 AND user_id = 'first'");
        authenticate("sub", List.of());

        assertReadable(CURRENT_FILE, true);
        assertReadable(FIRST_CYCLE_FILE, false);
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(textBlock = """
            drafter,    drafter,  NONE
            approver,   first,    NONE
            file-admin, stranger, FILE_DELETE_ALL
            """)
    @DisplayName("결재에 붙은 첨부는 일반 파일 API 로 하나씩 지울 수 없다 — 기안자·결재자·관리자 모두(위변조 방지)")
    void documentAttachmentIsNotIndividuallyDeletable(String scenario, String esntlId, String permission) {
        authenticate(esntlId, "NONE".equals(permission) ? List.of() : List.of(permission));

        assertThatThrownBy(() -> files.assertDeletable(file(CURRENT_FILE))).isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> files.assertDeletable(file(FIRST_CYCLE_FILE))).isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("임시저장 첨부는 기안자만 열고 지운다 — 파일 관리자 열람도 막는다")
    void draftAttachmentBelongsToTheDrafterOnly() {
        authenticate("drafter", List.of());
        assertReadable(DRAFT_FILE, true);
        assertThatCode(() -> files.assertDeletable(file(DRAFT_FILE))).doesNotThrowAnyException();

        authenticate("stranger", List.of("FILE_READ_ALL"));
        assertReadable(DRAFT_FILE, false);

        authenticate("first", List.of());
        assertReadable(DRAFT_FILE, false);
        assertThatThrownBy(() -> files.assertDeletable(file(DRAFT_FILE))).isInstanceOf(BusinessException.class);

        authenticate("stranger", List.of("FILE_DELETE_ALL"));
        assertThatThrownBy(() -> files.assertDeletable(file(DRAFT_FILE))).as("남의 임시저장 첨부는 파일 관리자도 못 지운다")
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("🚨 상신한 문서·앞 차수 이력의 묶음에는 원 업로더도 다른 경로로 파일을 더하지 못한다 — 임시저장 묶음은 더한다")
    void submittedAndRevisionGroupsAreFrozenForAppends() {
        var uploader = CustomUserDetails.builder().userId("uploader").esntlId("drafter").userNm("test")
                .groups(List.of("ROLE_USER")).permissions(List.of())
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).enabled(true).lockAt("N").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(uploader, null, uploader.getAuthorities()));

        for (long frozenFile : new long[] {CURRENT_FILE, FIRST_CYCLE_FILE}) {
            assertThatThrownBy(() -> files.assertAppendable(file(frozenFile))).as("묶음 %d", frozenFile)
                    .isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }
        assertThatCode(() -> files.assertAppendable(file(DRAFT_FILE))).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("상신으로 묶음이 문서로 옮겨 가면 기안자도 하나씩 지울 수 없다")
    void submittedDraftAttachmentBecomesPersonal() {
        jdbc.update("UPDATE tb_ifml_atrz_info SET atch_file_sn = ?", DRAFT_FILE);
        authenticate("drafter", List.of());

        assertReadable(DRAFT_FILE, true);
        assertThatThrownBy(() -> files.assertDeletable(file(DRAFT_FILE))).isInstanceOf(BusinessException.class);
        assertThat(files.referenced(DRAFT_FILE)).isTrue();
    }

    private void absence(String userId, String absent, String substitute, String from, String to) {
        jdbc.update("INSERT INTO tb_user_absn VALUES (?, ?, ?, ?, ?)", userId, absent, substitute, from, to);
    }

    private void assertReadable(long fileId, boolean readable) {
        if (readable) {
            assertThatCode(() -> files.assertReadable(file(fileId))).doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> files.assertReadable(file(fileId))).isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }
    }

    private static FileMaster file(long id) {
        FileMaster master = new FileMaster(id);
        master.setFrstRgtrId("uploader");
        return master;
    }

    private static void authenticate(String esntlId, List<String> permissions) {
        var principal = CustomUserDetails.builder().userId("login-" + esntlId).esntlId(esntlId).userNm("test")
                .groups(List.of("ROLE_USER")).permissions(permissions)
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).enabled(true).lockAt("N").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
