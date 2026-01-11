package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationInfRepository extends JpaRepository<NotificationInf, Long> {

    @Query("SELECT n FROM NotificationInf n WHERE n.ntcnTm BETWEEN :start AND :end ORDER BY n.ntcnTm ASC")
    List<NotificationInf> findByNtcnTmBetween(@Param("start") String start, @Param("end") String end);
}
