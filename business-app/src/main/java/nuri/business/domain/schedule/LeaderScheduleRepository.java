package nuri.business.domain.schedule;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LeaderScheduleRepository extends JpaRepository<LeaderSchedule, String> {
    default Page<LeaderSchedule> searchLeaderSchedules(String searchCondition, String searchKeyword, Pageable pageable) {
        return findAll(pageable);
    }
}
