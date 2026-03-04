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
import java.util.Objects;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TroblService extends EgovAbstractServiceImpl {

    private final TroblRepository troblRepository;
    private final EgovCommonCodeService commonCodeService;

    @Transactional(readOnly = true)
    public Page<TroblDto> getTroblList(String strTroblNm, String strTroblKnd, String strProcessSttus,
            Pageable pageable) {
        List<String> statuses = (strProcessSttus != null && !strProcessSttus.equals("00"))
                ? Collections.singletonList(strProcessSttus)
                : null;
        Page<Trobl> page = troblRepository.searchTroblReqsts(strTroblNm, strTroblKnd, statuses, pageable);
        return mapToDtoPage(page);
    }

    @Transactional(readOnly = true)
    public Page<TroblDto> getTroblProcessList(String strTroblNm, String strTroblKnd, String strProcessSttus,
            Pageable pageable) {
        List<String> statuses;
        if (strProcessSttus != null && !strProcessSttus.equals("00")) {
            statuses = Collections.singletonList(strProcessSttus);
        } else {
            statuses = Arrays.asList("R", "C");
        }
        Page<Trobl> page = troblRepository.searchTroblReqsts(strTroblNm, strTroblKnd, statuses, pageable);
        return mapToDtoPage(page);
    }

    @Transactional(readOnly = true)
    public TroblDto getTrobl(String troblId) {
        Trobl entity = troblRepository.findById(Objects.requireNonNull(troblId))
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
                .build();

        entity.setFrstRegisterId(dto.getFrstRegisterId());
        entity.setFrstRegisterPnttm(LocalDateTime.now());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdusrPnttm(LocalDateTime.now());
        troblRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateTrobl(TroblDto dto) {
        Trobl entity = troblRepository.findById(Objects.requireNonNull(dto.getTroblId()))
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
        Trobl entity = troblRepository.findById(Objects.requireNonNull(troblId))
                .orElseThrow(() -> new RuntimeException("Trobl not found"));
        entity.setProcessSttus("R"); // Status: Requested
        entity.setTroblRequstTime(
                LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        entity.setLastUpdusrId(userId);
        entity.setLastUpdusrPnttm(LocalDateTime.now());
    }

    @Transactional
    public void processTrobl(TroblDto dto) {
        Trobl entity = troblRepository.findById(Objects.requireNonNull(dto.getTroblId()))
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
        troblRepository.deleteById(Objects.requireNonNull(troblId));
    }

    private Page<TroblDto> mapToDtoPage(Page<Trobl> page) {
        List<CommonCodeDto> kndCodes = commonCodeService.getCodesByGroup("COM065");
        Map<String, String> kndMap = kndCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        List<CommonCodeDto> sttusCodes = commonCodeService.getCodesByGroup("COM068");
        Map<String, String> sttusMap = sttusCodes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            TroblDto dto = TroblDto.from(entity);
            dto.setTroblKndNm(kndMap.getOrDefault(dto.getTroblKnd(), ""));
            dto.setProcessSttusNm(sttusMap.getOrDefault(dto.getProcessSttus(), ""));
            return dto;
        });
    }
}