package nuri.api.schema;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.service.log.UserActivityLogAggregator;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real HTTP binding, validation, service/JPA writes and PostgreSQL calendar queries; no repository mocks. */
@Tag("schema-validation")
@SpringBootTest
@AutoConfigureMockMvc
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
@DisplayName("일정 저장·월별 조회 PostgreSQL 왕복")
class ScheduleCalendarQueryIntegrationTest {
    private static final String DEFAULT_ORG = "ORGNZT_0000000000000";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private ScheduleRepository schedules;
    @Autowired private UserActivityLogAggregator activityLogs;

    private String owner;
    private String colleague;
    private String outsider;
    private String unassigned;
    private String unassignedPeer;
    private String department;
    private String otherDepartment;

    @BeforeEach
    void seedOnlyOwnIdentitiesAndDepartments() {
        String prefix = "SC" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        owner = prefix + "A";
        colleague = prefix + "B";
        outsider = prefix + "C";
        unassigned = prefix + "U";
        unassignedPeer = prefix + "V";
        department = prefix + "D";
        otherDepartment = prefix + "E";
        for (String id : List.of(department, otherDepartment)) {
            jdbc.update("""
                    INSERT INTO tb_ognz_info (ognz_id,ognz_nm,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id)
                    VALUES (?,'Calendar fixture',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')
                    """, id);
        }
        seedUser(owner, department);
        seedUser(colleague, department);
        seedUser(outsider, otherDepartment);
        seedUser(unassigned, null);
        seedUser(unassignedPeer, null);
    }

