package com.company.project.domain.calendar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RestdeRepository extends JpaRepository<Restde, Integer> {

    List<Restde> findByRestdeDeStartingWith(String yearMonth);

    List<Restde> findByRestdeDeBetween(String startDate, String endDate);
}
