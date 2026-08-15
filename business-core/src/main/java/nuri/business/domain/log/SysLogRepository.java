package nuri.business.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SysLogRepository extends JpaRepository<SysLog, Long>, SysLogRepositoryCustom {
}
