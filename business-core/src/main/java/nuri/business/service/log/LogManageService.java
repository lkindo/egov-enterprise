package nuri.business.service.log;

import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.log.SysLog;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.service.log.dto.SysLogDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.business.domain.common.BaseSearchDto;
import org.jspecify.annotations.NonNull;

@Service
@Transactional(readOnly = true) // 조회 전용 — tb_sys_log 쓰기는 SystemErrorLogListener 가 맡는다
public class LogManageService extends BaseAbstractService {

    private final SysLogRepository sysLogRepository;

    public LogManageService(SysLogRepository sysLogRepository) {
        this.sysLogRepository = required(sysLogRepository, "SysLogRepository 는 null 일 수 없습니다");
    }

    public List<SysLogDto> selectSysLogList(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();
        Page<SysLog> page = sysLogRepository.searchSysLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(),
                required(pageable, "pageable 는 null 일 수 없습니다"));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    public int selectSysLogListTotCnt(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) sysLogRepository.searchSysLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(), pageable)
                .getTotalElements();
    }

    public SysLogDto selectSysLogDetail(@NonNull Long sysLogSn) {
        return sysLogRepository.findById(sysLogSn)
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.RESOURCE_NOT_FOUND, "시스템 로그를 찾을 수 없습니다: " + sysLogSn));
    }

    private SysLogDto toDto(SysLog entity) {
        return SysLogDto.builder()
                .sysLogSn(entity.getSysLogSn())
                .dmndId(entity.getDmndId())
                .srvcNm(entity.getSrvcNm())
                .methodNm(entity.getMthdNm())
                .prcsSeCd(entity.getPrcsSeCd())
                .prcsTm(entity.getPrcsTm() != null ? String.valueOf(entity.getPrcsTm()) : null)
                .dmndUserId(entity.getDmndUserId())
                .rqesterIp(entity.getDmndUserIpAddr())
                .ocrnYmd(entity.getOcrnYmd())
                // 실패 분류 3종 — 리스너가 쓰는 값이 화면까지 도달하게 한다(종전엔 dead write).
                .rspnsCd(entity.getRspnsCd())
                .errSeCd(entity.getErrSeCd())
                .errCd(entity.getErrCd())
                .build();
    }
}
