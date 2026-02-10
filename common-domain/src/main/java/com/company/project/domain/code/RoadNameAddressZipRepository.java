package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import com.company.project.domain.code.RoadNameAddressZipCode.RoadNameAddressZipId;

public interface RoadNameAddressZipRepository extends JpaRepository<RoadNameAddressZipCode, RoadNameAddressZipId> {
}
