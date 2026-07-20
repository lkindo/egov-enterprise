package nuri.api.controller.business.smarttoolkit;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.deptjob.DeptJobBoxService;
import nuri.business.service.deptjob.DeptJobService;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.business.service.deptjob.dto.DeptJobDto;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import nuri.foundation.security.annotation.AdminOrSystem;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 부서 업무함 관리 API 컨트롤러
 */
@Tag(name = "DeptJob", description = "부서 업무함 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/dept-jobs")
@RequiredArgsConstructor
public class DeptJobApiController {

    private final DeptJobBoxService egovDeptJobBoxService;
    private final DeptJobService deptJobService;

    @Operation(summary = "부서 업무함 목록 조회", description = "부서 업무함 목록을 페이징하여 조회합니다.")
    @GetMapping("/boxes")
    public ResponseEntity<ApiResponse<PageResponse<DeptJobBoxDto>>> getDeptJobBoxList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "") String deptId,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<DeptJobBoxDto> pageResult;

        if (deptId != null && !deptId.isEmpty()) {
            pageResult = egovDeptJobBoxService.getDeptJobBoxListByDept(deptId, pageable);
        } else {
            pageResult = egovDeptJobBoxService.getDeptJobBoxList(searchWrd, pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "부서 업무함 상세 조회", description = "특정 부서 업무함의 상세 정보를 조회합니다.")
    @GetMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<ApiResponse<DeptJobBoxDto>> getDeptJobBox(@PathVariable String deptJobbxId) {
        DeptJobBoxDto dto = egovDeptJobBoxService.getDeptJobBox(deptJobbxId);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "부서 업무함 등록", description = "새로운 부서 업무함을 등록합니다.")
    @AdminOrSystem
    @PostMapping("/boxes")
    public ResponseEntity<ApiResponse<String>> createDeptJobBox(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody DeptJobBoxDto dto) {
        String userId = userDetails.getEsntlId();
        String newId = egovDeptJobBoxService.createDeptJobBox(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "부서 업무함 수정", description = "기존 부서 업무함 정보를 수정합니다.")
    @AdminOrSystem
    @PutMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<ApiResponse<Void>> updateDeptJobBox(
            @LoginUser CustomUserDetails userDetails,
            @PathVariable String deptJobbxId,
            @Valid @RequestBody DeptJobBoxDto dto) {
        String userId = userDetails.getEsntlId();
        egovDeptJobBoxService.updateDeptJobBox(deptJobbxId, userId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 업무함 삭제", description = "부서 업무함을 삭제합니다.")
    @AdminOrSystem
    @DeleteMapping("/boxes/{deptJobbxId}")
    public ResponseEntity<ApiResponse<Void>> deleteDeptJobBox(
            @LoginUser CustomUserDetails userDetails,
            @PathVariable String deptJobbxId) {
        egovDeptJobBoxService.deleteDeptJobBox(deptJobbxId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 부서 업무(DeptJob) — 업무'함'(box)과 별개 엔티티다.
    //
    // DeptJobService 에 CRUD 5본이 모두 구현돼 있었는데 컨트롤러에 노출된 적이 없었다.
    // 그 결과 프론트의 DeptJobUserService.createDeptJob 이 부르는 POST /api/v1/dept-jobs 가
    // 매핑 없는 경로였고, 업무 워크플로우 화면의 '업무 등록'이 어느 경로로도 동작하지 않았다.
    //
    // 인가: 업무 워크플로우 메뉴는 ROLE_USER 에게도 열려 있으므로 쓰기를 관리자로 제한하지 않는다.
    //   대신 수정·삭제는 서비스 계층에서 담당자(picId) 본인 또는 관리자만 가능하도록 검증한다(IDOR 방어).
    //   아래 @PreAuthorize("isAuthenticated()") 는 "로그인 여부"까지만 보는 1차 관문이고,
    //   실제 소유 판정은 DeptJobService.assertPicOrAdmin 이 한다(백엔드 헌법 제8조 이중 검증).
    //   업무'함'(위 /boxes)이 @AdminOrSystem 인 것과 대비된다 — 함은 부서 단위 구조물이고
    //   업무는 개인에게 배정되는 항목이라 인가 수준이 다르다.
    // ─────────────────────────────────────────────────────────────────────────

    @Operation(summary = "부서 업무 목록 조회",
            description = "부서 업무 목록을 페이징하여 조회합니다. 기본값은 '내가 담당자인 업무'이며, "
                    + "scope=dept 로 부서 전체를 조회할 수 있습니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DeptJobDto>>> getDeptJobList(
            @RequestParam(required = false) String deptId,
            @RequestParam(required = false) String deptJobbxId,
            @RequestParam(required = false) String searchCondition,
            // 파라미터명은 형제 엔드포인트(/boxes)와 동일하게 searchWrd 로 맞춘다.
            // 프론트 ApiService 가 만들어 보내는 이름과 어긋나면 검색이 조용히 무력화된다.
            @RequestParam(required = false) String searchWrd,
            // [소유 스코프] 'mine'(기본) = 내가 담당자인 업무만, 'dept' = 부서 전체.
            //   기본값을 mine 으로 두는 것이 이 파라미터의 핵심이다. 미지정 시 전체가 나오면
            //   토글을 달아도 실제 기본 노출은 전체라 스코프가 이름만 남는다.
            @RequestParam(defaultValue = "mine") String scope,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        // DeptJobService 는 searchCondition 이 "0"(업무명)/"1"(내용)/"2"(담당자) 중 하나일 때만
        // 검색 조건을 붙인다. null 이면 키워드를 받고도 아무 조건 없이 전체를 돌려준다 —
        // 사용자에겐 "검색이 먹지 않는" 것으로 보이므로, 조건 미지정 시 업무명 검색을 기본으로 둔다.
        String condition = (searchCondition == null || searchCondition.isBlank()) ? "0" : searchCondition;

        // 'dept' 만 전체 열람으로 해석하고 그 외(오타·미지정 포함)는 전부 '내 업무만'으로 닫는다.
        //   반대로("mine 일 때만 좁힌다") 쓰면 오타 한 글자가 조용히 전체 공개로 떨어진다.
        boolean mineOnly = !"dept".equalsIgnoreCase(scope);

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<DeptJobDto> pageResult = deptJobService.getDeptJobList(
                deptId, deptJobbxId, condition, searchWrd, mineOnly, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(pageResult)));
    }

    @Operation(summary = "부서 업무 상세 조회", description = "특정 부서 업무의 상세 정보를 조회합니다.")
    @GetMapping("/{deptTaskId}")
    public ResponseEntity<ApiResponse<DeptJobDto>> getDeptJob(@PathVariable String deptTaskId) {
        return ResponseEntity.ok(ApiResponse.success(deptJobService.getDeptJob(deptTaskId)));
    }

    @Operation(summary = "부서 업무 등록", description = "새로운 부서 업무를 등록합니다. 식별자는 서버가 채번합니다.")
    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createDeptJob(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody DeptJobDto dto) {
        String newId = deptJobService.createDeptJob(userDetails.getEsntlId(), dto);
        return ResponseEntity.ok(ApiResponse.success(newId));
    }

    @Operation(summary = "부서 업무 수정", description = "부서 업무를 수정합니다. 담당자 본인 또는 관리자만 가능합니다.")
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/{deptTaskId}")
    public ResponseEntity<ApiResponse<Void>> updateDeptJob(
            @PathVariable String deptTaskId,
            @Valid @RequestBody DeptJobDto dto) {
        deptJobService.updateDeptJob(deptTaskId, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "부서 업무 삭제", description = "부서 업무를 삭제합니다. 담당자 본인 또는 관리자만 가능합니다.")
    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/{deptTaskId}")
    public ResponseEntity<ApiResponse<Void>> deleteDeptJob(@PathVariable String deptTaskId) {
        deptJobService.deleteDeptJob(deptTaskId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
