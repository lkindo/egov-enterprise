package nuri.business.service.sms.dto;

import nuri.business.domain.sms.SmsRecptn;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * SMS 수신정보 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code SmsRecptnDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * 단순 필드 복사(smsId·rcptnTelno 는 {@code SmsRecptn} 의 파생 게터, rsltCd·rsltMsg 는 직접 필드)이므로
 * 추가 {@code @Mapping} 없이 동명 매핑으로 {@code from()} 과 동일한 결과를 생성한다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SmsRecptnMapper {

    SmsRecptnDto toDto(SmsRecptn entity);
}
