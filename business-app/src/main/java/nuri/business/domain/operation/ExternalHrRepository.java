package nuri.business.domain.operation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExternalHrRepository extends JpaRepository<ExternalHr, ExternalHrId> {
    List<ExternalHr> findByEvntSn(Long evntSn);

    /** 행사에 등록된 외부인사 수 — 행사 삭제 가드(FK NO ACTION)가 쓴다. */
    long countByEvntSn(Long evntSn);

    /** 성명 부분일치 검색(페이징). 목록 API 표준(PageResponse) 대응. */
    Page<ExternalHr> findByOtsdHrNmContaining(String name, Pageable pageable);
}
