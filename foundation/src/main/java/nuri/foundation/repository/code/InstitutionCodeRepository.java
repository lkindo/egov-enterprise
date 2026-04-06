package nuri.foundation.repository.code;

import nuri.foundation.domain.code.InstitutionCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InstitutionCodeRepository extends JpaRepository<InstitutionCode, String> {
    Page<InstitutionCode> findByAllInsttNmContaining(String allInsttNm, Pageable pageable);
}
