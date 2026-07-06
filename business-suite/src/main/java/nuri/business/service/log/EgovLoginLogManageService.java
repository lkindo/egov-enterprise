package nuri.business.service.log;

import nuri.business.service.log.dto.LoginLogDto;
import nuri.business.domain.common.BaseSearchDto;
import java.util.List;

public interface EgovLoginLogManageService {
    void logInsertLoginLog(LoginLogDto dto);
    List<LoginLogDto> selectLoginLogList(BaseSearchDto searchVO);
    int selectLoginLogListTotCnt(BaseSearchDto searchVO);
    LoginLogDto selectLoginLogDetail(LoginLogDto dto);
}
