package com.company.project.service.system.monitoring;

import com.company.project.domain.system.monitoring.HttpMon;
import com.company.project.domain.system.monitoring.HttpMonLog;
import com.company.project.domain.system.monitoring.HttpMonLogRepository;
import com.company.project.domain.system.monitoring.HttpMonRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.system.monitoring.dto.HttpMonDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HttpMonService extends EgovAbstractServiceImpl {

    private final HttpMonRepository httpMonRepository;
    private final HttpMonLogRepository httpMonLogRepository;
    private final EgovCommonCodeService commonCodeService;
    private final EgovIdGnrService egovHttpMonLogIdGnrService;

    @Transactional(readOnly = true)
    public Page<HttpMonDto> getHttpMonList(String mngrNm, String httpSttusCd, Pageable pageable) {
        Page<HttpMon> page;
        if (httpSttusCd != null && !httpSttusCd.equals("00")) {
            page = httpMonRepository.findByHttpSttusCdAndDeleteAt(httpSttusCd, "N", pageable);
        } else {
            page = httpMonRepository.findByMngrNmContainingAndDeleteAt(mngrNm == null ? "" : mngrNm, "N", pageable);
        }

        List<CommonCodeDto> codes = commonCodeService.getCodesByGroup("COM072"); // Status codes
        Map<String, String> codeMap = codes.stream()
                .collect(Collectors.toMap(CommonCodeDto::code, CommonCodeDto::codeNm));

        return page.map(entity -> {
            HttpMonDto dto = HttpMonDto.from(entity);
            dto.setHttpSttusNm(codeMap.getOrDefault(dto.getHttpSttusCd(), ""));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public HttpMonDto getHttpMon(String sysId) {
        HttpMon entity = httpMonRepository.findById(Objects.requireNonNull(sysId))
                .orElseThrow(() -> new RuntimeException("HTTP monitor not found"));
        return HttpMonDto.from(Objects.requireNonNull(entity));
    }

    @Transactional
    public void createHttpMon(HttpMonDto dto) {
        HttpMon entity = HttpMon.builder()
                .sysId(dto.getSysId())
                .webKind(dto.getWebKind())
                .siteUrl(dto.getSiteUrl())
                .httpSttusCd("02") // Default to abnormal
                .mngrNm(dto.getMngrNm())
                .mngrEmailAddr(dto.getMngrEmailAddr())
                .deleteAt("N")
                .creatDt(LocalDateTime.now())
                .frstRegisterId(dto.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(dto.getLastUpdusrId())
                .lastUpdtPnttm(LocalDateTime.now())
                .build();
        httpMonRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateHttpMon(HttpMonDto dto) {
        HttpMon entity = httpMonRepository.findById(Objects.requireNonNull(dto.getSysId()))
                .orElseThrow(() -> new RuntimeException("HTTP monitor not found"));

        entity.setWebKind(dto.getWebKind());
        entity.setSiteUrl(dto.getSiteUrl());
        entity.setMngrNm(dto.getMngrNm());
        entity.setMngrEmailAddr(dto.getMngrEmailAddr());
        entity.setLastUpdusrId(dto.getLastUpdusrId());
        entity.setLastUpdtPnttm(LocalDateTime.now());
    }

    @Transactional
    public void deleteHttpMon(String sysId) {
        HttpMon entity = httpMonRepository.findById(Objects.requireNonNull(sysId))
                .orElseThrow(() -> new RuntimeException("HTTP monitor not found"));
        entity.setDeleteAt("Y");
    }

    @Transactional
    public void checkAndRecordHttpStatus(String sysId, String userId) throws Exception {
        HttpMon entity = httpMonRepository.findById(Objects.requireNonNull(sysId))
                .orElseThrow(() -> new RuntimeException("HTTP monitor not found"));

        String sttus = "02"; // Abnormal
        String logInfo = "";

        try {
            URL url = java.net.URI.create(entity.getSiteUrl()).toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            int responseCode = conn.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                sttus = "01"; // Normal
                logInfo = "HTTP check successful. Response code: 200";
            } else {
                logInfo = "HTTP check failed. Response code: " + responseCode;
            }
        } catch (Exception e) {
            logInfo = "HTTP check failed: " + e.getMessage();
        }

        entity.setHttpSttusCd(sttus);
        entity.setCreatDt(LocalDateTime.now());
        entity.setLastUpdusrId(userId);
        entity.setLastUpdtPnttm(LocalDateTime.now());

        String logId = egovHttpMonLogIdGnrService.getNextStringId();
        HttpMonLog log = HttpMonLog.builder()
                .logId(logId)
                .sysId(sysId)
                .webKind(entity.getWebKind())
                .siteUrl(entity.getSiteUrl())
                .httpSttusCd(sttus)
                .logInfo(logInfo)
                .mngrNm(entity.getMngrNm())
                .mngrEmailAddr(entity.getMngrEmailAddr())
                .creatDt(LocalDateTime.now())
                .frstRegisterId(userId)
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(userId)
                .lastUpdtPnttm(LocalDateTime.now())
                .build();

        httpMonLogRepository.save(Objects.requireNonNull(log));
    }
}