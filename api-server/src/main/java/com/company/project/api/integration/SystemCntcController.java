package com.company.project.api.integration;

import com.company.project.core.response.ApiResponse;

import com.company.project.domain.integration.SystemCntc;

import com.company.project.service.integration.SystemCntcService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

/**

 * ??      ???        ??     ??API ?      ?      ?      

 */

@RestController

@RequestMapping("/ssi/syi/sim")

@RequiredArgsConstructor

public class SystemCntcController {

    private final SystemCntcService systemCntcService;

    /**

     * ??      ???        ?            ?         ??

     */

    @GetMapping("/getSystemCntcList")

    public ApiResponse<List<SystemCntc>> getSystemCntcList() {

        return ApiResponse.success(systemCntcService.selectSystemCntcList());

    }

    /**

     * ??      ???        ??                   ??

     */

    @GetMapping("/getSystemCntcDetail")

    public ApiResponse<SystemCntc> getSystemCntcDetail(@RequestParam("cntcId") String cntcId) {

        return ApiResponse.success(systemCntcService.selectSystemCntcDetail(cntcId));

    }

    /**

     * ??      ???        ??         

     */

    @PostMapping("/insertSystemCntc")

    public ApiResponse<Void> insertSystemCntc(@RequestBody SystemCntc systemCntc) {

        systemCntcService.insertSystemCntc(systemCntc);

        return ApiResponse.success(null);

    }

    /**

     * ??      ???        ??     ??

     */

    @PostMapping("/approveSystemCntc")

    public ApiResponse<Void> approveSystemCntc(@RequestParam("cntcId") String cntcId) {

        systemCntcService.approveSystemCntc(cntcId);

        return ApiResponse.success(null);

    }

}

