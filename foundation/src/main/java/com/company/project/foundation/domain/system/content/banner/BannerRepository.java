package com.company.project.foundation.domain.system.content.banner;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * ?꾩룄←몭?Repository
 */
public interface BannerRepository extends JpaRepository<Banner, String> {
    Page<Banner> findByBannerNmContaining(String bannerNm, Pageable pageable);
    List<Banner> findByReflctAtOrderBySortOrdrAsc(String reflctAt);
}
