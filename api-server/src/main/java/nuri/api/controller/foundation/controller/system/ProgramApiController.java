package nuri.api.controller.foundation.controller.system;

import jakarta.validation.Valid;
import nuri.business.domain.common.BaseSearchDto;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.program.ProgramService;
import nuri.business.service.program.dto.ProgramDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 프로그램 관리를 위한 REST 컨트롤러 (Admin)
 */
@Tag(name = "ProgramAdmin", description = "시스템 프로그램 관리 API (Admin)")
@RestController
@RequestMapping("/api/v1/admin/system/programs")
@RequiredArgsConstructor
public class ProgramApiController {

    private final ProgramService programService;

    @Operation(summary = "프로그램 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProgramDto>>> getProgramList(
            @Valid @ModelAttribute BaseSearchDto searchDto) throws Exception {

        List<ProgramDto> list = programService.selectProgrmList(searchDto);
        int total = programService.selectProgrmListTotCnt(searchDto);

        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), total)));
    }

    @Operation(summary = "프로그램 상세 조회")
    @GetMapping("/{progrmFileNm}")
    public ResponseEntity<ApiResponse<ProgramDto>> getProgram(@PathVariable String progrmFileNm) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(programService.selectProgrmById(progrmFileNm)));
    }

    @Operation(summary = "프로그램 등록")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createProgram(@Valid @RequestBody ProgramDto dto) throws Exception {
        programService.insertProgrm(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "프로그램 정보 수정")
    @PutMapping("/{progrmFileNm}")
    public ResponseEntity<ApiResponse<Void>> updateProgram(@PathVariable String progrmFileNm,
            @Valid @RequestBody ProgramDto dto) throws Exception {
        dto.setPrgrmFileNm(progrmFileNm);
        programService.updateProgrm(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "프로그램 삭제")
    @DeleteMapping("/{progrmFileNm}")
    public ResponseEntity<ApiResponse<Void>> deleteProgram(@PathVariable String progrmFileNm) throws Exception {
        ProgramDto dto = new ProgramDto();
        dto.setPrgrmFileNm(progrmFileNm);
        programService.deleteProgrm(dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
