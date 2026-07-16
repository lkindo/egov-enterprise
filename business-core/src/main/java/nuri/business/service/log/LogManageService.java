package nuri.business.service.log;

import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.log.SysLog;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.service.log.dto.SysLogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.business.domain.common.BaseSearchDto;
import org.springframework.lang.NonNull;

@Service("egovLogManageService")
public class LogManageService extends BaseAbstractService implements EgovLogManageService {

    private final SysLogRepository sysLogRepository;

    public LogManageService(SysLogRepository sysLogRepository) {
        this.sysLogRepository = required(sysLogRepository, "SysLogRepository 는 null 일 수 없습니다");
    }

    @Override
    @Transactional
    public void logInsertSysLog(@NonNull SysLogDto dto) {
        SysLog entity = SysLog.builder()
                .dmndId(dto.getDmndId())
                .srvcNm(dto.getSrvcNm())
                .mthdNm(dto.getMethodNm())
                .prcsSeCd(dto.getPrcsSeCd())
                .prcsTm(dto.getPrcsTm())
                .dmndUserId(dto.getDmndUserId())
                .dmndUserIpAddr(dto.getRqesterIp())
                .ocrnYmd(dto.getOcrnYmd())
                .build();
        sysLogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    public List<SysLogDto> selectSysLogList(@NonNull BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<SysLog> page = sysLogRepository.searchSysLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(),
                required(pageable, "pageable 는 null 일 수 없습니다"));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public int selectSysLogListTotCnt(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) sysLogRepository.searchSysLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(), pageable)
                .getTotalElements();
    }

    @Override
    public SysLogDto selectSysLogDetail(@NonNull SysLogDto dto) {
        return sysLogRepository.findById(required(dto.getDmndId(), "dto.getDmndId() 는 null 일 수 없습니다"))
                .map(this::toDto)
                .orElse(null);
    }

    private SysLogDto toDto(SysLog entity) {
        return SysLogDto.builder()
                .dmndId(entity.getDmndId())
                .srvcNm(entity.getSrvcNm())
                .methodNm(entity.getMthdNm())
                .prcsSeCd(entity.getPrcsSeCd())
                .prcsTm(entity.getPrcsTm())
                .dmndUserId(entity.getDmndUserId())
                .rqesterIp(entity.getDmndUserIpAddr())
                .ocrnYmd(entity.getOcrnYmd())
                .build();
    }
}
