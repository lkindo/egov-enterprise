package nuri.business.service.system.service.survey.dto;

import nuri.business.domain.system.service.survey.SurveyTemplate;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 설문 템플릿 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code SurveyTemplateDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * DTO 미포함 필드({@code srvyTmpltImgInfo})는 unmappedTargetPolicy=IGNORE 로 무시된다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SurveyTemplateMapper {

    SurveyTemplateDto toDto(SurveyTemplate entity);

    SurveyTemplate toEntity(SurveyTemplateDto dto);
}
