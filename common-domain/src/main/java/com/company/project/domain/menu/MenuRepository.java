package com.company.project.domain.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuRepository extends JpaRepository<Menu, Long>, MenuRepositoryCustom {
    List<Menu> findAllByOrderByUpperMenuNoAscMenuOrdrAsc();

    Optional<Menu> findByProgrmFileNm(String progrmFileNm);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM Menu m WHERE m.menuNm LIKE %:searchKeyword% OR m.progrmFileNm LIKE %:searchKeyword%")
    org.springframework.data.domain.Page<Menu> searchByKeyword(
            @org.springframework.data.repository.query.Param("searchKeyword") String searchKeyword,
            org.springframework.data.domain.Pageable pageable);

    int countByUpperMenuNo(Long upperMenuNo);
}
