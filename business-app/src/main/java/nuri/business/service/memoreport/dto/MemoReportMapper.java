package nuri.business.service.memoreport.dto;

import nuri.business.domain.memoreport.MemoReport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 메모보고 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code MemoReportDto.from()} 를 대체하는 프레임워크 표준 매핑({@link nuri.business.service.faq.dto.FaqMapper} 참조 패턴).
 * from() 은 엔티티에 존재하지 않는 표시용 파생필드 {@code wrterNm}/{@code rptrNm} 를 설정하지 않으므로,
 * 동일 거동 보장을 위해 명시적으로 {@code ignore} 처리하여 null 로 남긴다.
 * componentModel="spring" 으로 {@code MemoReportMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface MemoReportMapper {

    @Mapping(target = "wrterNm", ignore = true)
    @Mapping(target = "rptrNm", ignore = true)
    MemoReportDto toDto(MemoReport entity);

    MemoReport toEntity(MemoReportDto dto);
}
