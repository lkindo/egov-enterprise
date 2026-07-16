package nuri.business.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MenuAuthorityRepository
        extends JpaRepository<MenuAuthority, MenuAuthority.MenuAuthorityId>, MenuAuthorityRepositoryCustom {
    void deleteByIdAuthrtCd(String authrtCd);

    List<MenuAuthority> findByIdAuthrtCd(String authrtCd);

    // [V2_12 결속] 메뉴 삭제 시 메뉴-권한 매핑 선정리 (fk_tb_menu_crt_dtl_tb_menu_info NO ACTION)
    void deleteByIdMenuSn(Long menuSn);

    void deleteByIdMenuSnIn(List<Long> menuSns);
}
