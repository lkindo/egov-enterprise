package nuri.business.domain.template;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 템플릿 정보 리포지토리
 */
@Repository("commonTemplateRepository")
public interface TemplateRepository extends JpaRepository<Template, String> {

    Page<Template> findByTmpltNmContaining(String tmpltNm, Pageable pageable);

    Page<Template> findByTmpltSeCd(String tmpltSeCd, Pageable pageable);

    List<Template> findByTmpltSeCd(String tmpltSeCd);

    List<Template> findByUseYn(String useYn);

    List<Template> findByTmpltSeCdAndUseYn(String tmpltSeCd, String useYn);
}
