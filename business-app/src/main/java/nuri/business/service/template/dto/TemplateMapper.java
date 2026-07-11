package nuri.business.service.template.dto;

import nuri.business.domain.template.Template;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 템플릿 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code TemplateDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴.
 * 모든 필드가 동일 명칭으로 1:1 복사되므로 추가 {@code @Mapping} 이 필요 없다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TemplateMapper {

    TemplateDto toDto(Template entity);

    Template toEntity(TemplateDto dto);
}
