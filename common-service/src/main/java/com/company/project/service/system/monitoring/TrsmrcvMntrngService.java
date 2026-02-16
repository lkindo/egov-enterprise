package com.company.project.service.system.monitoring;

import com.company.project.domain.system.monitoring.TrsmrcvMntrng;
import com.company.project.domain.system.monitoring.TrsmrcvMntrngLog;
import com.company.project.domain.system.monitoring.TrsmrcvMntrngLogRepository;
import com.company.project.domain.system.monitoring.TrsmrcvMntrngRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.monitoring.dto.TrsmrcvMntrngDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrsmrcvMntrngService extends EgovAbstractServiceImpl {

    private final TrsmrcvMntrngRepository trsmrcvMntrngRepository;
    private final TrsmrcvMntrngLogRepository trsmrcvMntrngLogRepository;
    private final EgovCommonCodeService commonCodeService;
    private final EgovIdGnrService egovTrsmrcvMntrngLogIdGnrService;

    @Transactional(readOnly = true)
    public Page<TrsmrcvMntrngDto> getTrsmrcvMntrngList(String mngrNm, Pageable pageable) {
        Page<TrsmrcvMntrng> page = trsmrcvMntrngRepository.findByMngrNmContaining(mngrNm == null ? "" : mngrNm,
                pageable);

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM046"); // Status codes
        Map<String, String> codeMap = codes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            TrsmrcvMntrngDto dto = TrsmrcvMntrngDto.from(entity);
            dto.setMntrngSttusNm(codeMap.getOrDefault(dto.getMntrngSttus(), ""));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public TrsmrcvMntrngDto getTrsmrcvMntrng(String cntcId) {
        TrsmrcvMntrng entity = trsmrcvMntrngRepository.findById(cntcId)
                .orElseThrow(() -> new RuntimeException("Transmission monitoring not found"));
        return TrsmrcvMntrngDto.from(entity);
    }

    @Transactional
    public void createTrsmrcvMntrng(TrsmrcvMntrngDto dto) {
        TrsmrcvMntrng entity = TrsmrcvMntrng.builder()
                .cntcId(dto.getCntcId())
                .testClassNm(dto.getTestClassNm())
                .mngrNm(dto.getMngrNm())
                .mngrEmailAddr(dto.getMngrEmailAddr())
                .mntrngSttus("02") // Default to abnormal
                .creatDt(LocalDateTime.now())
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        trsmrcvMntrngRepository.save(entity);
    }

    @Transactional
    public void updateTrsmrcvMntrng(TrsmrcvMntrngDto dto) {
        TrsmrcvMntrng entity = trsmrcvMntrngRepository.findById(dto.getCntcId())
                .orElseThrow(() -> new RuntimeException("Transmission monitoring not found"));

        entity.setTestClassNm(dto.getTestClassNm());
        entity.setMngrNm(dto.getMngrNm());
        entity.setMngrEmailAddr(dto.getMngrEmailAddr());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdtPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteTrsmrcvMntrng(String cntcId) {
        trsmrcvMntrngRepository.deleteById(cntcId);
    }

    @Transactional
    public void checkAndRecordTrsmrcvStatus(String cntcId, String userId) throws Exception {
        TrsmrcvMntrng entity = trsmrcvMntrngRepository.findById(cntcId)
                .orElseThrow(() -> new RuntimeException("Transmission monitoring not found"));

        String sttus = "02"; // Abnormal
        String logInfo = "";

        // Simple check logic: Try to load the test class as a proof of concept
        try {
            Class.forName(entity.getTestClassNm());
            sttus = "01"; // Normal
            logInfo = "Test class " + entity.getTestClassNm() + " loaded successfully";
        } catch (Exception e) {
            logInfo = "Test class load failed: " + e.getMessage();
        }

        entity.setMntrngSttus(sttus);
        entity.setCreatDt(LocalDateTime.now());
        entity.setLastUpdusrId(userId);
        entity.setLastUpdtPnttm(LocalDateTime.now());

        String logId = egovTrsmrcvMntrngLogIdGnrService.getNextStringId();
        TrsmrcvMntrngLog log = TrsmrcvMntrngLog.builder()
                .logId(logId)
                .cntcId(cntcId)
                .testClassNm(entity.getTestClassNm())
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .mntrngSttus(sttus)
                .logInfo(logInfo)
                .creatDt(LocalDateTime.now())
                .frstRegisterId(userId)
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(userId)
                .lastUpdtPnttm(LocalDateTime.now())
                .build();

        trsmrcvMntrngLogRepository.save(log);
    }
}
