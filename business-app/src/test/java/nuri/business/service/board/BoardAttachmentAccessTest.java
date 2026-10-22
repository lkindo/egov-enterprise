package nuri.business.service.board;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.core.config.BoardIdProperties;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRecommendationRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardMapper;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.AttachmentSourceContributor;
import nuri.business.service.file.FileAccessPolicy;
import nuri.business.service.file.FileService;
import nuri.business.service.file.JdbcAttachmentReferenceResolver;
import nuri.business.service.user.UserService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.context.ApplicationEventPublisher;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 게시글 본문과 첨부가 같은 DB 행·인증 주체에 대해 같은 열람 범위를 집행하는지 대조한다(2026-10-23 ADR-0040 A0).
 *
 * <p>첨부 판정은 모듈 경계 때문에 business-core 의 {@link JdbcAttachmentReferenceResolver} 에 따로 있다. 두 판정이 갈라지면
 * 본문에서 사라진 글(게시 종료)의 첨부를 번호만 알면 받는다 — 실제로 그랬다. 일정의 {@code ScheduleAttachmentAccessTest} 와
 * 같은 방식으로, 본문 서비스와 첨부 판정이 같은 표를 읽게 하고 결과를 표로 고정한다.
 *
 * <p>의도된 비대칭(설계서 D3)도 표에 둔다. 작성자는 자기 첨부를 계속 받는다(소유 근거). 조회 대행 권한({@code BOARD_READ_ALL})은
 * 게시 기간만 면제받고, 비밀글·논리 삭제 글의 첨부는 {@code FILE_READ_ALL} 하나로만 열린다. 파일 관리자({@code FILE_READ_ALL})는
 * 본문을 못 읽어도 첨부를 받는다(기존 관리자 경로).
 */
