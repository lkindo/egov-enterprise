package nuri.foundation.service.log;

import nuri.foundation.domain.log.SysLog;
import nuri.foundation.domain.log.SysLogRepository;
import nuri.foundation.service.log.dto.SysLogDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 濡쒓퉬??
 */
@Service("logManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LogManageService {

    private final SysLogRepository sysLogRepository;

    /**
     * 시스템 로그 등록 (비동기 수행)
     */
    @Async("logExecutor")
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
     * ??뒪濡쒓紐⑸議고??     */
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
     * ??뒪濡쒓紐⑸嫄댁??     */
    public int selectSysLogListTotCnt(ComDefaultVO searchVO) {
        return (int) sysLogRepository.searchSysLogs(
                searchVO.getSearchKeyword() != null ? searchVO.getSearchKeyword() : "",
                null,
                null,
                PageRequest.of(0, 1)).getTotalElements();
    }

    /**
     * ??뒪濡쒓???곸꽭 議고??     */
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
