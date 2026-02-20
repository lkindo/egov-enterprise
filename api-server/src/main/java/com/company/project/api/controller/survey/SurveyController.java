package com.company.project.api.controller.survey;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.survey.EgovSurveyService;

import com.company.project.service.survey.dto.QestnrInfoDto;

import com.company.project.service.survey.dto.QestnrTmplatDto;

import com.company.project.service.survey.dto.QustnrIemDto;

import com.company.project.service.survey.dto.QustnrQesitmDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Survey", description = "Survey and Questionnaire Management APIs")

@RestController

@RequestMapping("/api/v1/surveys")

@RequiredArgsConstructor

public class SurveyController {

    private final EgovSurveyService surveyService;

    // --- Templates ---

@Operation(summary = "??   ???      ??            ?         ??")

    @GetMapping("/templates")

    public ResponseEntity<ApiResponse<Page<QestnrTmplatDto>>> getTemplates(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(surveyService.getTmplatList(keyword, pageable)));

    }

@Operation(summary = "??   ???      ???                   ??")

    @GetMapping("/templates/{tmplatId}")

    public ResponseEntity<ApiResponse<QestnrTmplatDto>> getTemplate(@PathVariable String tmplatId) {

        return ResponseEntity.ok(ApiResponse.success(surveyService.getTmplat(tmplatId)));

    }

@Operation(summary = "??   ???      ???         ")

    @PostMapping("/templates")

    public ResponseEntity<ApiResponse<Void>> insertTemplate(@RequestBody QestnrTmplatDto dto) {

        surveyService.insertTmplat(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- Survey Info ---

@Operation(summary = "??   ?            ?         ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<QestnrInfoDto>>> getSurveys(

            @RequestParam(required = false) String keyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(surveyService.getSurveyList(keyword, pageable)));

    }

@Operation(summary = "??   ??                   ??")

    @GetMapping("/{qestnrId}")

    public ResponseEntity<ApiResponse<QestnrInfoDto>> getSurvey(@PathVariable String qestnrId) {

        return ResponseEntity.ok(ApiResponse.success(surveyService.getSurvey(qestnrId)));

    }

@Operation(summary = "??   ??         ")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> insertSurvey(@RequestBody QestnrInfoDto dto) {

        surveyService.insertSurvey(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

    // --- Questions & Items ---

@Operation(summary = "??   ??         ?            ?         ??")

    @GetMapping("/{qestnrId}/questions")

    public ResponseEntity<ApiResponse<List<QustnrQesitmDto>>> getQuestions(@PathVariable String qestnrId) {

        return ResponseEntity.ok(ApiResponse.success(surveyService.getQuestionList(qestnrId)));

    }

@Operation(summary = "??   ??         ??         ")

    @PostMapping("/{qestnrId}/questions")

    public ResponseEntity<ApiResponse<Void>> insertQuestion(@PathVariable String qestnrId, @RequestBody QustnrQesitmDto dto) {

        dto.setQestnrId(qestnrId);

        surveyService.insertQuestion(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "??   ??????         ")

    @PostMapping("/questions/{qesitmId}/items")

    public ResponseEntity<ApiResponse<Void>> insertItem(@PathVariable String qesitmId, @RequestBody QustnrIemDto dto) {

        dto.setQestnrQesitmId(qesitmId);

        surveyService.insertItem(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

