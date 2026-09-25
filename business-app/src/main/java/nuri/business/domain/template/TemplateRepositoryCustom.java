package nuri.business.domain.template;

/** Creation uses INSERT semantics even though Template has an assigned identifier. */
public interface TemplateRepositoryCustom {
    void insert(Template template);
}
