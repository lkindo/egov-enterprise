package nuri.business.service.deptjob.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.foundation.core.json.StrictStringDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;

/** 저장 입력과 기존 비정규 값의 조회 계약을 분리한다. 서버 소유 필드는 저장 입력에 넣지 않는다. */
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "부서 업무 저장 요청")
public record DeptJobSaveRequest(
        Long deptTaskBoxSn,
        @Size(max = 100) String deptTaskNm,
        @Size(max = 4000) String deptTaskCn,
        @Size(max = 20) String picId,
        @Size(max = 12) @Pattern(regexp = DeptJobSaveRequest.PRIORITY_PATTERN, message = DeptJobSaveRequest.PRIORITY_MESSAGE)
        @JsonDeserialize(using = StrictStringDeserializer.class)
        @Schema(description = "우선순위 문자열 1(높음)·2(보통)·3(낮음). null·생략은 기존처럼 값을 비웁니다.",
                nullable = true, types = {"string", "null"})
        String prrtyRnk,
        Long atchFileSn,
        @Min(0)
        @Schema(description = "조회한 수정 버전. 수정 시 서비스에서 필수로 대조하며 등록에서는 무시합니다.")
        Integer version) {
    public static final String PRIORITY_PATTERN = "^(?:1|2|3)$";
    public static final String PRIORITY_MESSAGE = "우선순위는 1(높음), 2(보통), 3(낮음) 중 하나를 입력하세요.";

    public DeptJobDto toDto() {
        return DeptJobDto.builder().deptTaskBoxSn(deptTaskBoxSn).deptTaskNm(deptTaskNm).deptTaskCn(deptTaskCn)
                .picId(picId).prrtyRnk(prrtyRnk).atchFileSn(atchFileSn).version(version).build();
    }
}
