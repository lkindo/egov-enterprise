package com.company.project.service.trouble;

import com.company.project.domain.trouble.Trobl;
import com.company.project.domain.trouble.TroblRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.trouble.dto.TroblDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
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
public class TroblService extends EgovAbstractServiceImpl {

    private final TroblRepository troblRepository;
    private final EgovCommonCodeService commonCodeService;

    @Transactional(readOnly = true)
    public Page<TroblDto> getTroblList(String strTroblNm, String strTroblKnd, String strProcessSttus, Pageable pageable) {
        Page<Object[]> page = troblRepository.selectTroblList(strTroblNm, strTroblKnd, strProcessSttus, pageable);
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public Page<TroblDto> getTroblProcessList(String strTroblNm, String strTroblKnd, String strProcessSttus, Pageable pageable) {
        Page<Object[]> page = troblRepository.selectTroblProcessList(strTroblNm, strTroblKnd, strProcessSttus, pageable);
        return page.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public TroblDto getTrobl(String troblId) {
        Trobl entity = troblRepository.findById(troblId)
                .orElseThrow(() -> new RuntimeException("Trobl not found: " + troblId));
        
        TroblDto dto = TroblDto.from(entity);
        
        List<CommonCodeDto> kndCodes = commonCodeService.getCodesByGroup("COM065");
        dto.setTroblKndNm(kndCodes.stream()
                .filter(c -> c.code().equals(dto.getTroblKnd()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));

        List<CommonCodeDto> sttusCodes = commonCodeService.getCodesByGroup("COM068");
        dto.setProcessSttusNm(sttusCodes.stream()
                .filter(c -> c.code().equals(dto.getProcessSttus()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));
                
        return dto;
    }

    @Transactional
    public void createTrobl(TroblDto dto) {
        Trobl entity = Trobl.builder()
                .troblId(dto.getTroblId())
                .troblNm(dto.getTroblNm())
                .troblKnd(dto.getTroblKnd())
                .troblDc(dto.getTroblDc())
                .troblOccrrncTime(dto.getTroblOccrrncTime())
                .troblRqesterNm(dto.getTroblRqesterNm())
                .processSttus("A") // Initial status: Applied
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();
        troblRepository.save(entity);
    }

    @Transactional
    public void updateTrobl(TroblDto dto) {
        Trobl entity = troblRepository.findById(dto.getTroblId())
                .orElseThrow(() -> new RuntimeException("Trobl not found"));
        
        entity.setTroblNm(dto.getTroblNm());
        entity.setTroblKnd(dto.getTroblKnd());
        entity.setTroblDc(dto.getTroblDc());
        entity.setTroblOccrrncTime(dto.getTroblOccrrncTime());
        entity.setTroblRqesterNm(dto.getTroblRqesterNm());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
    }

    @Transactional
    public void requestTrobl(String troblId, String userId) {
        Trobl entity = troblRepository.findById(troblId)
                .orElseThrow(() -> new RuntimeException("Trobl not found"));
        entity.setProcessSttus("R"); // Status: Requested
        entity.setTroblRequstTime(LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        entity.setLastUpdusrId(userId);
        entity.setLastUpdusrPnttm(LocalDateTime.now());
    }

    @Transactional
    public void processTrobl(TroblDto dto) {
        Trobl entity = troblRepository.findById(dto.getTroblId())
                .orElseThrow(() -> new RuntimeException("Trobl not found"));
        
        entity.setTroblProcessResult(dto.getTroblProcessResult());
        entity.setTroblOpetrNm(dto.getTroblOpetrNm());
        entity.setTroblProcessTime(dto.getTroblProcessTime());
        entity.setProcessSttus("C"); // Status: Completed
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteTrobl(String troblId) {
        troblRepository.deleteById(troblId);
    }

    private TroblDto mapToDto(Object[] row) {
        return TroblDto.builder()
                .troblId((String) row[0])
                .troblNm((String) row[1])
                .troblKnd((String) row[2])
                .troblKndNm((String) row[3])
                .troblDc((String) row[4])
                .troblOccrrncTime((String) row[5])
                .troblRqesterNm((String) row[6])
                .troblRequstTime((String) row[7])
                .troblProcessResult((String) row[8])
                .troblOpetrNm((String) row[9])
                .troblProcessTime((String) row[10])
                .processSttus((String) row[11])
                .processSttusNm((String) row[12])
                .frstRegisterPnttm((LocalDateTime) row[13])
                .frstRegisterId((String) row[14])
                .lastUpdusrPnttm((LocalDateTime) row[15])
                .lastUpdusrId((String) row[16])
                .build();
    }
}
