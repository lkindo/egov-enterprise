package com.company.project.api.integration;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.integration.SystemCntcService;
import com.company.project.service.integration.dto.SystemCntcDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * ?스???계 ?보??한 API 컨트롤러
 */
@RestController
@RequestMapping("/ssi/syi/sim")
@RequiredArgsConstructor
public class SystemCntcController {

    private final SystemCntcService systemCntcService;

    /**
     * ?스???계 목록 조회
     */
    @GetMapping("/getSystemCntcList")
    public ApiResponse<List<SystemCntcDto>> getSystemCntcList() {
        return ApiResponse.success(systemCntcService.selectSystemCntcList());
    }

    /**
     * ?스???계 ?세 조회
     */
    @GetMapping("/getSystemCntcDetail")
    public ApiResponse<SystemCntcDto> getSystemCntcDetail(@RequestParam("cntcId") String cntcId) {
        return ApiResponse.success(systemCntcService.selectSystemCntcDetail(cntcId));
    }

    /**
     * ?스???계 ?록
     */
    @PostMapping("/insertSystemCntc")
    public ApiResponse<Void> insertSystemCntc(@RequestBody SystemCntcDto systemCntcDto) {
        systemCntcService.insertSystemCntc(systemCntcDto);
        return ApiResponse.success(null);
    }

    /**
     * ?스???계 ?인
     */
    @PostMapping("/approveSystemCntc")
    public ApiResponse<Void> approveSystemCntc(@RequestParam("cntcId") String cntcId) {
        systemCntcService.approveSystemCntc(cntcId);
        return ApiResponse.success(null);
    }
}
