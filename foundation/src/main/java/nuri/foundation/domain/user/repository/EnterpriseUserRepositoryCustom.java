package nuri.foundation.domain.user.repository;

import nuri.foundation.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EnterpriseUserRepositoryCustom {
    Page<EnterpriseUser> searchEnterpriseUsers(String sbscrbSttus, String searchCondition, String searchKeyword,
            Pageable pageable);
}
