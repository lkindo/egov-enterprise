package nuri.business.service.board.dto;

import nuri.business.domain.board.Satisfaction;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 만족도 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code SatisfactionDto.from(Satisfaction)} 를 대체한다. from() 은 전 필드 직접 복사
 * (리네임/미설정 없음)였으므로 이름 일치 매핑으로 동일 동작을 재현한다. (FaqMapper 표준 패턴)
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SatisfactionMapper {

    SatisfactionDto toDto(Satisfaction entity);
}
