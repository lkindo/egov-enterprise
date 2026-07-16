package nuri.business.service.scrap.dto;

import nuri.business.domain.scrap.Scrap;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 스크랩 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code ScrapDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴.
 * {@code userId} 는 엔티티의 {@code frstRgtrId} 에서 유래하므로 명시적으로 매핑한다
 * (기존 {@code from()} 동작과 동일).
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ScrapMapper {

    @Mapping(target = "userId", source = "frstRgtrId")
    ScrapDto toDto(Scrap entity);

    Scrap toEntity(ScrapDto dto);
}
