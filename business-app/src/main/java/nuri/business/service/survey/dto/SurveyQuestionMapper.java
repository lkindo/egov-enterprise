package nuri.business.service.survey.dto;

import nuri.business.domain.survey.SurveyQuestion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 설문 문항 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code SurveyQuestionDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * {@code from()} 은 {@code items} 를 설정하지 않으므로(호출부에서 별도 주입) 명시적으로 ignore 한다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SurveyQuestionMapper {

    @Mapping(target = "items", ignore = true)
    SurveyQuestionDto toDto(SurveyQuestion entity);

    SurveyQuestion toEntity(SurveyQuestionDto dto);
}
