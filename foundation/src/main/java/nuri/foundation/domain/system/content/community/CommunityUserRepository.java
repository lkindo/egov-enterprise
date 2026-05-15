package nuri.foundation.domain.system.content.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import java.util.List;

public interface CommunityUserRepository
        extends JpaRepository<CommunityUser, CommunityUserId>, QuerydslPredicateExecutor<CommunityUser> {
    List<CommunityUser> findByIdCmntyId(String cmntyId);
}
