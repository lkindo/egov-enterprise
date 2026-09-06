package nuri.business.domain.blog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 블로그 정보 JPA Repository.
 *
 * <p>[2026-09-06] 템플릿 삭제 참조 차단(감사 D11-02 후속)을 위해 신설했다 — 종전에는 블로그 사용자 매핑
 * 저장소만 있어 {@code tb_blog_info.tmplt_id} 참조 여부를 물을 수 없었다.
 */
@Repository
public interface BlogRepository extends JpaRepository<Blog, Long> {

    long countByTmpltId(String tmpltId);
}
