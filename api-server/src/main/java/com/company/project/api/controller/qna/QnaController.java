package com.company.project.api.controller.qna;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.qna.EgovQnaService;

import com.company.project.service.qna.dto.QnaDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Qna", description = "Q&A Management APIs")

@RestController

@RequestMapping("/api/v1/qnas")

@RequiredArgsConstructor

public class QnaController {

    private final EgovQnaService qnaService;

@Operation(summary = "Q&A             ?         ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<QnaDto>>> getQnas(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(qnaService.getQnaList(keyword, pageable)));

    }

@Operation(summary = "Q&A ?                   ??")

    @GetMapping("/{qaId}")

    public ResponseEntity<ApiResponse<QnaDto>> getQna(

            @Parameter(description = "Q&A ID") @PathVariable String qaId) {

        return ResponseEntity.ok(ApiResponse.success(qnaService.getQna(qaId)));

    }

@Operation(summary = "Q&A              ?         ")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> insertQna(@RequestBody QnaDto dto) {

        String id = qnaService.createQna("ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Q&A              ??      ")

    @PutMapping("/{qaId}")

    public ResponseEntity<ApiResponse<Void>> updateQna(

            @PathVariable String qaId,

            @RequestBody QnaDto dto) {

        qnaService.updateQna(qaId, "ADMIN", dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Q&A ??? ?         ")

    @PatchMapping("/{qaId}/answer")

    public ResponseEntity<ApiResponse<Void>> answerQna(

            @PathVariable String qaId,

            @RequestBody String answerCn) {

        qnaService.updateAnswer(qaId, "ADMIN", answerCn);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Q&A ????")

    @DeleteMapping("/{qaId}")

    public ResponseEntity<ApiResponse<Void>> deleteQna(

            @PathVariable String qaId) {

        qnaService.deleteQna(qaId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}