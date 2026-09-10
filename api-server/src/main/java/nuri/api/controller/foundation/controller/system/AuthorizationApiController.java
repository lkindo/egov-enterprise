package nuri.api.controller.foundation.controller.system;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.service.auth.dto.AuthorizationDto.*;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/admin/authorization")
@RequiredArgsConstructor
@Tag(name="Authorization", description="복수 그룹 및 기능 권한 관리")
public class AuthorizationApiController {
    private final AuthorizationAdministrationService service;

    @GetMapping("/catalog")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzCatalog")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#catalog')")
    public ApiResponse<Catalog> catalog() { return ApiResponse.success(service.catalog()); }

    @GetMapping("/groups")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzGroups")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#groups')")
    public ApiResponse<List<GroupSummary>> groups() { return ApiResponse.success(service.groups()); }

    @GetMapping("/groups/{code}")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzGroup")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#group')")
    public ApiResponse<GroupSnapshot> group(@PathVariable String code) { return ApiResponse.success(service.group(code)); }

    @PostMapping("/groups")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzCreateGroup")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#createGroup')")
    public ApiResponse<Void> createGroup(@Valid @RequestBody CreateGroup request) { service.createGroup(request); return ApiResponse.success(null); }

    @PutMapping("/groups/{code}")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzUpdateGroup")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#updateGroup')")
    public ApiResponse<Void> updateGroup(@PathVariable String code,@Valid @RequestBody UpdateGroup request) { service.updateGroup(code,request); return ApiResponse.success(null); }

    @DeleteMapping("/groups/{code}")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzDeleteGroup")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#deleteGroup')")
    public ApiResponse<Void> deleteGroup(@PathVariable String code,@RequestParam String version) { service.deleteGroup(code,version); return ApiResponse.success(null); }

    @PutMapping("/groups/{code}/grants")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzReplaceGrants")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#replaceGrants')")
    public ApiResponse<Void> replaceGrants(@PathVariable String code,@Valid @RequestBody ReplaceGrants request) { service.replaceGrants(code,request); return ApiResponse.success(null); }

    @GetMapping("/users/{userId}/groups")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzMemberships")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#memberships')")
    public ApiResponse<MembershipSnapshot> memberships(@PathVariable String userId) { return ApiResponse.success(service.memberships(userId)); }

    @PutMapping("/users/{userId}/groups")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzReplaceMemberships")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#replaceMemberships')")
    public ApiResponse<Void> replaceMemberships(@PathVariable String userId,@Valid @RequestBody ReplaceGroups request) { service.replaceMemberships(userId,request); return ApiResponse.success(null); }

    @GetMapping("/users")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzUsers")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#users')")
    public ApiResponse<PageResponse<UserChoice>> users(@RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return ApiResponse.success(PageResponse.of(service.users(keyword,page,size)));
    }

    @GetMapping("/history")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzHistory")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#history')")
    public ApiResponse<PageResponse<Change>> history(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
            @RequestParam(required=false) String groupCode, @RequestParam(required=false) String userId, @RequestParam(required=false) String actorId,
            @RequestParam(required=false) @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fromDate,
            @RequestParam(required=false) @org.springframework.format.annotation.DateTimeFormat(iso=org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate toDate) {
        return ApiResponse.success(PageResponse.of(service.history(page,size,groupCode,userId,actorId,fromDate,toDate)));
    }

    @GetMapping("/departments")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzDepartments")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#departments')")
    public ApiResponse<List<DepartmentChoice>> departments() { return ApiResponse.success(service.departments()); }

    @GetMapping("/departments/{departmentId}/memberships")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzDepartmentMemberships")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#departmentMemberships')")
    public ApiResponse<DepartmentSnapshot> departmentMemberships(@PathVariable String departmentId) {
        return ApiResponse.success(service.departmentMemberships(departmentId));
    }

    @PutMapping("/departments/{departmentId}/memberships")
    @io.swagger.v3.oas.annotations.Operation(operationId="authzUpdateDepartmentMemberships")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.AuthorizationApiController#changeDepartmentGroups')")
    public ApiResponse<DepartmentSnapshot> changeDepartmentGroups(@PathVariable String departmentId,@Valid @RequestBody ChangeDepartmentGroups request) {
        return ApiResponse.success(service.changeDepartmentGroups(departmentId,request));
    }
}
