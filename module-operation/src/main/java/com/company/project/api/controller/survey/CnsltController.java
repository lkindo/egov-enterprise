package com.company.project.api.controller.survey;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.consult.EgovCnsltService;
import com.company.project.service.consult.dto.CnsltManageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Consultation", description = "Consultation Management APIs")

@RestController

@RequestMapping("/api/v1/consultations")

@RequiredArgsConstructor

public class CnsltController {

    private final EgovCnsltService cnsltService;

@Operation(summary = "?                      ?         ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<CnsltManageDto>>> getConsultations(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(cnsltService.getCnsltList(keyword, pageable)));

    }

@Operation(summary = "?          ?                   ??")

    @GetMapping("/{cnsltId}")

    public ResponseEntity<ApiResponse<CnsltManageDto>> getConsultation(@PathVariable String cnsltId) {

        return ResponseEntity.ok(ApiResponse.success(cnsltService.getCnslt(cnsltId)));

    }

@Operation(summary = "?          ?         ")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertConsultation(@RequestBody CnsltManageDto dto) {

        cnsltService.insertCnslt(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "?          ??? ?         ")

    @PatchMapping("/{cnsltId}/answer")

    public ResponseEntity<ApiResponse<Void>> answerConsultation(

            @PathVariable String cnsltId,

            @RequestBody String answerCn) {

        cnsltService.answerCnslt(cnsltId, answerCn);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
