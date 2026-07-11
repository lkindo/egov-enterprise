package nuri.business.service.system.service.survey.dto;

import nuri.business.domain.system.service.survey.OnlinePollArticle;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 온라인 설문 항목 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code OnlinePollArticleDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * {@code pollId} 는 연관 엔티티 {@code pollManage.pollId} 에서 null-safe 로 파생하며(원본 from() 과 동일),
 * {@code pollIemCo}(투표 수)는 from() 이 설정하지 않고 서비스 레이어에서 별도 집계·주입하므로 ignore 한다.
 *
 * <p>역방향(toEntity)은 flat {@code pollId} → 연관 {@code pollManage} 로의 복원이 손실적(lossy)이라
 * 의도적으로 정의하지 않는다(안전성 우선). from() 의 유일한 책무인 entity→DTO 만 제공한다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface OnlinePollArticleMapper {

    @Mapping(target = "pollId", source = "pollManage.pollId")
    @Mapping(target = "pollIemCo", ignore = true)
    OnlinePollArticleDto toDto(OnlinePollArticle entity);
}
