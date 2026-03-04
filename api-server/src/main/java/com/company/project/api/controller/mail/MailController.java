package com.company.project.api.controller.mail;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.mail.EgovMailService;

import com.company.project.service.mail.dto.SentMailDto;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Mail", description = "Email Management APIs")

@RestController

@RequestMapping("/api/v1/mails")

@RequiredArgsConstructor

public class MailController {

    private final EgovMailService mailService;

@Operation(summary = "         ??         ??            ?         ??", description = "         ???         ????  ?????                  ??         ???      ??")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<SentMailDto>>> getSentMails(

            @RequestParam(required = false) String searchCondition,

            @RequestParam(required = false) String searchKeyword,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(mailService.getSentMailList(searchCondition, searchKeyword, pageable)));

    }

@Operation(summary = "         ??         ???                   ??", description = "?     ??         ??         ????  ????          ??      ??         ???      ??")

    @GetMapping("/{mssageId}")

    public ResponseEntity<ApiResponse<SentMailDto>> getSentMail(

            @Parameter(description = "         ?      ? ID") @PathVariable String mssageId) {

        return ResponseEntity.ok(ApiResponse.success(mailService.getSentMail(mssageId)));

    }

@Operation(summary = "         ??         ??", description = "??      ??         ???         ???     ???  ??????        ??      .")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> sendMail(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody SentMailDto sentMailDto) {

        String mssageId = mailService.sendMail(userDetails.getUsername(), sentMailDto);

        return ResponseEntity.ok(ApiResponse.success(mssageId));

    }

@Operation(summary = "         ????  ??????", description = "         ??         ????  ????????      ??")

    @DeleteMapping("/{mssageId}")

    public ResponseEntity<ApiResponse<Void>> deleteMail(

            @PathVariable String mssageId) {

        mailService.deleteMail(mssageId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}