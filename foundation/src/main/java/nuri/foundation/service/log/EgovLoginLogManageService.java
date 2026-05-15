package nuri.foundation.service.log;

import nuri.foundation.service.log.dto.LoginLogDto;
import nuri.foundation.domain.common.BaseSearchDto;
import java.util.List;

public interface EgovLoginLogManageService {
    void logInsertLoginLog(LoginLogDto dto);
    List<LoginLogDto> selectLoginLogList(BaseSearchDto searchVO);
    int selectLoginLogListTotCnt(BaseSearchDto searchVO);
    LoginLogDto selectLoginLogDetail(LoginLogDto dto);
}
