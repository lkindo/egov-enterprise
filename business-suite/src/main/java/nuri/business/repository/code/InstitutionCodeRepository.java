package nuri.business.repository.code;

import nuri.business.domain.code.InstitutionCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InstitutionCodeRepository extends JpaRepository<InstitutionCode, String> {
    Page<InstitutionCode> findByAllInstNmContaining(String allInstNm, Pageable pageable);

    default Page<InstitutionCode> searchInstitutionCodes(String searchCondition, String searchKeyword, Pageable pageable) {
        return findByAllInstNmContaining(searchKeyword, pageable);
    }
}
