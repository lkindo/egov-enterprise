package com.company.project.api.controller.faq;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.faq.EgovFaqService;

import com.company.project.service.faq.dto.FaqDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Faq", description = "FAQ Management APIs")

@RestController

@RequestMapping("/api/v1/faqs")

@RequiredArgsConstructor

public class FaqController {

    private final EgovFaqService faqService;

@Operation(summary = "FAQ             ?         ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<FaqDto>>> getFaqs(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(faqService.getFaqList(keyword, pageable)));

    }

@Operation(summary = "FAQ ?                   ??")

    @GetMapping("/{faqId}")

    public ResponseEntity<ApiResponse<FaqDto>> getFaq(

            @Parameter(description = "FAQ ID") @PathVariable String faqId) {

        return ResponseEntity.ok(ApiResponse.success(faqService.getFaq(faqId)));

    }

@Operation(summary = "FAQ ?         ")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> insertFaq(@RequestBody FaqDto dto) {

        String id = faqService.createFaq("ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "FAQ ??      ")

    @PutMapping("/{faqId}")

    public ResponseEntity<ApiResponse<Void>> updateFaq(

            @PathVariable String faqId,

            @RequestBody FaqDto dto) {

        faqService.updateFaq(faqId, "ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "FAQ ????")

    @DeleteMapping("/{faqId}")

    public ResponseEntity<ApiResponse<Void>> deleteFaq(

            @PathVariable String faqId) {

        faqService.deleteFaq(faqId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}