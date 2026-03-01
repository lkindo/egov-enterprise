package com.company.project.domain.unitylink;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ???? 筌띻?�寃?Repository
 */
@org.springframework.stereotype.Repository("ulmUnityLinkRepository")
public interface UnityLinkRepository extends JpaRepository<UnityLink, String> {
    Page<UnityLink> findByUnityLinkNmContaining(String unityLinkNm, Pageable pageable);
}
