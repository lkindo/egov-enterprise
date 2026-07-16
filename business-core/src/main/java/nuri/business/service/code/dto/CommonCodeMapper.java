package nuri.business.service.code.dto;

import nuri.business.domain.code.CommonCode;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 공통상세코드 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code CommonCodeDto.from()} 을 대체하는 프레임워크 표준 매핑 패턴(FaqMapper 참조).
 * componentModel="spring" 으로 {@code CommonCodeMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 * 엔티티와 DTO 의 필드명(cdId/dtlCd/dtlCdNm/dtlCdExpln/useYn)이 동일하므로 별도 @Mapping 은 불필요하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CommonCodeMapper {

    CommonCodeDto toDto(CommonCode entity);

    CommonCode toEntity(CommonCodeDto dto);
}
