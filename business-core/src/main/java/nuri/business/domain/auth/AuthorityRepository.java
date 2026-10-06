package nuri.business.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.jspecify.annotations.NonNull;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

public interface AuthorityRepository extends JpaRepository<Authority, String>, AuthorityRepositoryCustom {

    @Override
    @NonNull
    Optional<Authority> findById(@NonNull String authrtCd);

    @Override
    @Transactional
    void deleteById(@NonNull String authrtCd);

}
