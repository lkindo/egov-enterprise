package nuri.business.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalHrRepository extends JpaRepository<ExternalHr, ExternalHrId> {
    /** 행사에 등록된 외부인사 수 — 행사 삭제 가드(FK NO ACTION)가 쓴다. */
    long countByEvntSn(Long evntSn);

    /** 행사별 외부인사 조회(페이징). */
    Page<ExternalHr> findByEvntSn(Long evntSn, Pageable pageable);

    /** 성명 부분일치 검색(페이징). 목록 API 표준(PageResponse) 대응. */
    Page<ExternalHr> findByOtsdHrNmContaining(String name, Pageable pageable);

    /** 행사별 성명 부분일치 검색(페이징). */
    Page<ExternalHr> findByEvntSnAndOtsdHrNmContaining(Long evntSn, String name, Pageable pageable);
}
