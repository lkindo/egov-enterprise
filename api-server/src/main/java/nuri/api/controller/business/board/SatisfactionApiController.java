package nuri.api.controller.business.board;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.SatisfactionService;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.annotation.AdminOnly;
import nuri.foundation.security.annotation.Authenticated;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 게시글 만족도 API.
 *
 * <p>[D-8 이행] {@link SatisfactionService} 는 11개 메서드가 완성돼 있었으나 <b>참조하는 클래스가
 * 단위 테스트뿐</b>이었다 — 컨트롤러가 없어 도메인 전체가 도달 불가였다.
 * D-1({@code UserLogRepositoryImpl})·D-4({@code SurveyRespondentService})에 이은 <b>세 번째 사례</b>다.
 *
 * <p><b>⚠ 배선 전에 서비스의 인가 결함 3건을 먼저 고쳤다</b>(같은 커밋) — 삭제·수정이 비밀번호를
 * 검사하지 않았고 비밀번호가 평문으로 저장됐다. 결함을 그대로 둔 채 노출했다면 ID만 알면
 * 누구나 남의 만족도를 지울 수 있는 엔드포인트가 됐다.
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
 * "비-admin 경로 쓰기는 전역 규칙만 걸려 일반 사용자도 도달한다" 는 것이다. 린터가 제시한 두
 * 해법(① 애노테이션 부착 ② {@code WRITE_AUTHZ_GUARDED_ELSEWHERE} 면제 등록) 중 <b>①</b>을 택했다.
 * 면제 목록을 늘리는 쪽은 신호를 지우는 방향이고(§0.7-H2), {@code @Authenticated} 는
 * {@code @PreAuthorize("isAuthenticated()")} 메타 애노테이션이라 <b>실제 가드가 하나 늘어난다.</b>
 */
@Tag(name = "Satisfaction", description = "게시글 만족도 API")
@RestController
@RequestMapping("/api/v1/boards/{bbsId}/posts/{pstSn}/satisfactions")
@RequiredArgsConstructor
public class SatisfactionApiController {

    private final SatisfactionService satisfactionService;

    @Operation(summary = "만족도 목록", description = "해당 게시글의 사용 중(use_yn='Y') 만족도만 반환한다.")
    @Authenticated
    @GetMapping
    public ResponseEntity<ApiResponse<List<SatisfactionDto>>> getList(
            @PathVariable String bbsId, @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.success(satisfactionService.getSatisfactionList(bbsId, pstSn)));
    }

    @Operation(summary = "만족도 평균", description = "응답이 없으면 null 이다 — 0 과 구분해야 한다.")
    @Authenticated
    @GetMapping("/average")
    public ResponseEntity<ApiResponse<Map<String, Double>>> getAverage(
            @PathVariable String bbsId, @PathVariable Long pstSn) {
        Double avg = satisfactionService.getAverageSatisfaction(bbsId, pstSn);
        return ResponseEntity.ok(ApiResponse.success(Map.of("average", avg == null ? 0.0 : avg)));
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
        return ResponseEntity.ok(ApiResponse.success(satisfactionService.createSatisfaction(currentUserId(), dto)));
    }

    @Operation(summary = "만족도 수정",
            description = "본문의 pswd 는 소유 증명용 자격이며 저장된 비밀번호를 바꾸지 않는다.")
    @Authenticated
    @PutMapping("/{dgstfnSn}")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable String bbsId, @PathVariable Long pstSn,
            @PathVariable Long dgstfnSn, @Valid @RequestBody SatisfactionDto dto) {
        dto.setDgstfnSn(dgstfnSn);
        satisfactionService.updateSatisfaction(currentUserId(), dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "만족도 삭제", description = "논리 삭제. 소유자 또는 익명 작성 비밀번호가 필요하다.")
    @Authenticated
    @DeleteMapping("/{dgstfnSn}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String bbsId, @PathVariable Long pstSn,
            @PathVariable Long dgstfnSn,
            @RequestParam(required = false) String pswd) {
        satisfactionService.deleteSatisfaction(dgstfnSn, currentUserId(), pswd);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "만족도 강제 삭제(관리자)",
            description = "비밀번호 없이 지운다. 욕설·스팸 정리를 위한 대리 삭제 경로다.")
    @AdminOnly
    @DeleteMapping("/{dgstfnSn}/moderate")
    public ResponseEntity<ApiResponse<Void>> moderate(
            @PathVariable String bbsId, @PathVariable Long pstSn, @PathVariable Long dgstfnSn) {
        satisfactionService.deleteByModerator(dgstfnSn, currentUserId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 서비스는 {@code null} 을 익명 작성으로 해석한다.
     *
     * <p><b>⚠ 이 배포에서 익명 경로는 현재 도달 불가다.</b> 전역 {@code anyRequest().authenticated()}
     * 와 위 {@code @Authenticated} 때문에 인증 없이는 여기까지 오지 않는다. 즉 {@code frstRgtrId} 가
     * 항상 채워지고 서비스의 비밀번호 분기는 실행되지 않는다. 그럼에도 비밀번호 경로를 남긴 이유는
     * {@code pswd} 컬럼과 DTO 필드가 실재하고, 익명 게시를 여는 순간 <b>그 경로가 유일한 소유 증명</b>이
     * 되기 때문이다 — 그때 가서 급히 만들면 지금 고친 결함(검증 없는 삭제)을 되풀이하기 쉽다.
     */
    private String currentUserId() {
        return SecurityUtil.getCurrentLoginId().orElse(null);
    }
}
