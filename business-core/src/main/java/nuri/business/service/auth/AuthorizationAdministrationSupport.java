package nuri.business.service.auth;

import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.auth.dto.AuthorizationDto.Change;
import nuri.business.service.auth.dto.AuthorizationDto.DepartmentMember;
import nuri.business.service.auth.dto.AuthorizationDto.DepartmentSnapshot;
import nuri.business.service.auth.dto.AuthorizationDto.Grant;
import nuri.business.service.auth.dto.AuthorizationDto.GroupSnapshot;
import nuri.business.service.auth.dto.AuthorizationDto.NavigationConflict;
import nuri.business.service.auth.dto.AuthorizationDto.Operation;
import nuri.business.service.auth.dto.AuthorizationDto.UserChoice;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * 권한 관리 서비스의 버전 해시·메뉴 트리 정합성·권한 카탈로그 파싱·이력 조건 조립 등 순수 보조.
 */
final class AuthorizationAdministrationSupport {

    private AuthorizationAdministrationSupport() { }

    /** 단건(readGroup)과 일괄(readGroups)이 같은 state·버전을 만든다 — 저장 때 두 경로의 버전을 서로 비교한다. */
    static GroupSnapshot groupSnapshot(String code, String name, String description, List<Grant> grants, Long last) {
        String state = Objects.toString(name, "") + "\n" + Objects.toString(description, "") + "\n" + grants;
        return new GroupSnapshot(code, name, description, grants, versionDigest(code, state, last), true);
    }

    static DepartmentSnapshot buildDepartmentSnapshot(String departmentId, List<UserChoice> users,
            Map<String, List<String>> groupsByUser, Map<String, Long> lastByUser) {
        var members = users.stream().map(user -> {
            var groups = groupsByUser.getOrDefault(user.id(), List.of());
            String version = membershipVersion(user.id(), groups, lastByUser.getOrDefault(user.id(), 0L));
            return new DepartmentMember(user.id(), user.userId(), user.userNm(), groups, version, true);
        }).toList();
        String digest = AuthorizationSnapshotService.digest(
                PermissionCodes.CATALOG_VERSION + "\n" + departmentId + "\n" + members);
        return new DepartmentSnapshot(departmentId, members, digest, true);
    }

    /** 사용자의 그룹 배정 버전. 단건(readMemberships)과 부서 일괄(readDepartment)이 같은 값을 만든다. */
    static String membershipVersion(String userId, List<String> groups, Long last) {
        return versionDigest(userId, groups.toString(), last);
    }

    static String versionDigest(String target, String state, Long last) {
        // Including the most recent immutable delta prevents a changed-then-restored (ABA) overwrite.
        return AuthorizationSnapshotService.digest(
                PermissionCodes.CATALOG_VERSION + "\n" + target + "\n" + state + "\n" + last);
    }

    /** 메뉴 시드의 자리표시자({@code dir}·{@code #})와 빈 값은 화면 경로가 아니다. */
    static String routeOf(String modernRoute) {
        if (modernRoute == null || modernRoute.isBlank() || "#".equals(modernRoute) || "dir".equalsIgnoreCase(modernRoute)) {
            return null;
        }
        return modernRoute;
    }

    static List<Operation> loadCatalogOperations() {
        List<Operation> operations = new ArrayList<>();
        try (var input = new ClassPathResource("authorization/permission-catalog.json").getInputStream()) {
            for (JsonNode item : JsonMapper.builder().configureForJackson2().build().readTree(input).path("permissions")) {
                operations.add(new Operation(
                        item.path("code").asString(),
                        item.path("domain").asString(),
                        item.path("action").asString(),
                        item.path("name").asString()));
            }
        } catch (IOException | JacksonException ex) {
            throw new IllegalStateException("Permission catalog unavailable", ex);
        }
        return List.copyOf(operations);
    }

    /** 상위 메뉴(존재하지 않는 상위 포함) 중 하나라도 선택되지 않은 메뉴 표시 — 복제 전에 이름을 밝혀 거부한다. */
    static List<String> navigationWithoutSelectedAncestor(Set<Grant> grants, Map<String, String> parents) {
        var selected = new HashSet<String>();
        grants.stream().filter(grant -> "NAVIGATION".equals(grant.type())).forEach(grant -> selected.add(grant.code()));
        var orphans = new ArrayList<String>();
        for (String code : new TreeSet<>(selected)) {
            var visited = new HashSet<String>();
            String current = parents.containsKey(code) ? parents.get(code) : code;
            while (current != null && !"0".equals(current)) {
                if (!visited.add(current) || !parents.containsKey(current) || !selected.contains(current)) {
                    orphans.add(code);
                    break;
                }
                current = parents.get(current);
            }
        }
        return orphans;
    }

