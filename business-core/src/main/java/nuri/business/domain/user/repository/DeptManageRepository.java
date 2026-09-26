package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * ??????? Repository
 */
public interface DeptManageRepository extends JpaRepository<DeptManage, String>, DeptManageRepositoryCustom {
    Page<DeptManage> findByOgnzNmContainingIgnoreCase(String ognzNm, Pageable pageable);
    Page<DeptManage> findByOgnzExplnContainingIgnoreCase(String ognzExpln, Pageable pageable);
    long countByOgnzNmContainingIgnoreCase(String ognzNm);
    long countByOgnzExplnContainingIgnoreCase(String ognzExpln);

    /** 하위 부서 수. 부서 삭제 가드에서 사용한다. [V2_26] */
    long countByUpOgnzId(String upOgnzId);

    /** 같은 상위 아래 가장 큰 정렬 순서(없으면 0). 새 부서를 형제의 맨 뒤에 둔다(DIP C5). */
    @Query("SELECT COALESCE(MAX(d.sortOrdr), 0) FROM DeptManage d WHERE d.upOgnzId = :upOgnzId")
    int findMaxSortOrdrUnder(@Param("upOgnzId") String upOgnzId);

    /** 최상위 부서 중 가장 큰 정렬 순서(없으면 0). null 매개변수 비교를 피하려고 따로 둔다. */
    @Query("SELECT COALESCE(MAX(d.sortOrdr), 0) FROM DeptManage d WHERE d.upOgnzId IS NULL")
    int findMaxSortOrdrOfRoots();
}
