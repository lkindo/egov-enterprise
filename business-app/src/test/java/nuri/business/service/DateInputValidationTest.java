package nuri.business.service;

import jakarta.validation.Validation;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.operation.dto.EventInfoDto;
import nuri.business.service.operation.dto.EventInfoRequest;
import nuri.business.service.operation.dto.ExternalHrDto;
import nuri.business.service.survey.dto.SurveyInfoDto;
import nuri.business.service.survey.dto.OnlinePollManageDto;
import nuri.business.service.survey.dto.OnlinePollManageRequest;
import nuri.business.service.report.dto.WorkReportDto;
import nuri.business.service.memoreport.dto.MemoReportDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanWrapperImpl;
import java.util.Map;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class DateInputValidationTest {
    private static final Map<Class<?>, List<String>> DATES = Map.of(
            ScheduleDto.class, List.of("schdlBgngYmd", "schdlEndYmd"),
            EventInfoDto.class, List.of("evntBgngYmd", "evntEndYmd", "evntAprvYmd"),
            SurveyInfoDto.class, List.of("srvyBgngYmd", "srvyEndYmd"),
            OnlinePollManageRequest.class, List.of("pollBgngYmd", "pollEndYmd"),
            WorkReportDto.class, List.of("rptYmd"),
            MemoReportDto.class, List.of("memoRptYmd"),
            ExternalHrDto.class, List.of("brdtYmd"));

    @Test
    void everyDateRejectsImpossibleDatesAndWhitespaceButAllowsOptionalAbsence() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (var entry : DATES.entrySet()) {
                for (String field : entry.getValue()) {
                    Object dto = entry.getKey().getConstructor().newInstance();
                    var bean = new BeanWrapperImpl(dto);
                    for (String invalid : List.of("20260229", "19000229", "20260931", "2026-09-", " ", "20260910 ", "00000101")) {
                        bean.setPropertyValue(field, invalid);
                        assertThat(validator.validateProperty(dto, field)).as("%s.%s=%s", entry.getKey(), field, invalid).isNotEmpty();
                    }
                    for (String valid : new String[] {null, "", "20240229", "20000229", "20260910"}) {
                        bean.setPropertyValue(field, valid);
                        assertThat(validator.validateProperty(dto, field)).as(field).isEmpty();
                    }
                }
            }
        }
    }

    @Test
    void reversedPeriodsReportEndFieldAndEqualOrOptionalDatesAreAllowed() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (var entry : DATES.entrySet()) {
                if (entry.getValue().size() < 2) continue;
                Object dto = entry.getKey().getConstructor().newInstance();
                var bean = new BeanWrapperImpl(dto);
                String start = entry.getValue().get(0);
                String end = entry.getValue().get(1);
                bean.setPropertyValue(start, "20260910");
                bean.setPropertyValue(end, "20260909");
                assertThat(validator.validate(dto)).anyMatch(v -> v.getPropertyPath().toString().equals(end));
                for (String valid : new String[] {null, "", "20260910", "20260911"}) {
                    bean.setPropertyValue(end, valid);
                    assertThat(validator.validate(dto)).noneMatch(v -> v.getPropertyPath().toString().equals(end));
                }
            }
        }
    }

    @Test
    void eventAndPollWriteConstraintsRejectBlankNamesNegativeCapacityAndInvalidFlags() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var event = new EventInfoRequest();
            event.setEvntNm(" \t"); event.setEvntUseCnt(-1L);
            assertThat(validator.validate(event)).extracting(v -> v.getPropertyPath().toString())
                    .contains("evntNm", "evntUseCnt");
            event.setEvntNm("행사"); event.setEvntUseCnt(0L);
            assertThat(validator.validate(event)).isEmpty();
            var poll = OnlinePollManageDto.builder().pollNm("설문").pollDsuseYn("X").pollAtmcDsuseYn(" ").build();
            assertThat(validator.validate(poll)).hasSize(2);
            poll.setPollDsuseYn("N"); poll.setPollAtmcDsuseYn("Y");
            assertThat(validator.validate(poll)).isEmpty();
        }
    }
}
