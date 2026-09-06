package nuri.api.controller.business.board;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.api.controller.business.board.dto.SatisfactionAverageResponse;
import nuri.business.service.board.BoardService;
import nuri.business.service.board.SatisfactionService;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.annotation.AdminOnly;
import nuri.foundation.security.annotation.Authenticated;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 게시글 만족도 API.
 *
 * <p>익명 만족도 비밀번호 계약은 지원하지 않는다. 모든 일반 쓰기는 인증 사용자 전용이며,
 * 수정·삭제의 실질 owner-or-admin 판정은 서비스가 감사 작성자 기준으로 다시 수행한다.
 *
 * <p><b>경로를 게시글 하위로 중첩</b>했다({@code /boards/{bbsId}/posts/{pstSn}/satisfactions}).
 * 만족도는 게시글에 종속된 자원이고, 경로가 조회 범위를 강제하면 서비스가 범위를 놓쳐도
 * 다른 게시글의 값이 섞이지 않는다(D-4 응답자 목록이 설문 범위를 잃었던 사례의 예방).
 *
 * <p><b>인가</b>: 조회·등록·수정·삭제는 {@code @Authenticated}, 관리자 대리 삭제만 {@code @AdminOnly} 다.
 * 실질 소유권 판정은 서비스가 다시 한다(백엔드 헌법 제8조 — 계층 이중 검증).
 *
 * <p><b>왜 애노테이션을 명시했는가</b>: 처음에는 전역 {@code anyRequest().authenticated()} 에
 * 기대고 애노테이션을 생략했는데, {@code SecurityAuthAnnotationLinterTest} 가 이를 잡아냈다 —
 * "비-admin 경로 쓰기는 전역 규칙만 걸려 일반 사용자도 도달한다" 는 것이다. 컨트롤러에
 * 인증 경계를 명시하고 서비스에서 소유권을 재검증했다. 종전 클래스 단위 면제 방식은 2026-08-15
 * 폐지했으며, {@code @Authenticated} 는
 * {@code @PreAuthorize("isAuthenticated()")} 메타 애노테이션이라 <b>실제 가드가 하나 늘어난다.</b>
 */
@Tag(name = "Satisfaction", description = "게시글 만족도 API")
@RestController
@RequestMapping("/api/v1/boards/{bbsId}/posts/{pstSn}/satisfactions")
@RequiredArgsConstructor
public class SatisfactionApiController {

    private final SatisfactionService satisfactionService;
    private final BoardService boardService;

    /*
      [2026-09-05] 게시글 가시성 가드를 조회·등록 경로에 추가했다.

      ⚠ 종전에는 이 클래스의 javadoc 이 "실질 소유권 판정은 서비스가 다시 한다" 고 약속했지만,
        서비스가 실제로 하는 소유권 검사는 **수정·삭제 경로뿐**이었다. 조회 두 개와 등록은
        `useYn='Y'` 만 걸렀다. 그 결과 인증 사용자면 누구나 pstSn 을 순차 열거해 **비밀글의
        만족도 자유서술(dgstfnCn)과 평가자 이름(userNm)** 을 읽을 수 있었다 — RateLimitFilter
        기본 용량이 IP·분당 10,000 이라 열거는 레이트로도 억제되지 않는다.

        형제 자원인 댓글(`/api/v1/comments`, 같은 비-admin 경로)은 같은 (bbsId, pstSn) 으로
        `boardService.assertCommentAccess` 를 불러 활성 글 + 비밀글이면 owner-or-admin 을
        요구한다. 만족도만 그 검사를 빠뜨린 비대칭이었고, 의도라는 근거(DEC·주석·테스트)를
        찾지 못했다. 같은 헬퍼를 재사용해 두 자원의 인가 의미를 맞춘다.

        부작용: 활성 글 요구가 추가되므로 삭제·비활성 글의 만족도 조회는 이제 404 다.
        삭제된 글의 평가를 별도로 읽어야 할 경로가 없음을 확인했다.
    */

    @Operation(summary = "만족도 목록", description = "해당 게시글의 사용 중(use_yn='Y') 만족도만 반환한다.")
    @Authenticated
    @GetMapping
    public ResponseEntity<ApiResponse<List<SatisfactionDto>>> getList(
            @PathVariable String bbsId, @PathVariable Long pstSn) {
        boardService.assertCommentAccess(bbsId, pstSn);
        return ResponseEntity.ok(ApiResponse.success(satisfactionService.getSatisfactionList(bbsId, pstSn)));
    }

    @Operation(summary = "만족도 평균",
            description = "평가가 하나도 없으면 average 는 null 이다 — 0 과 구분해야 한다.")
    @Authenticated
    @GetMapping("/average")
    public ResponseEntity<ApiResponse<SatisfactionAverageResponse>> getAverage(
            @PathVariable String bbsId, @PathVariable Long pstSn) {
        // ⚠ null 을 0.0 으로 바꾸지 않는다. 종전에는 Map.of 가 null 값을 담지 못해 그럴 수밖에
        //   없었고, 그 결과 "아무도 평가하지 않음" 과 "모두 최하점" 이 화면에서 같아졌다.
        boardService.assertCommentAccess(bbsId, pstSn);
        Double average = satisfactionService.getAverageSatisfaction(bbsId, pstSn);
        return ResponseEntity.ok(ApiResponse.success(SatisfactionAverageResponse.of(average)));
    }

    @Operation(summary = "만족도 등록")
    @Authenticated
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> create(
            @PathVariable String bbsId, @PathVariable Long pstSn,
            @Valid @RequestBody SatisfactionDto dto) {
        // 경로를 정본으로 삼는다 — 본문이 다른 게시글을 가리켜도 경로가 이긴다.
        dto.setBbsId(bbsId);
        dto.setPstSn(pstSn);
        // 댓글 등록(CommentApiController:47)과 같은 자리에서 같은 검사를 한다 — 볼 수 없는 글에 평가를 남길 수 없다.
        boardService.assertCommentAccess(bbsId, pstSn);
        return ResponseEntity.ok(ApiResponse.success(satisfactionService.createSatisfaction(dto)));
    }

    @Operation(summary = "만족도 수정", description = "인증된 작성자 또는 관리자만 수정할 수 있다.")
    @Authenticated
    @PutMapping("/{dgstfnSn}")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable String bbsId, @PathVariable Long pstSn,
            @PathVariable Long dgstfnSn, @Valid @RequestBody SatisfactionDto dto) {
        dto.setDgstfnSn(dgstfnSn);
        satisfactionService.updateSatisfaction(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "만족도 삭제", description = "논리 삭제. 인증된 작성자 또는 관리자만 삭제할 수 있다.")
    @Authenticated
    @DeleteMapping("/{dgstfnSn}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String bbsId, @PathVariable Long pstSn,
            @PathVariable Long dgstfnSn) {
        satisfactionService.deleteSatisfaction(dgstfnSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "만족도 강제 삭제(관리자)",
            description = "비밀번호 없이 지운다. 욕설·스팸 정리를 위한 대리 삭제 경로다.")
    @AdminOnly
    @DeleteMapping("/{dgstfnSn}/moderate")
    public ResponseEntity<ApiResponse<Void>> moderate(
            @PathVariable String bbsId, @PathVariable Long pstSn, @PathVariable Long dgstfnSn) {
        satisfactionService.deleteByModerator(dgstfnSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
