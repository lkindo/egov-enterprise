package nuri.business.service.survey.dto;

import nuri.business.domain.survey.SurveyInfo;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 설문 정보 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code SurveyInfoDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * 모든 필드가 동일 명칭의 단순 복사이므로 추가 @Mapping 없이 자동 매핑된다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SurveyInfoMapper {

    SurveyInfoDto toDto(SurveyInfo entity);

    SurveyInfo toEntity(SurveyInfoDto dto);
}
