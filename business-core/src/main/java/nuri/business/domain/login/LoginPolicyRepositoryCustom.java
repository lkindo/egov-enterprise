package nuri.business.domain.login;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LoginPolicyRepositoryCustom {
    Page<LoginPolicySearchResult> searchLoginPolicies(String searchKeyword, Pageable pageable);
}
