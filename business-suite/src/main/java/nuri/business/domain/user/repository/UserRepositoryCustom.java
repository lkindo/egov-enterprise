package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepositoryCustom {
    Page<User> searchUsers(String sbscrbSttus, String searchCondition, String searchKeyword, Pageable pageable);

    Page<nuri.business.service.user.dto.UserDto> getPagedUserList(String searchKeyword, Pageable pageable);

    int checkIdDplct(String checkId);
}

