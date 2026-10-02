package nuri.business.service.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Set;

/** Complete assignment snapshots are distinct from paged search results. */
public final class AuthorizationDto {
    private AuthorizationDto() {}
    public record Grant(@NotBlank @Size(max=12) @Pattern(regexp="^(?:OPERATION|NAVIGATION)$")
                        @Schema(requiredMode=Schema.RequiredMode.REQUIRED, allowableValues={"OPERATION","NAVIGATION"}) String type,
                        @NotBlank @Size(max=20) @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code) implements Comparable<Grant> {
        @Override public int compareTo(Grant other) {
            int order = type.compareTo(other.type);
            return order == 0 ? code.compareTo(other.code) : order;
        }
    }
    public record GroupSummary(String code, String name, String description, String version) {}
    public record GroupSnapshot(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String description,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<Grant> grants,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String version,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) boolean complete) {}
    public record MembershipSnapshot(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String userId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<String> groups,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String version,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) boolean complete) {}
    public record DepartmentMember(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String userId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String loginId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String userName,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<String> groups,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String version,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) boolean complete) {}
    public record DepartmentSnapshot(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String departmentId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<DepartmentMember> users,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String version,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) boolean complete) {}
    public record ChangeDepartmentGroups(@NotEmpty @Size(max=2000) List<@NotBlank @Size(max=20) String> userIds,
                                         @NotBlank @Size(max=20) String groupCode,
                                         @NotBlank @Pattern(regexp="ADD|REMOVE") String action,
                                         @NotBlank @Size(max=64) String version, @AssertTrue boolean complete) {}
    public record CreateGroup(@NotBlank @Size(max=20) @Pattern(regexp="[A-Z][A-Z0-9_]{0,19}")
                              @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
                              @NotBlank @Size(max=100) @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name,
                              @Size(max=4000) @Schema(nullable=true, types={"string","null"}) String description) {}
    public record UpdateGroup(@NotBlank @Size(max=100) String name, @Size(max=4000) @Schema(nullable=true, types={"string","null"}) String description,
                              @NotBlank @Size(max=64) String version) {}
    public record ReplaceGrants(@NotNull @Size(max=2000) List<@NotNull @Valid Grant> grants,
                                @NotBlank @Size(max=64) String version, @AssertTrue boolean complete) {}
    public record ReplaceGroups(@NotNull @Size(max=100) List<@NotBlank @Size(max=20) String> groups,
                                @NotBlank @Size(max=64) String version, @AssertTrue boolean complete) {}
    /**
     * [2026-10-02 D6] 그룹 쪽에서 구성원을 한꺼번에 추가·회수한다. 값은 사용자 식별자(esntlId)다. 그룹 버전 대신
     * 'add 는 아직 구성원이 아니고 remove 는 지금 구성원이다' 를 전제로 보고, 다른 관리자가 먼저 바꾼 대상을 정확히 짚어 거부한다.
     */
    public record ChangeGroupMembers(
            @NotNull @Size(max=500) @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<@NotBlank @Size(max=20) String> add,
            @NotNull @Size(max=500) @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<@NotBlank @Size(max=20) String> remove,
            @AssertTrue boolean complete) {}
    /** 구성원 일괄 변경의 결과 — 실제로 추가·회수한 사람과 저장 뒤 구성원 수. */
    public record GroupMembersChange(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<UserChoice> added,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<UserChoice> removed,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) long memberCount) {}
    /**
     * [2026-10-02] 그룹 복제 — 원본 그룹의 기능권한과 메뉴 표시를 새 그룹으로 옮긴다. 구성원은 옮기지 않는다.
     * {@code sourceVersion} 은 원본을 보고 고른 시점의 버전이며 그 사이 원본이 바뀌었으면 409 다.
     */
    public record CopyGroup(@NotBlank @Size(max=20) @Pattern(regexp="[A-Z][A-Z0-9_]{0,19}")
                            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
                            @NotBlank @Size(max=100) @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name,
                            @Size(max=4000) @Schema(nullable=true, types={"string","null"}) String description,
                            @NotBlank @Size(max=64) @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String sourceVersion) {}
    /** 전체 그룹의 권한을 한 스냅샷으로 읽는다(코드 순). 메뉴별 '보이는 그룹'·화면별 권한·그룹 비교가 쓴다. */
    public record GrantMatrix(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String catalogVersion,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<GroupSnapshot> groups) {}
    /** 메뉴 구조 저장이 메뉴를 바꾸기 전에 확인하는 그룹 버전(서비스 사이 전달용, API 스키마가 아니다). */
    public record GroupVersion(String code, String version) {}
    /** 메뉴 구조 저장이 새 메뉴 키를 실제 번호로 바꾼 뒤 넘기는 그룹별 권한 변경(서비스 사이 전달용). */
    public record ResolvedGrantChange(String groupCode, Set<Long> navigationAdd, Set<Long> navigationRemove, Set<String> operationAdd) {}
    /** 메뉴를 옮기면 그 메뉴가 사이드바에서 숨겨지는 그룹(서비스 사이 전달용). 새 메뉴의 번호는 음수 임시 번호다. */
    public record NavigationConflict(Long menuNo, Long parentNo, String groupCode, String groupName) {}
    public record Operation(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String domain,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String action,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name) {}
    /**
     * {@code route} 는 메뉴가 여는 화면 경로다(분류만 있는 메뉴는 null). 권한 그룹 편집기가 "배정한 메뉴 가운데 이 그룹의
     * 기능 권한으로 열 수 없는 메뉴" 를 저장 전에 알리는 데 쓴다 — 메뉴 표시와 화면 진입은 서로 다른 권한이 판정한다.
     * {@code useYn} 은 메뉴 사용 여부다(사이드바는 'Y' 만 그린다). 화면별 권한 표가 사용하지 않는 메뉴를 그 사실대로 보이는 데 쓴다.
     */
    public record Navigation(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String parentCode,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String route,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, allowableValues={"Y","N"}) String useYn) {}
    public record Catalog(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<Operation> operations,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) List<Navigation> navigation,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String catalogVersion) {}
    public record UserChoice(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String id,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String userId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String userNm,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String departmentId) {}
    public record DepartmentChoice(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String id,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name) {}
    public record Change(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) long id,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String requestId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String policyVersion,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String targetType,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String changeType,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String group,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String userId,
            @Schema(description="대상 사용자 이름(사용자가 없으면 null)", requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String userNm,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String grantType,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String grantCode,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String field,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String before,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String after,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String actorId,
            @Schema(description="처리자 이름(사용자가 없으면 null)", requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String actorNm,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) java.time.LocalDateTime createdAt,
            @Schema(description="변경 사유(복제 원본 등, 없으면 null)", requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String reason) {}
}
