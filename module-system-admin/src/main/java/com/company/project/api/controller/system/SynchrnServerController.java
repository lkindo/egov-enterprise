package com.company.project.api.controller.system;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.system.SynchrnServerService;
import com.company.project.service.system.dto.SynchrnServerDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Sync Server", description = "Server Synchronization Management APIs")

@RestController

@RequestMapping("/api/v1/admin/system/sync-servers")

@RequiredArgsConstructor

public class SynchrnServerController {

    private final SynchrnServerService synchrnServerService;

    private final EgovIdGnrService egovSynchrnServerIdGnrService;

@Operation(summary = "Get Sync Server List")

    @GetMapping

    public ResponseEntity<ApiResponse<Page<SynchrnServerDto>>> getSynchrnServerList(

            @RequestParam(required = false) String serverNm,

            Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(synchrnServerService.getSynchrnServerList(serverNm, pageable)));

    }

@Operation(summary = "Get Sync Server Detail")

    @GetMapping("/{serverId}")

    public ResponseEntity<ApiResponse<SynchrnServerDto>> getSynchrnServer(@PathVariable String serverId) {

        return ResponseEntity.ok(ApiResponse.success(synchrnServerService.getSynchrnServer(serverId)));

    }

@Operation(summary = "Create Sync Server")

    @PostMapping

    public ResponseEntity<ApiResponse<String>> createSynchrnServer(@RequestBody SynchrnServerDto dto) throws Exception {

        String id = egovSynchrnServerIdGnrService.getNextStringId();

        dto.setServerId(id);

        dto.setFrstRegisterId("ADMIN");

        dto.setLastUpdusrId("ADMIN");

        synchrnServerService.createSynchrnServer(dto);

        return ResponseEntity.ok(ApiResponse.success(id));

    }

@Operation(summary = "Update Sync Server")

    @PutMapping("/{serverId}")

    public ResponseEntity<ApiResponse<Void>> updateSynchrnServer(@PathVariable String serverId, @RequestBody SynchrnServerDto dto) {

        dto.setServerId(serverId);

        dto.setLastUpdusrId("ADMIN");

        synchrnServerService.updateSynchrnServer(dto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Delete Sync Server")

    @DeleteMapping("/{serverId}")

    public ResponseEntity<ApiResponse<Void>> deleteSynchrnServer(@PathVariable String serverId) {

        synchrnServerService.deleteSynchrnServer(serverId);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "Get FTP File List from Sync Server")

    @GetMapping("/{serverId}/files")

    public ResponseEntity<ApiResponse<List<String>>> getFtpFileList(@PathVariable String serverId) throws Exception {

        return ResponseEntity.ok(ApiResponse.success(synchrnServerService.getFtpFileList(serverId)));

    }

}
