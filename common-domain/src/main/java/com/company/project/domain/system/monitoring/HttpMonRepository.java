package com.company.project.domain.system.monitoring;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HttpMonRepository extends JpaRepository<HttpMon, String> {
    Page<HttpMon> findByMngrNmContainingAndDeleteAt(String mngrNm, String deleteAt, Pageable pageable);
    Page<HttpMon> findByHttpSttusCdAndDeleteAt(String httpSttusCd, String deleteAt, Pageable pageable);
}