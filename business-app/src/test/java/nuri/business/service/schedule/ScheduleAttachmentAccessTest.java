package nuri.business.service.schedule;

import nuri.business.domain.file.FileMaster;
import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import nuri.business.service.file.FileAccessPolicy;
import nuri.business.service.file.JdbcAttachmentReferenceResolver;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** 본문과 첨부가 같은 DB 행·인증 주체에 대해 같은 열람 범위를 집행하는지 검증한다. */
class ScheduleAttachmentAccessTest {
    private static final long FILE_ID = 101L;
    private static final String DEFAULT_DEPARTMENT = "ORGNZT_0000000000000";

    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private ScheduleService schedules;
    private FileAccessPolicy files;
    private FileMaster file;

    @BeforeEach
    void setUp() {
        database = new EmbeddedDatabaseBuilder().generateUniqueName(true)
                .setType(EmbeddedDatabaseType.H2).build();
        jdbc = new JdbcTemplate(database);
        jdbc.execute("""
                CREATE TABLE tb_schdl_info (
                    schdl_sn BIGINT PRIMARY KEY, atch_file_sn BIGINT,
                    frst_rgtr_id VARCHAR(20), schdl_se_cd VARCHAR(12), schdl_dept_id VARCHAR(20))
                """);
        jdbc.execute("CREATE TABLE tb_user_info (user_id VARCHAR(20) PRIMARY KEY, ognz_id VARCHAR(20))");

        // 서비스도 JDBC resolver와 같은 행을 읽는다. SecurityUtil과 권한 판정은 모킹하지 않는다.
        var repository = mock(ScheduleRepository.class);
        when(repository.findById(anyLong())).thenAnswer(invocation -> jdbc.query("""
                SELECT schdl_sn, atch_file_sn, frst_rgtr_id, schdl_se_cd, schdl_dept_id
                  FROM tb_schdl_info WHERE schdl_sn = ?
                """, (rs, row) -> {
            var schedule = Schedule.builder().schdlSn(rs.getLong("schdl_sn")).schdlNm("일정")
                    .atchFileSn(rs.getLong("atch_file_sn")).schdlSeCd(rs.getString("schdl_se_cd"))
                    .schdlDeptId(rs.getString("schdl_dept_id")).build();
            schedule.setFrstRgtrId(rs.getString("frst_rgtr_id"));
            return schedule;
        }, invocation.<Long>getArgument(0)).stream().findFirst());
        var users = mock(UserRepository.class);
        when(users.findByUserId(anyString())).thenAnswer(invocation -> jdbc.query(
                "SELECT user_id, ognz_id FROM tb_user_info WHERE user_id = ?",
                (rs, row) -> User.builder().userId(rs.getString("user_id"))
                        .ognzId(rs.getString("ognz_id")).build(),
                invocation.<String>getArgument(0)).stream().findFirst());
        var mapper = mock(ScheduleMapper.class);
        when(mapper.toDto(any(Schedule.class))).thenAnswer(invocation ->
                ScheduleDto.builder().schdlSn(invocation.<Schedule>getArgument(0).getSchdlSn()).build());
        schedules = new ScheduleService(repository, mapper, users, mock(AttachmentAssignmentPolicy.class));

        AttachmentSourceContributor source = () -> List.of(AttachmentSource.SCHEDULE);
        files = new FileAccessPolicy(new JdbcAttachmentReferenceResolver(jdbc, List.of(source)));
        file = new FileMaster(FILE_ID);
        file.setFrstRgtrId("uploader");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (database != null) database.shutdown();
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(nullValues = "NULL", textBlock = """
            owner,             owner,  internal-owner, true,  DEPT2, 2,    DEPT1,                   NONE,              true
            same-department,   viewer, internal-view,  true,  DEPT1, 1,    DEPT1,                   NONE,              true
            other-department,  viewer, internal-view,  true,  DEPT2, 1,    DEPT1,                   NONE,              false
            private,           viewer, internal-view,  true,  DEPT1, 2,    DEPT1,                   NONE,              false
            null-kind,         viewer, internal-view,  true,  DEPT1, NULL, DEPT1,                   NONE,              false
            blank-kind,        viewer, internal-view,  true,  DEPT1, '',   DEPT1,                   NONE,              false
            file-admin-only,   viewer, internal-view,  true,  DEPT2, 2,    DEPT1,                   FILE_READ_ALL,     false
            schedule-admin,    viewer, internal-view,  true,  DEPT2, 2,    DEPT1,                   SCHEDULE_READ_ALL, true
            null-membership,   viewer, internal-view,  true,  NULL,  1,    ORGNZT_0000000000000,     NONE,              true
            blank-membership,  viewer, internal-view,  true,  '',    1,    ORGNZT_0000000000000,     NONE,              true
            spaces-membership, viewer, internal-view,  true,  '   ', 1,    ORGNZT_0000000000000,     NONE,              true
            missing-user,      viewer, internal-view,  false, NULL,  1,    ORGNZT_0000000000000,     NONE,              true
            assigned-user,     viewer, internal-view,  true,  DEPT1, 1,    ORGNZT_0000000000000,     NONE,              false
            null-target-dept,  viewer, internal-view,  true,  NULL,  1,    NULL,                    NONE,              false
            blank-target-dept, viewer, internal-view,  true,  NULL,  1,    '',                      NONE,              false
            wrong-identity,    viewer, owner,          true,  DEPT1, 2,    DEPT1,                   NONE,              false
            blank-login,       '',     internal-view,  false, NULL,  1,    ORGNZT_0000000000000,     NONE,              false
            """)
    void bodyAndAttachmentShareTheSameReadScope(String scenario, String loginId, String esntlId,
            boolean userExists, String membership, String kind, String department,
            String permission, boolean readable) {
        if (userExists) addUser(loginId, membership);
        addSchedule(1L, "owner", kind, department);
        authenticate(loginId, esntlId, "NONE".equals(permission) ? List.of() : List.of(permission));

        assertBodyAccess(1L, readable);
        assertFileAccess(readable);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void unauthenticatedOrUntrustedPrincipalCannotReadFallbackDepartment(boolean typedPrincipal) {
        addSchedule(1L, "owner", "1", DEFAULT_DEPARTMENT);
        if (typedPrincipal) {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal("viewer", "internal-view", List.of()), null));
        }
        assertBodyAccess(1L, false);
        assertFileAccess(false);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void readPermissionDoesNotBecomeFileDeletionOrAttachmentPermission(boolean scheduleAdmin) {
        addUser("viewer", "DEPT1");
        addSchedule(1L, "owner", scheduleAdmin ? "2" : "1", "DEPT1");
        authenticate("viewer", "internal-view", scheduleAdmin ? List.of("SCHEDULE_READ_ALL") : List.of());

        assertBodyAccess(1L, true);
        assertFileAccess(true);
        assertThatThrownBy(() -> files.assertDeletable(file)).isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> files.assertAttachable(file)).isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void multipleScheduleReferencesGrantAccessOnlyWhenAtLeastOneIsReadable(boolean readableReference) {
        addUser("viewer", "DEPT1");
        addSchedule(1L, "owner", "2", "DEPT1");
        addSchedule(2L, "other-owner", "1", readableReference ? "DEPT1" : "DEPT2");
        authenticate("viewer", "internal-view", List.of());

        assertBodyAccess(1L, false);
        assertBodyAccess(2L, readableReference);
        assertFileAccess(readableReference);
    }

    @Test
    void scheduleQueryFailureCannotBeBypassedByFileAdmin() {
        authenticate("viewer", "internal-view", List.of("FILE_READ_ALL"));
        jdbc.execute("DROP TABLE tb_schdl_info");

        assertFileAccess(false);
    }

    @Test
    void unreferencedFileRemainsReadableByItsUploaderOnly() {
        authenticate("viewer", "internal-view", List.of());
        assertFileAccess(false);

        authenticate("uploader", "internal-uploader", List.of());
        assertFileAccess(true);
    }

    private void addUser(String loginId, String department) {
        jdbc.update("INSERT INTO tb_user_info (user_id, ognz_id) VALUES (?, ?)", loginId, department);
    }

    private void addSchedule(long id, String owner, String kind, String department) {
        jdbc.update("""
                INSERT INTO tb_schdl_info (schdl_sn, atch_file_sn, frst_rgtr_id, schdl_se_cd, schdl_dept_id)
                VALUES (?, ?, ?, ?, ?)
                """, id, FILE_ID, owner, kind, department);
    }

    private void assertBodyAccess(long id, boolean readable) {
        if (readable) {
            assertThatCode(() -> schedules.getSchedule(id)).doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> schedules.getSchedule(id)).isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }
    }

    private void assertFileAccess(boolean readable) {
        if (readable) {
            assertThatCode(() -> files.assertReadable(file)).doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> files.assertReadable(file)).isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getErrorCode()).isEqualTo(CommonErrorCode.ACCESS_DENIED);
        }
    }

    private static void authenticate(String loginId, String esntlId, List<String> permissions) {
        var principal = principal(loginId, esntlId, permissions);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static CustomUserDetails principal(String loginId, String esntlId, List<String> permissions) {
        return CustomUserDetails.builder().userId(loginId).esntlId(esntlId).userNm("test")
                .groups(List.of("ROLE_USER")).permissions(permissions)
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).enabled(true).lockAt("N").build();
    }
}
