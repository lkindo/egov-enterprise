package com.company.project.api.template;

import com.company.project.core.response.ApiResponse;

import com.company.project.domain.template.TmplatInfo;

import com.company.project.service.template.TmplatInfoService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

/**

 * ??      ???     ??API ?      ?      ?      

 */

@RestController

@RequestMapping("/cop/tpl")

@RequiredArgsConstructor

public class TmplatInfoController {

    private final TmplatInfoService tmplatInfoService;

    @GetMapping("/selectTmplatInfoList")

    public ApiResponse<List<TmplatInfo>> selectTmplatInfoList() {

        return ApiResponse.success(tmplatInfoService.selectTmplatInfoList());

    }

    @GetMapping("/selectTmplatInfoDetail")

    public ApiResponse<TmplatInfo> selectTmplatInfoDetail(@RequestParam("tmplatId") String tmplatId) {

        return ApiResponse.success(tmplatInfoService.selectTmplatInfoDetail(tmplatId));

    }

    @PostMapping("/insertTmplatInfo")

    public ApiResponse<Void> insertTmplatInfo(@RequestBody TmplatInfo tmplatInfo) {

        tmplatInfoService.insertTmplatInfo(tmplatInfo);

        return ApiResponse.success(null);

    }

}

