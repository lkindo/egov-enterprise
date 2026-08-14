package nuri.business.repository.operation;

import nuri.business.domain.operation.ExternalHr;
import nuri.business.domain.operation.ExternalHrId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExternalHrRepository extends JpaRepository<ExternalHr, ExternalHrId> {
    List<ExternalHr> findByEvntSn(Long evntSn);

    /** 성명 부분일치 검색(페이징). 목록 API 표준(PageResponse) 대응. */
    Page<ExternalHr> findByOtsdHrNmContaining(String name, Pageable pageable);
}
