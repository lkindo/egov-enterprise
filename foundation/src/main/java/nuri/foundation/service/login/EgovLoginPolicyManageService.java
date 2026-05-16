package nuri.foundation.service.login;

import nuri.foundation.service.login.dto.LoginPolicyDto;
import nuri.foundation.domain.common.BaseSearchDto;
import java.util.List;

public interface EgovLoginPolicyManageService {
    List<LoginPolicyDto> selectLoginPolicyList(BaseSearchDto searchVO);
    int selectLoginPolicyListTotCnt(BaseSearchDto searchVO);
    LoginPolicyDto selectLoginPolicy(String userId);
    void insertLoginPolicy(LoginPolicyDto dto);
    void updateLoginPolicy(LoginPolicyDto dto);
    void deleteLoginPolicy(LoginPolicyDto dto);
    void validateLoginPolicy(String userId, String clientIp);
}
