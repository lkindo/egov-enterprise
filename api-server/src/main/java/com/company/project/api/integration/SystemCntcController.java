package com.company.project.api.integration;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.integration.SystemCntcService;
import com.company.project.service.integration.dto.SystemCntcDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * ?úÏä§???∞Í≥Ñ ?ïÎ≥¥Î•??ÑÌïú API Ïª®Ìä∏Î°§Îü¨
 */
@RestController
@RequestMapping("/ssi/syi/sim")
@RequiredArgsConstructor
public class SystemCntcController {

    private final SystemCntcService systemCntcService;

    /**
     * ?úÏä§???∞Í≥Ñ Î™©Î°ù Ï°∞Ìöå
     */
    @GetMapping("/getSystemCntcList")
    public ApiResponse<List<SystemCntcDto>> getSystemCntcList() {
        return ApiResponse.success(systemCntcService.selectSystemCntcList());
    }

    /**
     * ?úÏä§???∞Í≥Ñ ?ÅÏÑ∏ Ï°∞Ìöå
     */
    @GetMapping("/getSystemCntcDetail")
    public ApiResponse<SystemCntcDto> getSystemCntcDetail(@RequestParam("cntcId") String cntcId) {
        return ApiResponse.success(systemCntcService.selectSystemCntcDetail(cntcId));
    }

    /**
     * ?úÏä§???∞Í≥Ñ ?±Î°ù
     */
    @PostMapping("/insertSystemCntc")
    public ApiResponse<Void> insertSystemCntc(@RequestBody SystemCntcDto systemCntcDto) {
        systemCntcService.insertSystemCntc(systemCntcDto);
        return ApiResponse.success(null);
    }

    /**
     * ?úÏä§???∞Í≥Ñ ?πÏù∏
     */
    @PostMapping("/approveSystemCntc")
    public ApiResponse<Void> approveSystemCntc(@RequestParam("cntcId") String cntcId) {
        systemCntcService.approveSystemCntc(cntcId);
        return ApiResponse.success(null);
    }
}
