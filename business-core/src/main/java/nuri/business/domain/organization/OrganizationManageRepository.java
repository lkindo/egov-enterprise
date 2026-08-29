package nuri.business.domain.organization;

import org.springframework.data.repository.Repository;

import java.util.Optional;

/** 사용자/업무 조회용 조직 projection 저장소. 쓰기 소유자는 DeptManageRepository 하나다. */
public interface OrganizationManageRepository extends Repository<OrganizationManage, String> {

    Optional<OrganizationManage> findById(String ognzId);
}
