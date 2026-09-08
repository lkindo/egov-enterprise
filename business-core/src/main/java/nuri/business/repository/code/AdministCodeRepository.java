package nuri.business.repository.code;

import nuri.business.domain.code.AdministCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdministCodeRepository extends JpaRepository<AdministCode, String> {
    Page<AdministCode> findByAdmdstZoneNmContaining(String admdstZoneNm, Pageable pageable);

    /**
     * 이 코드를 상위로 두는 하위 코드 수.
     *
     * <p>{@code tb_admdst_cd} 에는 자기참조 FK 가 없어(V2_0 은 PK 만) DB 가 삭제를 막지 않는다.
     * 상위를 지우면 하위가 존재하지 않는 코드를 가리킨 채 남으므로 애플리케이션이 막는다.
     */
    long countByUpAdmdstCd(String upAdmdstCd);
}
