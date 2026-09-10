package nuri.business.service.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

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
    public record ReplaceGrants(@NotNull @Valid @Size(max=2000) List<@NotNull @Valid Grant> grants,
                                @NotBlank @Size(max=64) String version, @AssertTrue boolean complete) {}
    public record ReplaceGroups(@NotNull @Size(max=100) List<@NotBlank @Size(max=20) String> groups,
                                @NotBlank @Size(max=64) String version, @AssertTrue boolean complete) {}
    public record Operation(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String domain,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String action,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name) {}
    public record Navigation(
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String code,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String name,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String parentCode) {}
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
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String grantType,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String grantCode,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) String field,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String before,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String after,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED, nullable=true, types={"string","null"}) String actorId,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED) java.time.LocalDateTime createdAt) {}
}
