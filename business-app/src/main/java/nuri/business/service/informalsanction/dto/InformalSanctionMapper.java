package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.InformalSanction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * 비정형 결재 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code InformalSanctionDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴.
 * componentModel="spring" 으로 {@code InformalSanctionMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 *
 * <p>{@code taskSeNm}/{@code aplcntNm}/{@code aprvrNm}/{@code aprvrOrgnztNm} 는 엔티티에 대응 소스가 없는
 * 표시용(join/코드 조회) 필드로, 기존 {@code from()} 과 동일하게 매핑에서 제외(ignore)하여 null 로 둔다.
 */
@Mapper(componentModel = "spring")
public interface InformalSanctionMapper {

    @Mapping(target = "taskSeNm", ignore = true)
    @Mapping(target = "aplcntNm", ignore = true)
    @Mapping(target = "aprvrNm", ignore = true)
    @Mapping(target = "aprvrOrgnztNm", ignore = true)
    InformalSanctionDto toDto(InformalSanction entity);
}
