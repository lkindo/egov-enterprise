package nuri.business.service.blog.template;

import nuri.business.domain.blog.BlogRepository;
import nuri.foundation.core.template.TemplateReferenceContributor;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * 블로그({@code tb_blog_info.tmplt_id})의 템플릿 참조 건수를 템플릿 도메인에 알려 준다.
 * 블로그가 base projection 에서 빠지면 이 contributor 도 함께 빠진다.
 */
@Component
public class BlogTemplateReferenceContributor implements TemplateReferenceContributor {

    private final BlogRepository blogRepository;

    public BlogTemplateReferenceContributor(BlogRepository blogRepository) {
        this.blogRepository = Objects.requireNonNull(blogRepository);
    }

    @Override
    public String sourceLabel() {
        return "블로그";
    }

    @Override
    public long countReferences(String tmpltId) {
        return blogRepository.countByTmpltId(tmpltId);
    }
}
