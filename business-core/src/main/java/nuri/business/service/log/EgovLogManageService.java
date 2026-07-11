package nuri.business.service.log;

import nuri.business.service.log.dto.SysLogDto;
import nuri.business.domain.common.BaseSearchDto;
import java.util.List;

public interface EgovLogManageService {
    void logInsertSysLog(SysLogDto dto);
    List<SysLogDto> selectSysLogList(BaseSearchDto searchVO);
    int selectSysLogListTotCnt(BaseSearchDto searchVO);
    SysLogDto selectSysLogDetail(SysLogDto dto);
}
