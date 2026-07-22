package nuri.business.service.scrap.dto;

import nuri.business.domain.scrap.Scrap;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 스크랩 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 매핑(서비스 내 private convertToDto / builder 나열)을 대체하는 프레임워크 표준 매핑 패턴이며,
 * {@link nuri.business.service.scrap.ScrapService} 가 조회·등록 양방향에서 이 매퍼만을 사용한다.
 * 수기 나열이 필드를 누락해 스크랩 URL·설명이 저장·응답에서 통째로 소실됐던 결함의 재발 방지책이다.
 *
 * <p>{@code userId} 는 엔티티의 {@code frstRgtrId} 에서 유래하므로 명시적으로 매핑한다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ScrapMapper {

    @Mapping(target = "userId", source = "frstRgtrId")
    ScrapDto toDto(Scrap entity);

    // DTO→엔티티(toEntity)는 두지 않는다: PK 는 서버 채번이고 bbsId/pstId 는 FK 대상이라
    // 요청 본문을 그대로 엔티티에 흘리면 mass assignment 가 된다. 생성은 ScrapService 가 명시 조립한다.
}
