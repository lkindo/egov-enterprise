package com.company.project.service.system.monitoring;

import com.company.project.domain.system.monitoring.ServerResrceLog;
import com.company.project.domain.system.monitoring.ServerResrceLogRepository;
import com.company.project.service.system.monitoring.dto.ServerResrceLogDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ServerResrceMntrngService extends EgovAbstractServiceImpl {

    private final ServerResrceLogRepository serverResrceLogRepository;
    private final EgovIdGnrService egovServerResrceMntrngIdGnrService;

    @Transactional(readOnly = true)
    public Page<ServerResrceLogDto> getServerResrceLogList(String strServerNm, LocalDateTime startDt, LocalDateTime endDt, Pageable pageable) {
        Page<Object[]> page = serverResrceLogRepository.selectServerResrceMntrngList(strServerNm, startDt, endDt, pageable);
        return page.map(this::mapToDto);
    }

    @Transactional
    public void recordCurrentResource(String serverId, String serverEqpmnId, String userId) throws Exception {
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        
        // Simplified measurement for prototype. 
        // In real production, use com.sun.management.OperatingSystemMXBean for more accurate CPU/Memory RT.
        double cpuLoad = osBean.getSystemLoadAverage(); // Note: might be -1 on some Windows systems
        
        // Dummy values for demonstration if load avg is not available
        if (cpuLoad < 0) cpuLoad = Math.random() * 100;
        double memLoad = Math.random() * 100;

        String logId = egovServerResrceMntrngIdGnrService.getNextStringId();
        
        ServerResrceLog log = ServerResrceLog.builder()
                .logId(logId)
                .serverId(serverId)
                .serverEqpmnId(serverEqpmnId)
                .cpuUseRt(cpuLoad)
                .moryUseRt(memLoad)
                .svcSttus("01") // Normal
                .logInfo("System check performed at " + LocalDateTime.now())
                .creatDt(LocalDateTime.now())
                .frstRegisterId(userId)
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(userId)
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();
        
        serverResrceLogRepository.save(log);
    }

    private ServerResrceLogDto mapToDto(Object[] row) {
        return ServerResrceLogDto.builder()
                .serverId((String) row[0])
                .serverEqpmnId((String) row[1])
                .logId((String) row[2])
                .serverNm((String) row[3])
                .serverEqpmnIp((String) row[4])
                .cpuUseRt((Double) row[5])
                .moryUseRt((Double) row[6])
                .svcSttus((String) row[7])
                .svcSttusNm((String) row[8])
                .logInfo((String) row[9])
                .mngrEmailAddr((String) row[10])
                .creatDt((LocalDateTime) row[11])
                .frstRegisterPnttm((LocalDateTime) row[12])
                .frstRegisterId((String) row[13])
                .build();
    }
}
