package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.monitoring.ProcessMonService;
import com.company.project.service.system.monitoring.dto.ProcessMonDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Process Monitoring", description = "Process Monitoring APIs")

@RestController

@RequestMapping("/api/v1/admin/system/process-monitoring")

@RequiredArgsConstructor

public class ProcessMonController {

    private final ProcessMonService processMonService;

@Operation(summary = "Get Process Monitor List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<ProcessMonDto>>> getProcessMonList(

            @RequestParam(required = false) String processNm,

            @RequestParam(required = false) String procsSttus,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(processMonService.getProcessMonList(processNm, procsSttus, pageable)));

    }

@Operation(summary = "Create Process Monitor")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createProcessMon(@RequestBody ProcessMonDto dto) {

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        processMonService.createProcessMon(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Check and Record Process Status")

    @PostMapping("/{processNm}/check")

    public ResponseEntity<ApiResponse<Void>> checkProcess(@PathVariable String processNm) throws Exception {

        processMonService.checkAndRecordProcess(processNm, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Process Monitor")

    @DeleteMapping("/{processNm}")

    public ResponseEntity<ApiResponse<Void>> deleteProcessMon(@PathVariable String processNm) {

        processMonService.deleteProcessMon(processNm);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
