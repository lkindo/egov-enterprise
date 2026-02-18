package com.company.project.service.log;

import com.company.project.domain.log.SysLog;
import com.company.project.domain.log.SysLogRepository;
import com.company.project.service.log.dto.SysLogDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 로그 관리 서비스
 */
@Service("logManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LogManageService {

    private final SysLogRepository sysLogRepository;

    /**
     * 시스템 로그 등록
     */
    @Transactional
    public void insertSysLog(SysLogDto dto) {
        SysLog entity = SysLog.builder()
                .requstId(dto.getRequstId())
                .srvcNm(dto.getSrvcNm())
                .methodNm(dto.getMethodNm())
                .processSeCode(dto.getProcessSeCode())
                .processTime(dto.getProcessTime())
                .rqesterId(dto.getRqesterId())
                .rqesterIp(dto.getRqesterIp())
                .occrrncDe(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")))
                .build();
        sysLogRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * 시스템 로그 목록 조회
     */
    public List<SysLogDto> selectSysLogList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<SysLog> page = sysLogRepository.searchSysLogs(
                searchVO.getSearchKeyword() != null ? searchVO.getSearchKeyword() : "",
                null, // Start date
                null, // End date
                pageable);
        return page.getContent().stream().map(this::toSysLogDto).collect(Collectors.toList());
    }

    /**
     * 시스템 로그 목록 총 건수
     */
    public int selectSysLogListTotCnt(ComDefaultVO searchVO) {
        return (int) sysLogRepository.searchSysLogs(
                searchVO.getSearchKeyword() != null ? searchVO.getSearchKeyword() : "",
                null,
                null,
                PageRequest.of(0, 1)).getTotalElements();
    }

    /**
     * 시스템 로그 상세 조회
     */
    public SysLogDto selectSysLog(String requstId) {
        return sysLogRepository.findById(Objects.requireNonNull(requstId))
                .map(this::toSysLogDto)
                .orElse(null);
    }

    private SysLogDto toSysLogDto(SysLog entity) {
        return SysLogDto.builder()
                .requstId(entity.getRequstId())
                .srvcNm(entity.getSrvcNm())
                .methodNm(entity.getMethodNm())
                .processSeCode(entity.getProcessSeCode())
                .processTime(entity.getProcessTime())
                .rqesterId(entity.getRqesterId())
                .rqesterIp(entity.getRqesterIp())
                .occrrncDe(entity.getOccrrncDe())
                .build();
    }
}
