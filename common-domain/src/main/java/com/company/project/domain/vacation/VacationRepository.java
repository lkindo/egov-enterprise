package com.company.project.domain.vacation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface VacationRepository extends JpaRepository<Vacation, Vacation.VacationId> {

    @Query("SELECT COUNT(v) FROM Vacation v WHERE v.confmAt != 'R' AND v.id.applcntId = :applcntId AND :date BETWEEN v.id.bgnde AND v.endde")
    long countOverlappingVacations(@Param("applcntId") String applcntId, @Param("date") String date);

    // Duplicate Check: Check overlap for range [bgnde, endde]
    // Legacy Logic: checks if new range overlaps with any existing vacation for
    // user.
    // Query: WHERE (v.id.bgnde <= :endde AND v.endde >= :bgnde)
    @Query("SELECT COUNT(v) FROM Vacation v WHERE v.id.applcntId = :applcntId AND v.id.bgnde <= :endde AND v.endde >= :bgnde")
    int countDuplicateVacation(@Param("applcntId") String applcntId, @Param("bgnde") String bgnde,
            @Param("endde") String endde);

    Page<Vacation> findByIdApplcntId(String applcntId, Pageable pageable);

    // For Approver
    Page<Vacation> findBySanctnerIdAndConfmAt(String sanctnerId, String confmAt, Pageable pageable);

    // For Approver List (All)
    Page<Vacation> findBySanctnerId(String sanctnerId, Pageable pageable);
}
