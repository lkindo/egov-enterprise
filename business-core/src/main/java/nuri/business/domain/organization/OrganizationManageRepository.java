package nuri.business.domain.organization;

import org.springframework.data.repository.Repository;

import java.util.Optional;

/** 사용자/업무 조회용 조직 projection 저장소. 쓰기 소유자는 DeptManageRepository 하나다. */
public interface OrganizationManageRepository extends Repository<OrganizationManage, String> {

    Optional<OrganizationManage> findById(String ognzId);

    /** 목록의 부서명 해석용 일괄 조회(2026-09-26 DIP B5 F10 — 행마다 조회하던 N+1 을 없앤다). */
    java.util.List<OrganizationManage> findByOgnzIdIn(java.util.Collection<String> ognzIds);
}
