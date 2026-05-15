package nuri.foundation.service.log;

import nuri.foundation.service.log.dto.SysLogDto;
import nuri.foundation.domain.common.BaseSearchDto;
import java.util.List;

public interface EgovLogManageService {
    void logInsertSysLog(SysLogDto dto);
    List<SysLogDto> selectSysLogList(BaseSearchDto searchVO);
    int selectSysLogListTotCnt(BaseSearchDto searchVO);
    SysLogDto selectSysLogDetail(SysLogDto dto);
}
