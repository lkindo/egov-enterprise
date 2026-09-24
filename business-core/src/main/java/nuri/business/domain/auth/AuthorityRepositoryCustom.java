package nuri.business.domain.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;

public interface AuthorityRepositoryCustom {
    Page<Authority> searchAuthorities(String searchCondition, String searchKeyword, @NonNull Pageable pageable);
}
