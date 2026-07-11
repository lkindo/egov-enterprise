package nuri.business.domain.calendar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RestdeRepository extends JpaRepository<Restde, Integer>, RestdeRepositoryCustom {
}
