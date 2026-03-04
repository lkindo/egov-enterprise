package com.company.project.domain.deptjob;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * ?봔??뽯씜?얜똾釉??귐뗫７筌왖?醫듼봺
 */
@Repository
public interface DeptJobBoxRepository extends JpaRepository<DeptJobBox, String> {

    @Query("SELECT d FROM DeptJobBox d WHERE d.deptId = :deptId ORDER BY d.indictOrdr")
    Page<DeptJobBox> findByDeptId(@Param("deptId") String deptId, Pageable pageable);

    @Query("SELECT d FROM DeptJobBox d WHERE d.deptId = :deptId ORDER BY d.indictOrdr")
    List<DeptJobBox> findByDeptId(@Param("deptId") String deptId);

    @Query("SELECT d FROM DeptJobBox d WHERE " +
            "(:keyword IS NULL OR :keyword = '' OR d.deptJobbxNm LIKE %:keyword%) " +
            "ORDER BY d.indictOrdr")
    Page<DeptJobBox> findByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
