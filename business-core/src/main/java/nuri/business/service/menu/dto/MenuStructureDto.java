package nuri.business.service.menu.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * [2026-10-02 D1·D2] 메뉴 구조 편집기의 읽기·저장 계약. 위치·속성·추가·삭제와 그 메뉴의 그룹별 메뉴 표시를 한 초안으로 모아
 * 한 번에 저장한다. 메뉴 표(tb_menu_info)에는 버전 칸이 없으므로 버전은 메뉴 전체 행의 요약값이다 — 스키마를 바꾸지 않는다.
 *
 * <p>새 메뉴는 아직 번호가 없으므로 {@code new-<숫자>} 키로 가리킨다. 위치·메뉴 표시 추가는 기존 메뉴 번호와 새 메뉴 키를 함께
 * 받는다({@link #REF_PATTERN}). springdoc 은 중첩 record 의 단순 이름을 전역 스키마 이름으로 쓰므로 이름은 저장소 전체에서 유일하다.
 */
public final class MenuStructureDto {
    private MenuStructureDto() {}

    /** 기존 메뉴 번호 또는 새 메뉴 키. */
    public static final String REF_PATTERN = "^(?:[1-9][0-9]{0,18}|new-[1-9][0-9]{0,5})$";
    public static final String NEW_KEY_PATTERN = "^new-[1-9][0-9]{0,5}$";
    public static final String YN_PATTERN = "^(?:Y|N)$";

    @Schema(description = "메뉴 구조와 그 버전(메뉴 전체 행의 요약값). 저장할 때 그대로 돌려보낸다.")
    public record MenuStructure(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String version,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<MenuStructureItem> menus) {}

    /**
     * 메뉴 한 행. 상위가 없으면(루트) {@code upMenuSn} 은 null 이다. 정렬은 상위(루트 먼저)·순서·번호 순이다.
     * 연결 라우트가 없으면 {@code modernRoute} 는 null 또는 빈 문자열이다(둘 다 라우트 없음).
     */
    public record MenuStructureItem(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Long menuNo,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String menuNm,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, types = {"integer", "null"}, format = "int64") Long upMenuSn,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Integer menuOrdr,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, types = {"string", "null"}) String modernRoute,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, types = {"string", "null"}) String menuExpln,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String useYn) {}

    /**
     * 저장 요청. 모든 목록은 비어 있을 수 있지만 다섯 목록이 모두 비면 바뀐 것이 없어 거부한다. {@code version} 은
     * {@link MenuStructure#version()} 을 그대로 보낸다 — 그 사이 메뉴가 바뀌었으면 409 다.
     */
    public record MenuStructureSave(
            @NotBlank @Size(max = 64) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String version,
            @NotNull @Size(max = 200) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<@NotNull @Valid MenuCreation> creations,
            @NotNull @Size(max = 2000) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<@NotNull @Valid MenuPlacement> placements,
            @NotNull @Size(max = 2000) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<@NotNull @Valid MenuProperties> properties,
            @NotNull @Size(max = 200) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<@NotNull @Positive Long> deletions,
            @NotNull @Size(max = 100) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<@NotNull @Valid MenuGroupGrantChange> grants) {}

    /** 새 메뉴. 위치(상위·순서)는 {@link MenuPlacement} 에 정확히 한 번 둔다. 연결 프로그램은 두지 않는다. */
    public record MenuCreation(
            @NotBlank @Pattern(regexp = NEW_KEY_PATTERN) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String key,
            @NotBlank @Size(max = 100) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String menuNm,
            @Size(max = 500) @Pattern(regexp = MenuDto.MODERN_ROUTE_PATTERN, message = MenuDto.MODERN_ROUTE_MESSAGE)
            @Schema(nullable = true, types = {"string", "null"}) String modernRoute,
            @Size(max = 4000) @Schema(nullable = true, types = {"string", "null"}) String menuExpln,
            @NotBlank @Size(max = 1) @Pattern(regexp = YN_PATTERN)
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"Y", "N"}) String useYn) {}

    /** 메뉴 위치. {@code parentRef} 가 null 이면 루트다. 순서는 형제 안의 순번이다. */
    public record MenuPlacement(
            @NotBlank @Pattern(regexp = REF_PATTERN) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String ref,
            @Pattern(regexp = REF_PATTERN) @Schema(nullable = true, types = {"string", "null"}) String parentRef,
            @NotNull @Min(1) @Max(9999) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Integer menuOrdr) {}

    /**
     * 기존 메뉴의 속성 — 이름·연결 라우트·설명·사용 여부 네 필드를 통째로 바꾼다. 위치와 연결 프로그램은 바꾸지 않는다.
     * 연결 라우트를 비우면(null 또는 빈 문자열) 라우트가 없는 메뉴가 된다 — 라우트가 있던 메뉴는 빈 문자열로 저장해 기동 때
     * 라우트 보강이 다시 채우지 않게 하고, 이미 비어 있던 메뉴는 그대로 둔다.
     */
    public record MenuProperties(
            @NotNull @Positive @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Long menuNo,
            @NotBlank @Size(max = 100) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String menuNm,
            @Size(max = 500) @Pattern(regexp = MenuDto.MODERN_ROUTE_PATTERN, message = MenuDto.MODERN_ROUTE_MESSAGE)
            @Schema(nullable = true, types = {"string", "null"}) String modernRoute,
            @Size(max = 4000) @Schema(nullable = true, types = {"string", "null"}) String menuExpln,
            @NotBlank @Size(max = 1) @Pattern(regexp = YN_PATTERN)
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"Y", "N"}) String useYn) {}

    /**
     * 한 그룹의 메뉴 표시·기능권한 변경. 메뉴 표시와 기능권한은 서로 다른 권한이다(H3) — 메뉴 표시를 줘도 기능권한은
     * 생기지 않고, 상위 메뉴 표시도 묵시로 주지 않는다. {@code groupVersion} 은 그 그룹을 읽은 시점의 버전이다.
     */
    public record MenuGroupGrantChange(
            @NotBlank @Size(max = 20) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String groupCode,
            @NotBlank @Size(max = 64) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String groupVersion,
            @NotNull @Size(max = 2000) @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            List<@NotBlank @Pattern(regexp = REF_PATTERN) String> navigationAdd,
            @NotNull @Size(max = 2000) @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<@NotNull @Positive Long> navigationRemove,
            @NotNull @Size(max = 250) @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
            List<@NotBlank @Size(max = 20) String> operationAdd) {}
}
