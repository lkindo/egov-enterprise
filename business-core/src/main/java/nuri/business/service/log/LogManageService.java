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
import org.springframework.lang.NonNull;

@Service
@Transactional(readOnly = true) // 조회 기본 read-only; 쓰기(logInsertSysLog)는 메서드 @Transactional 이 오버라이드
public class LogManageService extends BaseAbstractService {

    private final SysLogRepository sysLogRepository;

    public LogManageService(SysLogRepository sysLogRepository) {
        this.sysLogRepository = required(sysLogRepository, "SysLogRepository 는 null 일 수 없습니다");
    }

    @Transactional
    public void logInsertSysLog(@NonNull SysLogDto dto) {
        SysLog entity = SysLog.builder()
                .dmndId(dto.getDmndId())
                .srvcNm(dto.getSrvcNm())
                .mthdNm(dto.getMethodNm())
                .prcsSeCd(dto.getPrcsSeCd())
                .prcsTm(parsePrcsTm(dto.getPrcsTm()))
                .dmndUserId(dto.getDmndUserId())
                .dmndUserIpAddr(dto.getRqesterIp())
                .ocrnYmd(dto.getOcrnYmd())
                .build();
        sysLogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    /**
     * [V2_16] DTO(API 계약: String 유지) ↔ 엔티티(bigint 통일) 경계 변환.
     * 처리 소요시간(ms) — 비숫자 입력은 로그 유틸 특성상 무음 null 처리(로깅 실패가 본 요청을 파손하지 않도록).
     */
    private static Long parsePrcsTm(String prcsTm) {
        if (prcsTm == null || prcsTm.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(prcsTm.trim());
        } catch (NumberFormatException e) {
            return null;
        }
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
                .build();
    }
}
