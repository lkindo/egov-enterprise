package com.company.project.service.system.monitoring;

import com.company.project.domain.system.monitoring.ProcessMon;
import com.company.project.domain.system.monitoring.ProcessMonLog;
import com.company.project.domain.system.monitoring.ProcessMonLogRepository;
import com.company.project.domain.system.monitoring.ProcessMonRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.monitoring.dto.ProcessMonDto;

import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProcessMonService extends EgovAbstractServiceImpl {

    private final ProcessMonRepository processMonRepository;
    private final ProcessMonLogRepository processMonLogRepository;
    private final EgovCommonCodeService commonCodeService;
    private final EgovIdGnrService egovProcessMonLogIdGnrService;

    @Transactional(readOnly = true)
    public Page<ProcessMonDto> getProcessMonList(String processNm, String procsSttus, Pageable pageable) {
        Page<ProcessMon> page;
        if (processNm != null && procsSttus != null && !procsSttus.equals("00")) {
            page = processMonRepository.findByProcessNmContainingAndProcsSttus(processNm, procsSttus, pageable);
        } else if (processNm != null) {
            page = processMonRepository.findByProcessNmContaining(processNm, pageable);
        } else if (procsSttus != null && !procsSttus.equals("00")) {
            page = processMonRepository.findByProcsSttus(procsSttus, pageable);
        } else {
            page = processMonRepository.findAll(Objects.requireNonNull(pageable));
        }

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM072"); // Status codes
        Map<String, String> codeMap = codes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            ProcessMonDto dto = ProcessMonDto.from(entity);
            dto.setProcsSttusNm(codeMap.getOrDefault(dto.getProcsSttus(), ""));
            return dto;
        });
    }

    @Transactional
    public void checkAndRecordProcess(String processNm, String userId) throws Exception {
        ProcessMon entity = processMonRepository.findById(Objects.requireNonNull(processNm))
                .orElseThrow(() -> new RuntimeException("Process monitor not found"));

        boolean isRunning = ProcessHandle.allProcesses()
                .anyMatch(ph -> ph.info().command().map(c -> c.contains(processNm)).orElse(false));

        String sttus = isRunning ? "01" : "02"; // 01: Normal, 02: Abnormal
        entity.setProcsSttus(sttus);
        entity.setLastUpdusrId(userId);
        entity.setLastUpdtPnttm(LocalDateTime.now());

        String logId = egovProcessMonLogIdGnrService.getNextStringId();
        ProcessMonLog log = ProcessMonLog.builder()
                .logId(logId)
                .processNm(processNm)
                .procsSttus(sttus)
                .logInfo("Process check performed. Running: " + isRunning)
                .creatDt(LocalDateTime.now())
                .frstRegisterId(userId)
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(userId)
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();

        processMonLogRepository.save(Objects.requireNonNull(log));
    }

    @Transactional
    public void createProcessMon(ProcessMonDto dto) {
        ProcessMon entity = ProcessMon.builder()
                .processNm(dto.getProcessNm())
                .mngrNm(dto.getMngrNm())
                .mngrEmailAddr(dto.getMngrEmailAddr())
                .procsSttus("02") // Default to abnormal until checked
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        processMonRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void deleteProcessMon(String processNm) {
        processMonRepository.deleteById(Objects.requireNonNull(processNm));
    }
}
