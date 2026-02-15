package com.company.project.domain.ulm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 통합 링크 Repository
 */
@org.springframework.stereotype.Repository("ulmUnityLinkRepository")
public interface UnityLinkRepository extends JpaRepository<UnityLink, String> {
    Page<UnityLink> findByUnityLinkNmContaining(String unityLinkNm, Pageable pageable);
}
