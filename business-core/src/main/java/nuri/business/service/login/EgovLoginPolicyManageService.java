package nuri.business.service.login;

import nuri.business.service.login.dto.LoginPolicyDto;
import nuri.business.domain.common.BaseSearchDto;
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
