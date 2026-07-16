package nuri.business.domain.menu;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface MenuRepositoryCustom {
    Page<Menu> searchMenus(String searchKeyword, Pageable pageable);

    List<MenuProjection> selectMainMenuHead(String uniqId);

    List<MenuProjection> selectMainMenuLeft(String uniqId);
}
