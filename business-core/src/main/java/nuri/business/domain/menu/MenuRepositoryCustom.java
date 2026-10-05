package nuri.business.domain.menu;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MenuRepositoryCustom {
    Page<Menu> searchMenus(String searchKeyword, Pageable pageable);
}
