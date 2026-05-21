package nuri.foundation.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MenuAuthorityRepository
        extends JpaRepository<MenuAuthority, MenuAuthority.MenuAuthorityId>, MenuAuthorityRepositoryCustom {
    void deleteByIdAuthrtCd(String authrtCd);

    List<MenuAuthority> findByIdAuthrtCd(String authrtCd);
}
