package com.company.project.domain.commute;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommuteDomainRepository extends JpaRepository<Commute, String> {
    Optional<Commute> findByEmplyrIdAndWrktDt(String emplyrId, String wrktDt);

    List<Commute> findAllByEmplyrIdAndWrktDt(String emplyrId, String wrktDt);
}
