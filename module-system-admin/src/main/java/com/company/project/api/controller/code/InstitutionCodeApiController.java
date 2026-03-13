package com.company.project.api.controller.code;

import com.company.project.service.code.InstitutionCodeService;
import com.company.project.service.code.dto.InstitutionCodeDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "Institution Code", description = "기관코드 관리 API")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/codes/institution")
@RequiredArgsConstructor
public class InstitutionCodeApiController {

    private final InstitutionCodeService institutionCodeService;

    @Operation(summary = "기관코드 목록 조회")
    @GetMapping
    public ResponseEntity<Map<String, Object>> getInstitutionCodeList(
            @RequestParam(defaultValue = "") String searchWrd,
            @RequestParam(defaultValue = "1") int pageIndex,
            @RequestParam(defaultValue = "10") int pageUnit) {

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);
        Page<InstitutionCodeDto> pageResult = institutionCodeService.getInstitutionCodeList(searchWrd, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("list", pageResult.getContent());
        response.put("totalCount", pageResult.getTotalElements());
        response.put("pageIndex", pageIndex);
        response.put("pageUnit", pageUnit);
        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "기관코드 상세 조회")
    @GetMapping("/{code}")
    public ResponseEntity<InstitutionCodeDto> getInstitutionCodeDetail(@PathVariable String code) {
        InstitutionCodeDto dto = institutionCodeService.getInstitutionCodeDetail(code);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }
}
