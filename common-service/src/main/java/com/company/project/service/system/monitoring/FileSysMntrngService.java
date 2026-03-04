package com.company.project.service.system.monitoring;

import com.company.project.domain.system.monitoring.FileSysMntrng;
import com.company.project.domain.system.monitoring.FileSysMntrngLog;
import com.company.project.domain.system.monitoring.FileSysMntrngLogRepository;
import com.company.project.domain.system.monitoring.FileSysMntrngRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.monitoring.dto.FileSysMntrngDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FileSysMntrngService extends EgovAbstractServiceImpl {

    private final FileSysMntrngRepository fileSysMntrngRepository;
    private final FileSysMntrngLogRepository fileSysMntrngLogRepository;
    private final EgovCommonCodeService commonCodeService;
    private final EgovIdGnrService egovFileSysMntrngLogIdGnrService;

    @Transactional(readOnly = true)
    public Page<FileSysMntrngDto> getFileSysMntrngList(String fileSysNm, Pageable pageable) {
        Page<FileSysMntrng> page = fileSysMntrngRepository.findByFileSysNmContaining(fileSysNm == null ? "" : fileSysNm,
                pageable);

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM046"); // Status codes
        Map<String, String> codeMap = codes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            FileSysMntrngDto dto = FileSysMntrngDto.from(entity);
            dto.setMntrngSttusNm(codeMap.getOrDefault(dto.getMntrngSttus(), ""));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public FileSysMntrngDto getFileSysMntrng(String fileSysId) {
        FileSysMntrng entity = fileSysMntrngRepository.findById(Objects.requireNonNull(fileSysId))
                .orElseThrow(() -> new RuntimeException("File system monitor not found"));
        return FileSysMntrngDto.from(entity);
    }

    @Transactional
    public void createFileSysMntrng(FileSysMntrngDto dto) {
        FileSysMntrng entity = FileSysMntrng.builder()
                .fileSysId(dto.getFileSysId())
                .fileSysNm(dto.getFileSysNm())
                .fileSysManageNm(dto.getFileSysManageNm())
                .fileSysMg(dto.getFileSysMg())
                .fileSysThrhld(dto.getFileSysThrhld())
                .mngrNm(dto.getMngrNm())
                .mngrEmailAddr(dto.getMngrEmailAddr())
                .mntrngSttus("02") // Default to abnormal
                .creatDt(LocalDateTime.now())
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        fileSysMntrngRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateFileSysMntrng(FileSysMntrngDto dto) {
        FileSysMntrng entity = fileSysMntrngRepository.findById(Objects.requireNonNull(dto.getFileSysId()))
                .orElseThrow(() -> new RuntimeException("File system monitor not found"));

        entity.setFileSysNm(dto.getFileSysNm());
        entity.setFileSysManageNm(dto.getFileSysManageNm());
        entity.setFileSysMg(dto.getFileSysMg());
        entity.setFileSysThrhld(dto.getFileSysThrhld());
        entity.setMngrNm(dto.getMngrNm());
        entity.setMngrEmailAddr(dto.getMngrEmailAddr());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdtPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteFileSysMntrng(String fileSysId) {
        fileSysMntrngRepository.deleteById(Objects.requireNonNull(fileSysId));
    }

    @Transactional
    public void checkAndRecordFileSysStatus(String fileSysId, String userId) throws Exception {
        FileSysMntrng entity = fileSysMntrngRepository.findById(Objects.requireNonNull(fileSysId))
                .orElseThrow(() -> new RuntimeException("File system monitor not found"));

        File file = new File(entity.getFileSysNm());
        long totalSpace = file.getTotalSpace();
        long freeSpace = file.getFreeSpace();
        long usableSpace = totalSpace - freeSpace;

        String sttus = "01"; // Normal
        if (usableSpace > entity.getFileSysThrhld()) {
            sttus = "02"; // Abnormal (Exceeds threshold)
        }

        entity.setFileSysMg(totalSpace);
        entity.setFileSysUsgQty(usableSpace);
        entity.setMntrngSttus(sttus);
        entity.setCreatDt(LocalDateTime.now());
        entity.setLastUpdusrId(userId);
        entity.setLastUpdtPnttm(LocalDateTime.now());

        String logId = egovFileSysMntrngLogIdGnrService.getNextStringId();
        FileSysMntrngLog log = FileSysMntrngLog.builder()
                .logId(logId)
                .fileSysId(fileSysId)
                .fileSysNm(entity.getFileSysNm())
                .fileSysManageNm(entity.getFileSysManageNm())
                .fileSysMg(totalSpace)
                .fileSysThrhld(entity.getFileSysThrhld())
                .fileSysUsgQty(usableSpace)
                .mntrngSttus(sttus)
                .logInfo("Check performed. Usage: " + usableSpace + " bytes / Total: " + totalSpace + " bytes")
                .creatDt(LocalDateTime.now())
                .frstRegisterId(userId)
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(userId)
                .lastUpdtPnttm(LocalDateTime.now())
                .build();

        fileSysMntrngLogRepository.save(Objects.requireNonNull(log));
    }
}
