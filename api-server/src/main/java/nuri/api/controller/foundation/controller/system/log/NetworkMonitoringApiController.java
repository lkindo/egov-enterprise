package nuri.api.controller.foundation.controller.system.log;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Tag(name = "NetworkMonitoring", description = "네트워크 서비스 모니터링 API (Admin)")
@RestController("networkMonitoringApiController")
@RequestMapping("/api/v1/admin/system/ntwrksvc-monitoring")
@RequiredArgsConstructor
public class NetworkMonitoringApiController {

    @Data
    @Builder
    public static class NetworkStatusDetailedDto {
        private String sysNm;
        private String sysIp;
        private String sysPort;
        private String svcSttus;
        private String logDt;
    }

    @Operation(summary = "네트워크 서비스 상태 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NetworkStatusDetailedDto>>> getStatus(
            @ModelAttribute BaseSearchDto searchDto) {
        
        List<NetworkStatusDetailedDto> list = new ArrayList<>();
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        
        // Mock data for topology map based on frontend expectations
        list.add(NetworkStatusDetailedDto.builder()
                .sysNm("Cloud Front / LB").sysIp("10.0.0.1").sysPort("443").svcSttus("UP").logDt(now).build());
        list.add(NetworkStatusDetailedDto.builder()
                .sysNm("API Server Node A").sysIp("10.0.1.11").sysPort("8080").svcSttus("UP").logDt(now).build());
        list.add(NetworkStatusDetailedDto.builder()
                .sysNm("API Server Node B").sysIp("10.0.1.12").sysPort("8080").svcSttus("WARNING").logDt(now).build());
        list.add(NetworkStatusDetailedDto.builder()
                .sysNm("PostgreSQL Primary").sysIp("10.0.2.21").sysPort("5432").svcSttus("UP").logDt(now).build());
        list.add(NetworkStatusDetailedDto.builder()
                .sysNm("Redis Cache Fabric").sysIp("10.0.2.31").sysPort("6379").svcSttus("UP").logDt(now).build());
        list.add(NetworkStatusDetailedDto.builder()
                .sysNm("External Auth API").sysIp("10.0.3.41").sysPort("443").svcSttus("UP").logDt(now).build());

        int totCnt = list.size();
        
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), totCnt)));
    }
}
