package nuri.business.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import nuri.business.domain.code.InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId;

public interface InstitutionCodeRecptnLogRepository
        extends JpaRepository<InstitutionCodeRecptnLog, InstitutionCodeRecptnLogId> {
    Page<InstitutionCodeRecptnLog> findByAllInstNmContainingAndProcSe(String allInstNm, String procSe, Pageable pageable);
    Page<InstitutionCodeRecptnLog> findByAllInstNmContaining(String allInstNm, Pageable pageable);
}
