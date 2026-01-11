package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MtgPlaceResveRepository extends JpaRepository<MtgPlaceResve, String> {
    List<MtgPlaceResve> findByMtgrumIdAndResveDe(String mtgrumId, String resveDe);
}
