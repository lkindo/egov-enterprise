package nuri.foundation.domain.login;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginPolicyRepository extends JpaRepository<LoginPolicy, String>, LoginPolicyRepositoryCustom {
}
