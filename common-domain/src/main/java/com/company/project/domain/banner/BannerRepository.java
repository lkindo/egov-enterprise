package com.company.project.domain.banner;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 諛곕꼫 Repository
 */
public interface BannerRepository extends JpaRepository<Banner, String> {
    Page<Banner> findByBannerNmContaining(String bannerNm, Pageable pageable);
    List<Banner> findByReflctAtOrderBySortOrdrAsc(String reflctAt);
}
