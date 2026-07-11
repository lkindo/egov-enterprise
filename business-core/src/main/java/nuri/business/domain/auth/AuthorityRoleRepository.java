package nuri.business.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuthorityRoleRepository
        extends JpaRepository<AuthorityRole, AuthorityRole.AuthorityRoleId>, AuthorityRoleRepositoryCustom {
    void deleteByIdAuthrtCd(String authrtCd);

    List<AuthorityRole> findByIdAuthrtCd(String authrtCd);
}
