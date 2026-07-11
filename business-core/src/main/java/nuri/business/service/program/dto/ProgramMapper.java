package nuri.business.service.program.dto;

import nuri.business.domain.program.Program;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 프로그램 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code ProgramDto.from()} 을 대체하는 프레임워크 표준 매핑 패턴(FaqMapper 참조).
 * componentModel="spring" 으로 {@code ProgramMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 * 엔티티와 DTO 의 필드명이 동일하므로 별도 @Mapping 은 불필요하다.
 *
 * <p>⚠ {@code ProgramDto.from()} 은 타 도메인(menu) 의 {@code MenuService.getAllPrograms()} 에서
 * 여전히 참조하므로 본 매퍼 도입 후에도 존치한다(도메인 경계 밖 파일 미변경 원칙).
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ProgramMapper {

    ProgramDto toDto(Program entity);

    Program toEntity(ProgramDto dto);
}
