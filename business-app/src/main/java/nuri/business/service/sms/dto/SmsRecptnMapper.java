package nuri.business.service.sms.dto;

import nuri.business.domain.sms.SmsRecptn;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * SMS 수신정보 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code SmsRecptnDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * 수신 번호·결과 코드는 기존 계약을 유지한다. 내부 공급자 receipt와 시도 식별자는
 * rsltMsg에서 사람에게 보여 줄 상태 문구로 변환하고 응답으로 노출하지 않는다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SmsRecptnMapper {

    @org.mapstruct.Mapping(target = "rsltMsg", expression = "java(nuri.business.service.sms.SmsReceiptState.display(entity.getRsltCd(), entity.getRsltMsg()))")
    SmsRecptnDto toDto(SmsRecptn entity);
}
