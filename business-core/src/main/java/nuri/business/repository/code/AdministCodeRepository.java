package nuri.business.repository.code;

import nuri.business.domain.code.AdministCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdministCodeRepository extends JpaRepository<AdministCode, String>, AdministCodeRepositoryCustom {
    Page<AdministCode> findByAdmdstZoneNmContaining(String admdstZoneNm, Pageable pageable);

    /**
     * 이 코드를 상위로 두는 하위 코드 수.
     *
     * <p>V2_102 의 자기참조 FK 도 부모 삭제를 막지만, 서비스에서 먼저 검사해
     * 참조 중인 하위 코드 수와 함께 RESOURCE_IN_USE 를 반환한다.
     */
    long countByUpAdmdstCd(String upAdmdstCd);
}
