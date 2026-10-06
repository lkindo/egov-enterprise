package nuri.business.domain.template;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 템플릿 정보 리포지토리
 */
@Repository("commonTemplateRepository")
public interface TemplateRepository extends JpaRepository<Template, String>, TemplateRepositoryCustom {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM Template t WHERE t.tmpltId = :id")
    java.util.Optional<Template> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") String id);
}
