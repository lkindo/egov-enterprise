package nuri.business.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAuthorityRepository extends JpaRepository<UserAuthority, UserAuthorityId>, UserAuthorityRepositoryCustom {
}
