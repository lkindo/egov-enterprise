package com.company.project.service.system.monitoring;

import com.company.project.domain.system.monitoring.NtwrkSvcMntrng;
import com.company.project.domain.system.monitoring.NtwrkSvcMntrngId;
import com.company.project.domain.system.monitoring.NtwrkSvcMntrngLog;
import com.company.project.domain.system.monitoring.NtwrkSvcMntrngLogRepository;
import com.company.project.domain.system.monitoring.NtwrkSvcMntrngRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.monitoring.dto.NtwrkSvcMntrngDto;
import com.company.project.service.system.monitoring.dto.NtwrkSvcMntrngLogDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NtwrkSvcMntrngService extends EgovAbstractServiceImpl {

    private final NtwrkSvcMntrngRepository ntwrkSvcMntrngRepository;
    private final NtwrkSvcMntrngLogRepository ntwrkSvcMntrngLogRepository;
    private final EgovCommonCodeService commonCodeService;
    private final EgovIdGnrService egovNtwrkSvcMntrngLogIdGnrService;

    @Transactional(readOnly = true)
    public Page<NtwrkSvcMntrngDto> getNtwrkSvcMntrngList(String sysNm, Pageable pageable) {
        Page<NtwrkSvcMntrng> page = ntwrkSvcMntrngRepository.findBySysNmContaining(sysNm == null ? "" : sysNm, pageable);

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM046"); // Status codes
        Map<String, String> codeMap = codes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            NtwrkSvcMntrngDto dto = NtwrkSvcMntrngDto.from(entity);
            dto.setMntrngSttusNm(codeMap.getOrDefault(dto.getMntrngSttus(), ""));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public NtwrkSvcMntrngDto getNtwrkSvcMntrng(String sysIp, Integer sysPort) {
        NtwrkSvcMntrng entity = ntwrkSvcMntrngRepository.findById(new NtwrkSvcMntrngId(sysIp, sysPort))
                .orElseThrow(() -> new RuntimeException("Network service monitor not found"));
        return NtwrkSvcMntrngDto.from(entity);
    }

    @Transactional
    public void createNtwrkSvcMntrng(NtwrkSvcMntrngDto dto) {
        NtwrkSvcMntrng entity = NtwrkSvcMntrng.builder()
                .sysIp(dto.getSysIp())
                .sysPort(dto.getSysPort())
                .sysNm(dto.getSysNm())
                .mngrNm(dto.getMngrNm())
                .mngrEmailAddr(dto.getMngrEmailAddr())
                .mntrngSttus("02") // Default to abnormal
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        ntwrkSvcMntrngRepository.save(entity);
    }

    @Transactional
    public void updateNtwrkSvcMntrng(NtwrkSvcMntrngDto dto) {
        NtwrkSvcMntrng entity = ntwrkSvcMntrngRepository.findById(new NtwrkSvcMntrngId(dto.getSysIp(), dto.getSysPort()))
                .orElseThrow(() -> new RuntimeException("Network service monitor not found"));

        entity.setSysNm(dto.getSysNm());
        entity.setMngrNm(dto.getMngrNm());
        entity.setMngrEmailAddr(dto.getMngrEmailAddr());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdtPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteNtwrkSvcMntrng(String sysIp, Integer sysPort) {
        ntwrkSvcMntrngRepository.deleteById(new NtwrkSvcMntrngId(sysIp, sysPort));
    }

    @Transactional
    public void checkAndRecordNtwrkSvcStatus(String sysIp, Integer sysPort, String userId) throws Exception {
        NtwrkSvcMntrng entity = ntwrkSvcMntrngRepository.findById(new NtwrkSvcMntrngId(sysIp, sysPort))
                .orElseThrow(() -> new RuntimeException("Network service monitor not found"));

        String sttus = "02"; // Abnormal
        String logInfo = "";

        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(sysIp, sysPort), 5000);
            sttus = "01"; // Normal
            logInfo = "Socket connection successful to " + sysIp + ":" + sysPort;
        } catch (Exception e) {
            logInfo = "Socket connection failed: " + e.getMessage();
        }

        entity.setMntrngSttus(sttus);
        entity.setCreatDt(LocalDateTime.now());
        entity.setLastUpdusrId(userId);
        entity.setLastUpdtPnttm(LocalDateTime.now());

        String logId = egovNtwrkSvcMntrngLogIdGnrService.getNextStringId();
        NtwrkSvcMntrngLog log = NtwrkSvcMntrngLog.builder()
                .logId(logId)
                .sysIp(sysIp)
                .sysPort(sysPort)
                .sysNm(entity.getSysNm())
                .mntrngSttus(sttus)
                .logInfo(logInfo)
                .creatDt(LocalDateTime.now())
                .frstRegisterId(userId)
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(userId)
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        
        ntwrkSvcMntrngLogRepository.save(log);
    }
}
