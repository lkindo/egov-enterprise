package nuri.business.domain.menu;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 메뉴 즐겨찾기(2026-09-26 DIP B5 F2). 사용자 축은 esntlId 다. */
public interface BkmkMenuRepository extends JpaRepository<BkmkMenu, BkmkMenu.BkmkMenuId> {

    List<BkmkMenu> findByIdUserIdOrderByCrtDtAsc(String userId);

    long countByIdUserId(String userId);
}
