package nuri.business.service.login.dto;

import nuri.business.domain.common.BaseSearchDto;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginPolicyVO extends BaseSearchDto {
    // Extends BaseSearchDto which has searchCondition and searchKeyword
}
