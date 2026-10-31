package nuri.business.service.board;

import nuri.business.TestApplication;
import nuri.business.core.config.TestMessagingConfig;
import nuri.business.domain.board.BoardChange;
import nuri.business.domain.board.BoardChangeRepository;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.security.config.TestSecurityConfig;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardPostPeriodBatchRequest;
import nuri.business.service.board.dto.BoardPostPeriodRequest;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 운영 화면의 게시 기간 변경과 작성 화면 수정이 게시글 버전으로 실제로 맞물리는지 본다(ADR-0040 결정 9·10, 설계서 §6 B1).
 * 상단 고정(B2, 결정 5)은 반대로 버전을 올리지 않고 작성자 저장에 덮이지도 않는지 본다.
 *
 * <p>[왜 통합 시험인가] 버전 증가는 Hibernate 가 flush 때 한다 — 목 저장소로는 "일괄 처리 뒤 그 전에 읽은 버전으로 작성자가 고치면
 * 409" 를 증명할 수 없다. 일괄 처리의 전체 미적용(이력 0)도 실제 트랜잭션에서만 보인다. 고정 컬럼이 엔티티 저장에서 빠지는지
 * ({@code updatable = false})도 실제 UPDATE 문으로만 보인다.
 */
@SpringBootTest(classes = TestApplication.class)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class })
@ActiveProfiles("test")
@DisplayName("게시 기간 운영 변경과 게시글 버전(통합)")
class BoardPostPeriodIntegrationTest {