    static TreeSet<Grant> validateGrants(List<Grant> grants) {
        var result = new TreeSet<Grant>();
        for (var grant : grants) {
            if (grant == null || grant.code() == null) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "권한 값이 필요합니다.");
            }
            if ("OPERATION".equals(grant.type())) {
                if (!PermissionCodes.ALL.contains(grant.code())) invalid("알 수 없는 기능 권한입니다.");
            } else if ("NAVIGATION".equals(grant.type())) {
                if (!grant.code().matches("[1-9][0-9]{0,18}")) invalid("메뉴 번호가 올바르지 않습니다.");
                try {
                    Long.parseLong(grant.code());
                } catch (NumberFormatException ex) {
                    invalid("메뉴 번호가 너무 큽니다.");
                }
            } else {
                invalid("권한 유형이 올바르지 않습니다.");
            }
            if (!result.add(grant)) invalid("중복된 권한입니다.");
        }
        return result;
    }

    /** Revocation may only narrow a request. Missing ancestors never cause an implicit grant. */
    static void normalizeNavigationGrants(List<Grant> before, Set<Grant> desired, Map<String, String> parents) {
        var selected = new HashSet<String>();
        desired.stream().filter(grant -> "NAVIGATION".equals(grant.type())).forEach(grant -> selected.add(grant.code()));
        var removed = new HashSet<String>();
        before.stream().filter(grant -> "NAVIGATION".equals(grant.type()) && !selected.contains(grant.code()))
                .forEach(grant -> removed.add(grant.code()));
        for (Grant grant : new ArrayList<>(desired)) {
            if (!"NAVIGATION".equals(grant.type())) continue;
            var visited = new HashSet<String>();
            String current = grant.code();
            boolean ancestorRemoved = false;
            boolean ancestorMissing = false;
            while (current != null && !"0".equals(current)) {
                if (!visited.add(current)) invalid("순환하는 메뉴 계층은 배정할 수 없습니다.");
                if (!parents.containsKey(current)) invalid("존재하지 않는 메뉴 또는 상위 메뉴입니다.");
                ancestorRemoved |= removed.contains(current);
                ancestorMissing |= !selected.contains(current);
                current = parents.get(current);
            }
            if (ancestorRemoved) desired.remove(grant);
            else if (ancestorMissing) invalid("하위 메뉴를 표시하려면 상위 메뉴를 함께 선택해 주세요.");
        }
    }

    static TreeSet<String> distinctUsers(List<String> ids) {
        var result = new TreeSet<String>();
        for (String id : ids) {
            if (id == null || id.isBlank()) invalid("사용자 식별자가 비어 있습니다.");
            if (!result.add(id)) invalid("중복된 사용자입니다.");
        }
        return result;
    }

    static String describeUsers(List<UserChoice> users) {
        return users.stream().limit(5)
                .map(user -> Objects.toString(user.userNm(), user.id()) + "(" + Objects.toString(user.userId(), user.id()) + ")")
                .collect(Collectors.joining(", ")) + (users.size() > 5 ? " 외 " + (users.size() - 5) + "명" : "");
    }

    static String placeholders(int count) {
        return String.join(",", Collections.nCopies(count, "?"));
    }

    /**
     * 새 메뉴의 호환 관리자 배정 조건 — 모든 상위 메뉴의 표시가 이미 선택돼 있어야 한다.
     * A new child must not restore a parent whose navigation grant was explicitly revoked.
     */
    static boolean ancestorsShown(String code, Set<Grant> selected, Map<String, String> parents) {
        if (!parents.containsKey(code)) invalid("존재하지 않는 메뉴입니다.");
        var visited = new HashSet<String>();
        visited.add(code);
        String current = parents.get(code);
        while (current != null && !"0".equals(current)) {
            if (!visited.add(current) || !parents.containsKey(current)) invalid("상위 메뉴 계층이 올바르지 않습니다.");
            if (!selected.contains(new Grant("NAVIGATION", current))) return false;
            current = parents.get(current);
        }
        return true;
    }

    static List<NavigationConflict> findNavigationConflicts(
            TreeMap<String, Set<Long>> navigation,
            Map<Long, Long> movedParents,
            Map<String, Set<Long>> added,
            Map<String, Set<Long>> removed,
            Map<Long, List<Long>> compatibilityCandidates,
            Map<String, String> names) {
        added.forEach((group, ids) -> navigation.computeIfAbsent(group, ignored -> new HashSet<>()).addAll(ids));
        removed.forEach((group, ids) -> navigation.computeIfAbsent(group, ignored -> new HashSet<>()).removeAll(ids));
        var admin = navigation.computeIfAbsent("ROLE_ADMIN", ignored -> new HashSet<>());
        compatibilityCandidates.forEach((menu, ancestors) -> {
            if (admin.containsAll(ancestors)) admin.add(menu);
        });
        var conflicts = new ArrayList<NavigationConflict>();
        new TreeMap<>(movedParents).forEach((menu, parent) -> {
            if (parent == null) return;
            navigation.forEach((group, shown) -> {
                if (shown.contains(menu) && !shown.contains(parent)) {
                    conflicts.add(new NavigationConflict(menu, parent, group, names.getOrDefault(group, group)));
                }
            });
        });
        return conflicts;
    }

    static String buildHistoryWhereClause(String groupCode, String userId, String actorId,
            LocalDate fromDate, LocalDate toDate, MapSqlParameterSource parameters) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            invalid("조회 시작일은 종료일보다 늦을 수 없습니다.");
        }
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        if (groupCode != null && !groupCode.isBlank()) {
            where.append(" AND h.authrt_cd=:groupCode");
            parameters.addValue("groupCode", groupCode);
        }
        // [2026-10-01] 대상도 처리자처럼 로그인 ID 로 찾는다 — 종전에는 내부 식별자(esntlId)만 비교해 화면에서 아는 값으로는
        //   한 건도 찾지 못했다. 이력의 대상 칸은 esntlId 이므로 로그인 ID 는 사용자 표를 거쳐 맞춘다.
        if (userId != null && !userId.isBlank()) {
            where.append(" AND (h.scrty_dcsn_trgt_id=:userId OR h.scrty_dcsn_trgt_id IN (SELECT esntl_id FROM tb_user_info WHERE user_id=:userId))");
            parameters.addValue("userId", userId);
        }
        // [2026-09-26 DIP V9] 변경자는 esntlId(chg_user_idntfr)와 로그인 ID(frst_rgtr_id)로 함께 기록된다. 화면은
        //   '변경자 로그인 ID' 를 받는데 종전 조건은 esntlId 만 비교해 로그인 ID 로는 한 건도 찾지 못했다.
        if (actorId != null && !actorId.isBlank()) {
            where.append(" AND (h.frst_rgtr_id=:actorId OR h.chg_user_idntfr=:actorId)");
            parameters.addValue("actorId", actorId);
        }
        if (fromDate != null) {
            where.append(" AND h.crt_dt>=:fromDate");
            parameters.addValue("fromDate", Timestamp.valueOf(fromDate.atStartOfDay()));
        }
        if (toDate != null) {
            where.append(" AND h.crt_dt<:untilDate");
            parameters.addValue("untilDate", Timestamp.valueOf(toDate.plusDays(1).atStartOfDay()));
        }
        return where.toString();
    }

    static Change mapHistoryChange(ResultSet rs, int rowNum) throws SQLException {
        return new Change(
                rs.getLong("authrt_chg_hstry_sn"),
                rs.getString("dmnd_idntfr"),
                rs.getString("plcy_ver_no"),
                rs.getString("chg_trgt_type_cd"),
                rs.getString("chg_type_cd"),
                rs.getString("authrt_cd"),
                rs.getString("scrty_dcsn_trgt_id"),
                rs.getString("target_user_nm"),
                rs.getString("authrt_type_cd"),
                rs.getString("authrt_grnt_cd"),
                rs.getString("chg_artcl_nm"),
                rs.getString("chg_bfr_cn"),
                rs.getString("chg_aftr_cn"),
                rs.getString("chg_user_idntfr"),
                rs.getString("actor_nm"),
                rs.getTimestamp("crt_dt").toLocalDateTime(),
                rs.getString("chg_rsn"));
    }

    static PageRequest pagination(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
    }

    static String auditLogin() {
        return SecurityUtil.getCurrentLoginId().orElse("SYSTEM");
    }

    static void requireVersion(String current, String expected) {
        if (expected == null || !current.equals(expected)) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "다른 변경이 있습니다. 전체 배정을 다시 조회한 뒤 저장해 주세요.");
        }
    }

    static void invalid(String message) {
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, message);
    }
}
