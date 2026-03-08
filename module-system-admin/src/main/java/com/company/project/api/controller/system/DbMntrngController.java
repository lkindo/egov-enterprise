package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.monitoring.DbMntrngService;
import com.company.project.service.system.monitoring.dto.DbMntrngDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "DB Monitoring", description = "Database Status Monitoring APIs")

@RestController

@RequestMapping("/api/v1/admin/system/db-monitoring")

@RequiredArgsConstructor

public class DbMntrngController {

    private final DbMntrngService dbMntrngService;

@Operation(summary = "Get DB Monitor List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<DbMntrngDto>>> getDbMntrngList(

            @RequestParam(required = false) String dataSourcNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(dbMntrngService.getDbMntrngList(dataSourcNm, pageable)));

    }

@Operation(summary = "Create DB Monitor")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> createDbMntrng(@RequestBody DbMntrngDto dto) {

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        dbMntrngService.createDbMntrng(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Check and Record DB Status")

    @PostMapping("/{dataSourcNm}/check")

    public ResponseEntity<ApiResponse<Void>> checkDbStatus(@PathVariable String dataSourcNm) throws Exception {

        dbMntrngService.checkAndRecordDbStatus(dataSourcNm, "ADMIN");

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete DB Monitor")

    @DeleteMapping("/{dataSourcNm}")

    public ResponseEntity<ApiResponse<Void>> deleteDbMntrng(@PathVariable String dataSourcNm) {

        dbMntrngService.deleteDbMntrng(dataSourcNm);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}
