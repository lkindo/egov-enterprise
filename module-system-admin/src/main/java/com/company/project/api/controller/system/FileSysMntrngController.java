package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.monitoring.FileSysMntrngService;
import com.company.project.service.system.monitoring.dto.FileSysMntrngDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "File System Monitoring", description = "File System Usage Monitoring APIs")

@RestController

@RequestMapping("/api/v1/admin/system/filesys-monitoring")

@RequiredArgsConstructor

public class FileSysMntrngController {

    private final FileSysMntrngService fileSysMntrngService;

@Operation(summary = "Get File System Monitor List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<FileSysMntrngDto>>> getFileSysMntrngList(

            @RequestParam(required = false) String fileSysNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(fileSysMntrngService.getFileSysMntrngList(fileSysNm, pageable)));

    }

@Operation(summary = "Create File System Monitor")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createFileSysMntrng(@RequestBody FileSysMntrngDto dto) {

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        fileSysMntrngService.createFileSysMntrng(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Check and Record File System Status")

    @PostMapping("/{fileSysId}/check")

    public ResponseEntity<ApiResponse<Void>> checkFileSysStatus(@PathVariable String fileSysId) throws Exception {

        fileSysMntrngService.checkAndRecordFileSysStatus(fileSysId, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete File System Monitor")

    @DeleteMapping("/{fileSysId}")

    public ResponseEntity<ApiResponse<Void>> deleteFileSysMntrng(@PathVariable String fileSysId) {

        fileSysMntrngService.deleteFileSysMntrng(fileSysId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
