package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 부서 관리 Repository
 */
public interface DeptManageRepository extends JpaRepository<DeptManage, String>, DeptManageRepositoryCustom {
    /** 일반 정보 수정도 계층 변경이 커밋한 부모·순서를 읽은 뒤 갱신한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DeptManage d WHERE d.ognzId = :ognzId")
    java.util.Optional<DeptManage> findByIdForUpdate(@Param("ognzId") String ognzId);

    interface ParentLink {
        String getOgnzId();
        String getUpOgnzId();
    }

    /** 계층 변경끼리 같은 순서로 잠그고, 대기한 변경은 앞선 커밋의 부모 관계를 다시 읽는다. */
    @Query(value = "SELECT ognz_id AS \"ognzId\", up_ognz_id AS \"upOgnzId\" "
            + "FROM tb_ognz_info ORDER BY ognz_id FOR NO KEY UPDATE", nativeQuery = true)
    java.util.List<ParentLink> findParentLinksForUpdate();

    /** 하위 부서 수. 부서 삭제 가드에서 사용한다. [V2_26] */
    long countByUpOgnzId(String upOgnzId);

    /** 같은 상위 아래 가장 큰 정렬 순서(없으면 0). 새 부서를 형제의 맨 뒤에 둔다(DIP C5). */
    @Query("SELECT COALESCE(MAX(d.sortOrdr), 0) FROM DeptManage d WHERE d.upOgnzId = :upOgnzId")
    int findMaxSortOrdrUnder(@Param("upOgnzId") String upOgnzId);

    /** 최상위 부서 중 가장 큰 정렬 순서(없으면 0). null 매개변수 비교를 피하려고 따로 둔다. */
    @Query("SELECT COALESCE(MAX(d.sortOrdr), 0) FROM DeptManage d WHERE d.upOgnzId IS NULL")
    int findMaxSortOrdrOfRoots();
}