class BoardAttachmentAccessTest {
    private static final long FILE_ID = 301L;
    private static final long POST_ID = 1L;
    private static final String BBS_ID = "BBSMSTR_TESTBOARD001";
    private static final String TODAY = LocalDate.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.BASIC_ISO_DATE);
    private static final String YESTERDAY = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1)
            .format(DateTimeFormatter.BASIC_ISO_DATE);

    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private BoardService boards;
    private FileAccessPolicy files;
    private FileMaster file;

    @BeforeEach
    void setUp() {
        database = new EmbeddedDatabaseBuilder().generateUniqueName(true)
                .setType(EmbeddedDatabaseType.H2).build();
        jdbc = new JdbcTemplate(database);
        jdbc.execute("""
                CREATE TABLE tb_bbs_master (
                    bbs_id VARCHAR(20) PRIMARY KEY, cmnty_sn BIGINT, use_yn VARCHAR(1))
                """);
        jdbc.execute("""
                CREATE TABLE tb_bbs_item (
                    pst_sn BIGINT PRIMARY KEY, bbs_id VARCHAR(20), atch_file_sn BIGINT,
                    frst_rgtr_id VARCHAR(20), user_id VARCHAR(20), scrt_yn VARCHAR(1),
                    use_yn VARCHAR(1), pst_end_ymd VARCHAR(8))
                """);

        // 본문 서비스도 첨부 판정과 같은 행을 읽는다. 저장소의 활성 상세 질의(게시판·글 use_yn='Y')를 그대로 옮겼다.
        var repository = mock(BoardRepository.class);
        when(repository.findActiveArticleDetail(anyString(), anyLong()))
                .thenAnswer(invocation -> detail(invocation.getArgument(0), invocation.getArgument(1), false));
        when(repository.findArticleDetailIncludingDeleted(anyString(), anyLong()))
                .thenAnswer(invocation -> detail(invocation.getArgument(0), invocation.getArgument(1), true));
        var masters = mock(BoardMasterRepository.class);
        when(masters.findById(anyString())).thenAnswer(invocation -> jdbc.query(
                "SELECT bbs_id, cmnty_sn, use_yn FROM tb_bbs_master WHERE bbs_id = ?",
                (rs, row) -> BoardMaster.builder().bbsId(rs.getString("bbs_id"))
                        .cmntySn(rs.getObject("cmnty_sn", Long.class)).useYn(rs.getString("use_yn")).build(),
                invocation.<String>getArgument(0)).stream().findFirst());
        var mapper = mock(BoardMapper.class);
        when(mapper.toDto(any(BoardDetailResult.class))).thenReturn(BoardDto.builder().build());
        boards = new BoardService(repository, masters, mock(UserService.class), mock(FileService.class),
                mock(AttachmentAssignmentPolicy.class), mock(ApplicationEventPublisher.class), new SimpleMeterRegistry(),
                mock(BoardViewCountService.class), mapper, new BoardIdProperties(),
                mock(BoardRecommendationRepository.class), null);

        AttachmentSourceContributor source = () -> List.of(AttachmentSource.BOARD);
        files = new FileAccessPolicy(new JdbcAttachmentReferenceResolver(jdbc, List.of(source)));
        file = new FileMaster(FILE_ID);
        file.setFrstRgtrId("uploader");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (database != null) database.shutdown();
    }

    /**
     * 행 상태: open(종료일 없음)·endsToday(오늘 종료)·ended(어제 종료)·secret(비밀글)·deleted(논리 삭제).
     * 사용자: other(일반)·author(작성자)·boardAdmin(BOARD_READ_ALL)·fileAdmin(FILE_READ_ALL).
     */
    @ParameterizedTest(name = "{0} × {1} → 본문 {2}, 첨부 {3}")
    @CsvSource(textBlock = """
            other,      open,      true,  true
            other,      endsToday, true,  true
            other,      ended,     false, false
            other,      secret,    false, false
            other,      deleted,   false, false
            author,     open,      true,  true
            author,     ended,     true,  true
            author,     secret,    true,  true
            author,     deleted,   false, true
            boardAdmin, open,      true,  true
            boardAdmin, ended,     true,  true
            boardAdmin, secret,    true,  false
            boardAdmin, deleted,   true,  false
            fileAdmin,  open,      true,  true
            fileAdmin,  ended,     false, true
            fileAdmin,  secret,    false, true
            """)
    void bodyAndAttachmentShareTheReadScope(String viewer, String state, boolean bodyReadable, boolean fileReadable) {
        addMaster("Y");
        addPost(state);
        authenticate(viewer);

        assertBodyAccess(bodyReadable);
        assertFileAccess(fileReadable);
    }

    @ParameterizedTest(name = "사용 안 함 게시판 × {0} → 첨부 {1}")
    @CsvSource(textBlock = """
            other,      false
            author,     true
            """)
    void inactiveBoardSharesNothingButKeepsTheOwnerGrant(String viewer, boolean fileReadable) {
        addMaster("N");
        addPost("open");
        authenticate(viewer);

        assertBodyAccess(false);
        assertFileAccess(fileReadable);
    }

    private Optional<BoardDetailResult> detail(String bbsId, Long pstSn, boolean includeDeleted) {
        return jdbc.query("""
                SELECT b.bbs_id, b.pst_sn, b.user_id, b.scrt_yn, b.pst_end_ymd, b.use_yn
                  FROM tb_bbs_item b JOIN tb_bbs_master m ON m.bbs_id = b.bbs_id
                 WHERE b.bbs_id = ? AND b.pst_sn = ? AND m.use_yn = 'Y'
                   AND (? OR b.use_yn = 'Y')
                """, (rs, row) -> BoardDetailResult.builder().bbsId(rs.getString("bbs_id"))
                .pstSn(rs.getLong("pst_sn")).userId(rs.getString("user_id")).scrtYn(rs.getString("scrt_yn"))
                .pstEndYmd(rs.getString("pst_end_ymd")).useYn(rs.getString("use_yn")).build(),
                bbsId, pstSn, includeDeleted).stream().findFirst();
    }

    private void addMaster(String useYn) {
        jdbc.update("INSERT INTO tb_bbs_master (bbs_id, cmnty_sn, use_yn) VALUES (?, NULL, ?)", BBS_ID, useYn);
    }

    private void addPost(String state) {
        String endYmd = switch (state) {
            case "endsToday" -> TODAY;
            case "ended" -> YESTERDAY;
            default -> null;
        };
        jdbc.update("""
                INSERT INTO tb_bbs_item (pst_sn, bbs_id, atch_file_sn, frst_rgtr_id, user_id, scrt_yn, use_yn, pst_end_ymd)
                VALUES (?, ?, ?, 'author', 'author-id', ?, ?, ?)
                """, POST_ID, BBS_ID, FILE_ID, "secret".equals(state) ? "Y" : "N",
                "deleted".equals(state) ? "N" : "Y", endYmd);
    }

    private void assertBodyAccess(boolean readable) {
        if (readable) {
            assertThatCode(() -> boards.getPostDetail(BBS_ID, POST_ID, false)).doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> boards.getPostDetail(BBS_ID, POST_ID, false))
                    .isInstanceOf(BusinessException.class);
        }
    }

    private void assertFileAccess(boolean readable) {
        if (readable) {
            assertThatCode(() -> files.assertReadable(file)).doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> files.assertReadable(file)).isInstanceOf(BusinessException.class);
        }
    }

    private static void authenticate(String viewer) {
        CustomUserDetails principal = switch (viewer) {
            case "author" -> principal("author", "author-id", List.of());
            case "boardAdmin" -> principal("viewer", "viewer-id", List.of("BOARD_READ_ALL"));
            case "fileAdmin" -> principal("viewer", "viewer-id", List.of("FILE_READ_ALL"));
            default -> principal("viewer", "viewer-id", List.of());
        };
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static CustomUserDetails principal(String loginId, String esntlId, List<String> permissions) {
        return CustomUserDetails.builder().userId(loginId).esntlId(esntlId).userNm("test")
                .groups(List.of("ROLE_USER")).permissions(permissions)
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).enabled(true).lockAt("N").build();
    }
}
