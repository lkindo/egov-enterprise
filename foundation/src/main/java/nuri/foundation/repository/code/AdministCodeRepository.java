package nuri.foundation.repository.code;

import nuri.foundation.domain.code.AdministCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdministCodeRepository extends JpaRepository<AdministCode, String> {
    Page<AdministCode> findByAdministZoneNmContaining(String administZoneNm, Pageable pageable);
}
