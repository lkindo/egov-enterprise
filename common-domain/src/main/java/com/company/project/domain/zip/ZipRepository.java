package com.company.project.domain.zip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ZipRepository extends JpaRepository<Zip, ZipId> {

    List<Zip> findByZip(String zip);

    List<Zip> findByCtprvnNmContainingOrSignguNmContainingOrEmdNmContaining(
            String ctprvnNm, String signguNm, String emdNm);
}