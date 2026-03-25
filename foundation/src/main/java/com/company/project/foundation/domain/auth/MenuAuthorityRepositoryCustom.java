package com.company.project.foundation.domain.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface MenuAuthorityRepositoryCustom {
    List<MenuAuthorityProjection> selectMenuCreatList(String authorCode);

    Page<MenuCreatManageProjection> selectMenuCreatManagList(String searchKeyword, Pageable pageable);
}
