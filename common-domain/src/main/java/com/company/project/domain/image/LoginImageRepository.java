package com.company.project.domain.image;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoginImageRepository extends JpaRepository<LoginImage, String> {
    List<LoginImage> findByReflctAt(String reflctAt);
    Page<LoginImage> findByImageNmContaining(String imageNm, Pageable pageable);
}