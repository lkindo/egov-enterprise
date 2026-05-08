package nuri.business.domain.schedule;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 간부상태 Repository
 */
public interface LeaderStatusRepository extends JpaRepository<LeaderStatus, String> {
}