    @AfterEach
    void cleanOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        if (owner == null) return;
        // HTTP 감사 이벤트의 동기 버퍼를 사용자 FK가 살아 있을 때 실제로 commit한다.
        long failuresBeforeFlush = activityLogs.getPersistFailureCount();
        activityLogs.flush();
        jdbc.update("DELETE FROM tb_schdl_info WHERE schdl_pic_id IN (?,?,?,?,?)",
                login(owner), login(colleague), login(outsider), login(unassigned), login(unassignedPeer));
        jdbc.update("DELETE FROM tb_user_log WHERE dmnd_user_id IN (?,?,?,?,?)",
                owner, colleague, outsider, unassigned, unassignedPeer);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?,?,?,?,?)",
                owner, colleague, outsider, unassigned, unassignedPeer);
        jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id IN (?,?)", department, otherDepartment);
        assertThat(activityLogs.getPersistFailureCount()).as("fixture 감사 로그 flush 실패 없음")
                .isEqualTo(failuresBeforeFlush);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"20261015"})
    @DisplayName("API 등록은 빈 종료일을 NULL로 저장하고 그날의 월·기간 조회에 나타난다")
    void apiCreatePersistsOptionalEndAndReturnsTheSingleDay(String endDate) throws Exception {
        long id = createThroughApi(owner, "하루 일정", "20261015", endDate);

        Map<String, Object> row = stored(id);
        assertThat(row.get("schdl_end_ymd")).isEqualTo(endDate == null || endDate.isEmpty() ? null : endDate);
        assertThat(row.get("schdl_bgng_ymd")).isEqualTo("20261015");
        assertThat(row.get("schdl_pic_id")).isEqualTo(login(owner));
        assertThat(row.get("schdl_dept_id")).isEqualTo(department);
        assertThat(row.get("frst_rgtr_id")).isEqualTo(login(owner));
        assertThat(monthly(owner, "202610")).containsExactly(id);
        assertThat(range(owner, "20261015", "20261015")).containsExactly(id);
        assertThat(range(owner, "20261016", "20261016")).isEmpty();
        assertThat(monthly(owner, "202611")).isEmpty();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("API 수정으로 종료일을 비워도 실제 저장은 NULL이고 그날 달력에서 사라지지 않는다")
    void apiUpdateClearsTheEndWithoutLosingTheCalendarEntry(String endDate) throws Exception {
        long id = createThroughApi(owner, "기간 일정", "20261015", "20261020");
        mvc.perform(put("/api/v1/schedules/{id}", id).with(user(principal(owner))).with(csrf())
                        .contentType("application/json")
                        .content(body("하루로 변경", "20261015", endDate, 0)))
                .andExpect(status().isOk());

        Map<String, Object> row = stored(id);
        assertThat(row.get("schdl_end_ymd")).isNull();
        assertThat(((Number) row.get("version")).intValue()).isEqualTo(1);
        assertThat(row.get("schdl_pic_id")).isEqualTo(login(owner));
        assertThat(row.get("schdl_dept_id")).isEqualTo(department);
        assertThat(monthly(owner, "202610")).containsExactly(id);
        assertThat(range(owner, "20261020", "20261020")).isEmpty();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("기존 NULL·빈 종료일을 고치지 않고 월·기간 조회 및 본인·부서 범위를 보존한다")
    void legacyOptionalEndsAreReadWithoutRewritingOrWideningScope(String legacyEnd) throws Exception {
        long ownDay = legacySchedule(owner, department, "2", "20261015", legacyEnd);
        long sharedDay = legacySchedule(colleague, department, "1", "20261015", legacyEnd);
        long colleaguesPrivate = legacySchedule(colleague, department, "2", "20261015", legacyEnd);
        long outsidersShared = legacySchedule(outsider, otherDepartment, "1", "20261015", legacyEnd);
        long spanning = legacySchedule(owner, department, "2", "20260920", "20261105");
        long outsideMonth = legacySchedule(owner, department, "2", "20260915", legacyEnd);

        assertThat(monthly(owner, "202610")).containsExactly(spanning, ownDay, sharedDay)
                .doesNotContain(colleaguesPrivate, outsidersShared, outsideMonth);
        assertThat(range(owner, "20261015", "20261015")).containsExactly(spanning, ownDay);
        assertThat(schedules.findSchedulesByDateRange("2", login(owner), "20261015", "20261015"))
                .extracting(Schedule::getSchdlSn).containsExactly(spanning, ownDay);
        assertThat(schedules.findSchedulesByDateRange("1", login(owner), "20261015", "20261015")).isEmpty();

        mvc.perform(get("/api/v1/schedules/{id}", sharedDay).with(user(principal(owner))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.editable").value(false))
                .andExpect(jsonPath("$.data.deletable").value(false));
        Map<String, Object> before = stored(sharedDay);
        mvc.perform(put("/api/v1/schedules/{id}", sharedDay).with(user(principal(owner))).with(csrf())
                        .contentType("application/json")
                        .content(body("타인 일정 변경 시도", "20261015", null, 0)))
                .andExpect(status().isForbidden());
        assertThat(stored(sharedDay)).isEqualTo(before);
        assertThat(stored(ownDay).get("schdl_end_ymd")).isEqualTo(legacyEnd);
        assertThat(stored(sharedDay).get("schdl_end_ymd")).isEqualTo(legacyEnd);
    }

    @ParameterizedTest
    @CsvSource({
            "20260230,20260301", "20261015,20260230", "20261015,20261014",
            "2026-10-15,20261016", "00001015,20261016", "20261015,' '"
    })
    @DisplayName("잘못된 날짜·역전된 기간은 API 등록과 수정에서 400이고 저장 상태를 바꾸지 않는다")
    void invalidDatesDoNotCreateOrModifyRows(String startDate, String endDate) throws Exception {
        long id = createThroughApi(owner, "보존할 일정", "20261015", "20261016");
        Map<String, Object> before = stored(id);
        String invalidBody = body("거절할 일정", startDate, endDate, 0);

        mvc.perform(post("/api/v1/schedules").with(user(principal(owner))).with(csrf())
                        .contentType("application/json").content(invalidBody))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/schedules/{id}", id).with(user(principal(owner))).with(csrf())
                        .contentType("application/json").content(invalidBody))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_schdl_info WHERE schdl_pic_id=?",
                Integer.class, login(owner))).isEqualTo(1);
        assertThat(stored(id)).isEqualTo(before);
    }

    @Test
    @DisplayName("미배정 사용자의 부서 공유는 기본조직에서 계속 보이고 타인의 개인 일정은 보이지 않는다")
    void unassignedDepartmentFallbackRetainsItsApprovedSharingBoundary() throws Exception {
        long shared = legacySchedule(unassignedPeer, DEFAULT_ORG, "1", "20261015", "");
        long personal = legacySchedule(unassignedPeer, DEFAULT_ORG, "2", "20261015", "");

        assertThat(monthly(unassigned, "202610")).contains(shared).doesNotContain(personal);
        assertThat(range(unassigned, "20261015", "20261015")).isEmpty();
        assertThat(stored(shared).get("schdl_end_ymd")).isEqualTo("");
    }

    private void seedUser(String id, String departmentId) {
        jdbc.update("""
                INSERT INTO tb_user_info
                    (esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,tmpr_pswd_yn,ognz_id,sbscrb_ymd)
                VALUES (?,?,'{disabled}calendar-fixture','Calendar fixture','P','N','N',?,
                        to_char(CURRENT_DATE,'YYYYMMDD'))
                """, id, login(id), departmentId);
    }

    private long createThroughApi(String actor, String name, String start, String end) throws Exception {
        String response = mvc.perform(post("/api/v1/schedules").with(user(principal(actor))).with(csrf())
                        .contentType("application/json").content(body(name, start, end, null)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).path("data").asLong();
    }

    private String body(String name, String start, String end, Integer version) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("schdlNm", name);
        body.put("schdlSeCd", "2");
        body.put("schdlBgngYmd", start);
        body.put("schdlEndYmd", end);
        if (version != null) body.put("version", version);
        return json.writeValueAsString(body);
    }

    private List<Long> monthly(String actor, String month) throws Exception {
        return ids(get("/api/v1/schedules/monthly").param("yearMonth", month), actor);
    }

    private List<Long> range(String actor, String start, String end) throws Exception {
        return ids(get("/api/v1/schedules/range").param("startDate", start).param("endDate", end), actor);
    }

    private List<Long> ids(MockHttpServletRequestBuilder request, String actor) throws Exception {
        String response = mvc.perform(request.with(user(principal(actor))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).path("data").findValues("schdlSn").stream().map(JsonNode::asLong).toList();
    }

    private long legacySchedule(String actor, String dept, String scope, String start, String end) {
        return jdbc.queryForObject("""
                INSERT INTO tb_schdl_info
                    (schdl_nm,schdl_se_cd,schdl_bgng_ymd,schdl_end_ymd,schdl_pic_id,schdl_dept_id,
                     frst_rgtr_id,last_mdfr_id,crt_dt,mdfcn_dt)
                VALUES ('Legacy calendar fixture',?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                RETURNING schdl_sn
                """, Long.class, scope, start, end, login(actor), dept, login(actor), login(actor));
    }

    private Map<String, Object> stored(long id) {
        return jdbc.queryForMap("""
                SELECT schdl_nm,schdl_bgng_ymd,schdl_end_ymd,schdl_pic_id,schdl_dept_id,
                       frst_rgtr_id,last_mdfr_id,version
                FROM tb_schdl_info WHERE schdl_sn=?
                """, id);
    }

    private static CustomUserDetails principal(String id) {
        return CustomUserDetails.builder().esntlId(id).userId(login(id)).enabled(true).lockAt("N")
                .permissions(List.of("SCHEDULE_READ", "SCHEDULE_CREATE", "SCHEDULE_UPDATE", "SCHEDULE_DELETE"))
                .build();
    }

    private static String login(String id) {
        return id + "L";
    }
}
