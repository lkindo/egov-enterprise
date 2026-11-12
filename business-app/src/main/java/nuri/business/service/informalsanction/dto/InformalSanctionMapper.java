package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionHistory;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

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
    @Mapping(target = "stages", ignore = true)
    @Mapping(target = "history", ignore = true)
    @Mapping(target = "canApprove", ignore = true)
    @Mapping(target = "canWithdraw", ignore = true)
    @Mapping(target = "canResubmit", ignore = true)
    @Mapping(target = "currentStageSince", ignore = true)
    @Mapping(target = "openSupplement", ignore = true)
    @Mapping(target = "processHistory", ignore = true)
    @Mapping(target = "canRemind", ignore = true)
    @Mapping(target = "remindedToday", ignore = true)
    @Mapping(target = "canReplaceApprover", ignore = true)
    @Mapping(target = "canRequestSupplement", ignore = true)
    @Mapping(target = "canAnswerSupplement", ignore = true)
    @Mapping(target = "references", ignore = true)
    @Mapping(target = "referenceViewer", ignore = true)
    @Mapping(target = "canAddReference", ignore = true)
    @Mapping(target = "onBehalfOfId", ignore = true)
    @Mapping(target = "onBehalfOfNm", ignore = true)
    InformalSanctionDto toDto(InformalSanction entity);

    /** [V2_151] 앞 차수만 보는 결재자에게는 그 차수 이력의 첨부 묶음을 싣는다(제목·본문을 이력으로 바꾸는 것과 같다). */
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "atchFileSn", source = "atchFileSn")
    void applyRevisionAttachment(InformalSanctionHistory revision, @MappingTarget InformalSanctionDto dto);
}
