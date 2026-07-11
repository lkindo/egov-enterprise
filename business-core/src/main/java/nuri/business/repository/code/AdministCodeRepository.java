package nuri.business.repository.code;

import nuri.business.domain.code.AdministCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdministCodeRepository extends JpaRepository<AdministCode, String> {
    Page<AdministCode> findByAdmdstZoneNmContaining(String admdstZoneNm, Pageable pageable);
}
