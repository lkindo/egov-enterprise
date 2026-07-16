package nuri.business.service.sms.dto;

import nuri.business.domain.sms.Sms;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * SMS 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code SmsDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * smsId·sndngTelno·sndngCn·frstRgtrId·crtDt 는 동명 필드 복사이며,
 * {@code from()} 이 엔티티와 무관하게 상수로 채우던 두 필드만 명시적으로 재현한다:
 * <ul>
 *   <li>{@code recptnCnt} → 상수 0 (from() 의 {@code .recptnCnt(0)} 과 동일)</li>
 *   <li>{@code recipients} → 신규 빈 리스트 (from() 의 {@code .recipients(new ArrayList<>())} 과 동일)</li>
 * </ul>
 * searchCondition·searchWrd 는 엔티티 소스가 없어 미매핑(=null)으로 남으며 from() 과 동일하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SmsMapper {

    @Mapping(target = "recptnCnt", constant = "0")
    @Mapping(target = "recipients", expression = "java(new java.util.ArrayList<>())")
    SmsDto toDto(Sms entity);
}
