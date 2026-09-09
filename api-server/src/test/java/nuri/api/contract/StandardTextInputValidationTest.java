package nuri.api.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class StandardTextInputValidationTest {
    static Stream<Arguments> limits() {
        return Stream.of(
                Arguments.of(nuri.business.service.program.dto.ProgramDto.class,"prgrmFileNm",300),
                Arguments.of(nuri.business.service.menu.dto.MenuDto.class,"prgrmFileNm",300),
                Arguments.of(nuri.business.service.addressbook.dto.AddressBookDto.class,"adbkNm",200),
                Arguments.of(nuri.business.service.board.dto.BoardSaveRequest.class,"pstTtl",256),
                Arguments.of(nuri.business.service.system.content.community.dto.CommunityDto.class,"cmntyNm",300),
                Arguments.of(nuri.business.service.mail.dto.SentMailDto.class,"sj",256),
                Arguments.of(nuri.business.service.note.dto.NoteDto.class,"noteSj",256),
                Arguments.of(nuri.business.service.operation.dto.EventInfoDto.class,"picNm",100),
                Arguments.of(nuri.business.service.operation.dto.ExternalHrDto.class,"ogdpInstNm",200),
                Arguments.of(nuri.business.service.department.dto.DeptManageDto.class,"ognzNm",200),
                Arguments.of(nuri.business.service.auth.dto.RoleManageDto.class,"roleNm",300),
                Arguments.of(nuri.business.service.operation.dto.RewardManageDto.class,"rwardNm",300),
                Arguments.of(nuri.business.service.schedule.dto.ScheduleDto.class,"schdlNm",300),
                Arguments.of(nuri.business.service.survey.dto.SurveyInfoDto.class,"srvyTtl",256),
                Arguments.of(nuri.business.service.survey.dto.SurveyInfoDto.class,"srvyPrps",4000),
                Arguments.of(nuri.business.service.survey.dto.SurveyTemplateDto.class,"srvyTmpltPathNm",300),
                Arguments.of(nuri.business.service.code.dto.InstitutionCodeDto.class,"instAbbrNm",300),
                Arguments.of(nuri.business.service.code.dto.InstitutionCodeRecptnDto.class,"instAbbrNm",300),
                Arguments.of(nuri.business.service.menu.dto.MenuDto.class,"relImgNm",300),
                Arguments.of(nuri.business.service.user.dto.UserDto.class,"homeAddr",200),
                Arguments.of(nuri.business.service.user.dto.UserDto.class,"daddr",200),
                Arguments.of(nuri.api.controller.UserProfileUpdateRequest.class,"homeAddr",200),
                Arguments.of(nuri.api.controller.UserProfileUpdateRequest.class,"daddr",200),
                Arguments.of(nuri.api.controller.UserSelfProfileUpdateRequest.class,"homeAddr",200),
                Arguments.of(nuri.api.controller.UserSelfProfileUpdateRequest.class,"daddr",200));
    }

    @ParameterizedTest(name="{0}.{1} accepts {2} chars and rejects overflow")
    @MethodSource("limits")
    <T> void validatesBoundaryInRequestContracts(Class<T> dto,String field,int max) {
        try (var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            assertThat(validator.validateValue(dto,field,"가".repeat(max))).isEmpty();
            assertThat(validator.validateValue(dto,field,"가".repeat(max+1)))
                    .anyMatch(v -> v.getConstraintDescriptor().getAnnotation() instanceof jakarta.validation.constraints.Size);
        }
    }

    @Test
    void institutionTimesAcceptOnlyValidSixDigitTimeOrNull() {
        try (var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            for (Class<?> type: java.util.List.of(
                    nuri.business.service.code.dto.InstitutionCodeDto.class,
                    nuri.business.service.code.dto.InstitutionCodeRecptnDto.class)) {
                for (String time: java.util.Arrays.asList(null,"000000","143025","235959")) {
                    assertThat(validator.validateValue(type,"chgTm",time)).isEmpty();
                }
                for (String time: java.util.List.of("","240000","126000","125960","14:30:25","20260909143025","12345","１２３４５６")) {
                    assertThat(validator.validateValue(type,"chgTm",time)).as(time).isNotEmpty();
                }
            }
        }
    }

    @Test
    void normalizesLegacyJsonBeforeValidationAndRejectsInvalidDigits() throws Exception {
        var mapper=new ObjectMapper();
        var type=nuri.business.service.sms.dto.SmsRecptnDto.class;
        try (var factory=Validation.buildDefaultValidatorFactory()) {
            var valid=mapper.readValue("{\"rcptnTelno\":\"010-1234-5678\"}",type);
            assertThat(valid.getRcptnTelno()).isEqualTo("01012345678");
            assertThat(nuri.business.service.sms.dto.SmsRecptnDto.builder()
                    .rcptnTelno("010-1234-5678").build().getRcptnTelno()).isEqualTo("01012345678");
            assertThat(factory.getValidator().validate(valid)).isEmpty();
            for (String input: java.util.List.of("---","123456789012","010AB123456","+821012345678")) {
                var invalid=mapper.readValue("{\"rcptnTelno\":\""+input+"\"}",type);
                assertThat(factory.getValidator().validate(invalid)).isNotEmpty();
            }
        }
    }
}