    /** 쓰기 서비스는 현재 권한을 다시 본다(백엔드 헌법 제8조). 권한을 따로 쥐지 않은 시험은 관리자로 돈다. */
    @org.junit.jupiter.api.BeforeEach
    void authorizeServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
    }

    @org.junit.jupiter.api.AfterEach
    void clearServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private static final String AUTHOR = "PERIODAUTHOR";
    private static final String FAR_END = "20991231";

    @Autowired private BoardService boardService;
    @Autowired private BoardMasterService boardMasterService;
    @Autowired private BoardRepository boardRepository;
    @Autowired private BoardMasterRepository boardMasterRepository;
    @Autowired private BoardChangeRepository changeRepository;

    private String bbsId;
    private final List<Long> posts = new ArrayList<>();

    @BeforeEach
    void setUp() {
        bbsId = boardMasterService.createBoardMaster("tester", BoardMasterDto.builder()
                .bbsId("BBSMSTR_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase())
                .bbsTtl("게시 기간 검증")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA02")
                .atchPsbltyFileSz(1024L)
                .useYn("Y")
                .rsvtPstgPsbltyYn("Y")
                // [ADR-0040 결정 5] 상단 고정을 받고 상한은 1건 — 실제 집계로 상한을 본다.
                .upendFixPsbltyYn("Y")
                .upendFixUplmtNocs(1)
                .build());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        boardRepository.deleteAllById(posts);
        boardMasterRepository.deleteById(bbsId);
    }

    @Test
    @DisplayName("일괄 종료일 변경은 게시글 버전을 올려, 그 전에 읽은 버전으로 한 작성자 수정은 409 이고 최신 버전은 통과한다")
    void batchEndDateBumpsVersionAndStaleAuthorEditConflicts() {
        Long pstSn = createPost(null);
        assertThat(version(pstSn)).isZero();

        actAs("operator", "BOARD_UPDATE_ALL");
        boardService.updatePostPeriodsInBatch(bbsId, new BoardPostPeriodBatchRequest("END_DATE", List.of(pstSn), FAR_END));
        assertThat(version(pstSn)).as("작성자 폼과 같은 컬럼을 바꾸므로 버전이 오른다").isEqualTo(1);
        assertThat(postChanges()).extracting(BoardChange::getChgTypeCd, BoardChange::getChgArtclNm, BoardChange::getChgAftrCn)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("PERIOD", "게시 종료일", FAR_END));

        actAs(AUTHOR);
        assertThatThrownBy(() -> boardService.updatePost(bbsId, pstSn, edit(0)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(boardRepository.findById(pstSn).orElseThrow().getPstTtl()).isEqualTo("처음 제목");

        boardService.updatePost(bbsId, pstSn, edit(1));
        assertThat(boardRepository.findById(pstSn).orElseThrow().getPstTtl()).isEqualTo("고친 제목");
        assertThat(boardRepository.findById(pstSn).orElseThrow().getPstEndYmd())
                .as("작성 화면 수정은 운영자가 정한 종료일을 지우지 않는다").isEqualTo(FAR_END);

        // 단건 빠른 편집도 같은 버전 규칙이다 — 같은 값이면 버전도 이력도 그대로다.
        actAs("operator", "BOARD_UPDATE_ALL");
        int current = version(pstSn);
        boardService.updatePostPeriod(bbsId, pstSn, new BoardPostPeriodRequest(null, FAR_END, current));
        assertThat(version(pstSn)).isEqualTo(current);
        assertThat(postChanges()).hasSize(1);
        assertThatThrownBy(() -> boardService.updatePostPeriod(bbsId, pstSn,
                new BoardPostPeriodRequest(null, "20991130", current - 1)))
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
    }

    @Test
    @DisplayName("일괄 처리는 하나라도 맞지 않으면 아무 글도 바꾸지 않고 이력도 남기지 않는다")
    void rejectedBatchChangesNothing() {
        Long open = createPost(null);
        Long lateStart = createPost("20991201");

        actAs("operator", "BOARD_UPDATE_ALL");
        assertThatThrownBy(() -> boardService.updatePostPeriodsInBatch(bbsId,
                new BoardPostPeriodBatchRequest("END_DATE", List.of(open, lateStart), "20991130")))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining(String.valueOf(lateStart));

        assertThat(boardRepository.findById(open).orElseThrow().getPstEndYmd()).isNull();
        assertThat(version(open)).isZero();
        assertThat(version(lateStart)).isZero();
        assertThat(postChanges()).isEmpty();
    }

    @Test
    @DisplayName("🚨 상단 고정은 게시글 버전을 올리지 않고, 그 전에 읽은 버전으로 한 작성자 수정이 통과해도 고정이 남는다")
    void pinKeepsPostVersionAndSurvivesAuthorEdit() {
        Long pstSn = createPost(null);

        actAs("operator", "BOARD_PIN");
        boardService.updatePostPin(bbsId, pstSn,
                new nuri.business.service.board.dto.BoardPostPinRequest("Y", FAR_END));
        assertThat(version(pstSn)).as("고정은 운영자 행위라 작성자 버전을 올리지 않는다").isZero();
        assertThat(boardRepository.findById(pstSn).orElseThrow())
                .extracting(nuri.business.domain.board.Board::getUpendFixYn, nuri.business.domain.board.Board::getUpendFixEndYmd)
                .containsExactly("Y", FAR_END);
        assertThat(postChanges()).extracting(BoardChange::getChgTypeCd, BoardChange::getChgArtclNm, BoardChange::getChgAftrCn)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple("PIN", "상단 고정", "Y"),
                        org.assertj.core.groups.Tuple.tuple("PIN", "상단 고정 종료일", FAR_END));

        actAs(AUTHOR);
        boardService.updatePost(bbsId, pstSn, edit(0));
        assertThat(boardRepository.findById(pstSn).orElseThrow())
                .as("작성자 저장은 고정 컬럼을 쓰지 않는다(updatable=false)")
                .extracting(nuri.business.domain.board.Board::getPstTtl, nuri.business.domain.board.Board::getUpendFixYn,
                        nuri.business.domain.board.Board::getUpendFixEndYmd)
                .containsExactly("고친 제목", "Y", FAR_END);
    }

    @Test
    @DisplayName("상한은 실제 고정 수로 본다 — 상한 1 에서 두 번째 고정은 400, 대상 하나가 없는 일괄 고정은 404 이고 아무것도 바꾸지 않는다")
    void pinLimitAndRejectedBatchChangeNothing() {
        Long first = createPost(null);
        Long second = createPost(null);

        actAs("operator", "BOARD_PIN");
        boardService.updatePostPinsInBatch(bbsId,
                new nuri.business.service.board.dto.BoardPostPinBatchRequest(List.of(first), "Y", null));
        int changes = postChanges().size();

        assertThatThrownBy(() -> boardService.updatePostPin(bbsId, second,
                new nuri.business.service.board.dto.BoardPostPinRequest("Y", null)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_STATE)
                .hasMessageContaining("최대 1건까지 둡니다(지금 1건)");
        assertThatThrownBy(() -> boardService.updatePostPinsInBatch(bbsId,
                new nuri.business.service.board.dto.BoardPostPinBatchRequest(List.of(second, Long.MAX_VALUE), "N", null)))
                .hasFieldOrPropertyWithValue("errorCode", nuri.business.domain.board.exception.BoardErrorCode.ARTICLE_NOT_FOUND);
        assertThat(boardRepository.findById(second).orElseThrow().getUpendFixYn()).isEqualTo("N");
        assertThat(postChanges()).as("거부된 고정은 이력을 남기지 않는다").hasSize(changes);

        // 해제는 설정·상한과 상관없이 되고 종료일을 비운다. 그 뒤에는 두 번째 글을 고정할 수 있다.
        boardService.updatePostPin(bbsId, first, new nuri.business.service.board.dto.BoardPostPinRequest("N", null));
        boardService.updatePostPin(bbsId, second, new nuri.business.service.board.dto.BoardPostPinRequest("Y", null));
        assertThat(boardRepository.findById(first).orElseThrow().getUpendFixEndYmd()).isNull();
        assertThat(boardRepository.findById(second).orElseThrow().getUpendFixYn()).isEqualTo("Y");
        assertThat(version(first)).isZero();
        assertThat(version(second)).isZero();
    }

    /** 글은 저장소로 바로 넣는다 — 등록 경로의 작성자 이름 조회는 이 시험의 대상이 아니다(사용자 표 없이 시작한다). */
    private Long createPost(String startYmd) {
        Long pstSn = boardRepository.save(nuri.business.domain.board.Board.builder()
                .bbsId(bbsId).pstTtl("처음 제목").pstCn("본문").userId(AUTHOR).userNm("작성자")
                .sortOrdr((long) posts.size() + 1).ansSn(1L).pstBgngYmd(startYmd).build()).getPstSn();
        posts.add(pstSn);
        return pstSn;
    }

    private BoardSaveRequest edit(int version) {
        return new BoardSaveRequest(bbsId, "고친 제목", "고친 본문", null, null, null, null, null, null, null, null, null, version);
    }

    private int version(Long pstSn) {
        return boardRepository.findById(pstSn).orElseThrow().getVersion();
    }

    private List<BoardChange> postChanges() {
        return changeRepository.findByBbsIdOrderByCrtDtDescBbsChgHstrySnDesc(bbsId, PageRequest.of(0, 50)).getContent()
                .stream().filter(change -> BoardChangeRecorder.TARGET_POST.equals(change.getChgTrgtTypeCd())).toList();
    }

    private static void actAs(String esntlId, String... permissions) {
        var principal = CustomUserDetails.builder().userId(esntlId).esntlId(esntlId).userNm("tester")
                .groups(List.of("ROLE_USER")).permissions(List.of(permissions))
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).enabled(true).lockAt("N").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
