package nuri.business.service.auth;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.auth.dto.AuthorizationDto.*;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Audited authorization mutations. The reserved ADMIN row serializes last-manager checks across nodes. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorizationAdministrationService implements nuri.business.service.login.ProtectedAccountChangeGuard {
    private final JdbcTemplate jdbc;
    private static final Set<String> RESERVED = Set.of("ROLE_ADMIN", "ROLE_SYSTEM", "ROLE_USER", "ROLE_ANONYMOUS");
    private static final Set<String> PROTECTED_PERMISSIONS = Set.of("AUTHRT_GRANT", "AUTHRT_ASSIGN", "USER_PASSWORD");
    // Recovery authority needs the same trusted administration boundary without changing D02 account classification.
    private static final Set<String> SENSITIVE_ADMINISTRATION_PERMISSIONS = Set.of("AUTHRT_GRANT", "AUTHRT_ASSIGN", "USER_PASSWORD", "MFA_RECOVER");

    public List<GroupSummary> groups() {
        SecurityUtil.assertPermission("AUTHRT_READ");
        return jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_info ORDER BY authrt_cd", String.class)
                .stream().map(this::readGroup).map(g -> new GroupSummary(g.code(), g.name(), g.description(), g.version())).toList();
    }

    public GroupSnapshot group(String code) {
        SecurityUtil.assertPermission("AUTHRT_READ");
        return readGroup(code);
    }

    private GroupSnapshot readGroup(String code) {
        var rows = jdbc.query("SELECT authrt_cd,authrt_nm,authrt_expln FROM tb_authrt_info WHERE authrt_cd=?",
                (rs, n) -> new GroupSummary(rs.getString(1),rs.getString(2),rs.getString(3),null), code);
        if (rows.isEmpty()) throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        var g = rows.getFirst();
        var grants = readGrants(code);
        String state = Objects.toString(g.name(), "") + "\n" + Objects.toString(g.description(), "") + "\n" + grants;
        return new GroupSnapshot(code,g.name(),g.description(),grants,groupVersion(code, state),true);
    }

    private List<Grant> readGrants(String code) {
        return jdbc.query("SELECT authrt_type_cd,authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_cd=? ORDER BY authrt_type_cd,authrt_grnt_cd",
                (rs,n) -> new Grant(rs.getString(1),rs.getString(2)),code);
    }

    public MembershipSnapshot memberships(String userId) {
        SecurityUtil.assertPermission("AUTHRT_READ");
        return readMemberships(userId);
    }

    private MembershipSnapshot readMemberships(String userId) {
        if (jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id=?",Long.class,userId) == 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        var groups = jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=? ORDER BY authrt_cd",String.class,userId);
        return new MembershipSnapshot(userId,groups,membershipVersion(userId,groups.toString()),true);
    }

    /**
     * [2026-10-01] 그룹에 배정된 사용자를 그룹 쪽에서 본다. 종전에는 사용자별·부서별 두 방향뿐이라
     * '이 그룹을 가진 사람이 누구냐' 에 답하려면 사람이나 부서를 하나씩 열어야 했고, 구성원이 있는 그룹을
     * 지우려 해도 해제할 대상을 볼 경로가 없었다. 이름·로그인 ID 순이며 연락처는 싣지 않는다.
     */
    public Page<UserChoice> groupMembers(String code, int page, int size) {
        SecurityUtil.assertPermission("AUTHRT_READ");
        if (jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd=?",Long.class,code) == 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        var pageable = pagination(page,size);
        var rows = jdbc.query("SELECT u.esntl_id,u.user_id,u.user_nm,u.ognz_id FROM tb_authrt_user_map m"
                + " JOIN tb_user_info u ON u.esntl_id=m.scrty_dcsn_trgt_id WHERE m.authrt_cd=?"
                + " ORDER BY u.user_nm,u.user_id LIMIT ? OFFSET ?",
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),
                code,pageable.getPageSize(),pageable.getOffset());
        Long total = jdbc.queryForObject("SELECT count(*) FROM tb_authrt_user_map m JOIN tb_user_info u"
                + " ON u.esntl_id=m.scrty_dcsn_trgt_id WHERE m.authrt_cd=?",Long.class,code);
        return new PageImpl<>(rows,pageable,Objects.requireNonNull(total));
    }

    public List<DepartmentChoice> departments() {
        SecurityUtil.assertPermission("AUTHRT_READ");
        return jdbc.query("SELECT ognz_id,ognz_nm FROM tb_ognz_info ORDER BY ognz_nm,ognz_id",
                (rs,n) -> new DepartmentChoice(rs.getString(1),rs.getString(2)));
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ, readOnly=true)
    public DepartmentSnapshot departmentMemberships(String departmentId) {
        SecurityUtil.assertPermission("AUTHRT_READ");
        return readDepartment(departmentId);
    }

    private DepartmentSnapshot readDepartment(String departmentId) {
        if (jdbc.queryForObject("SELECT count(*) FROM tb_ognz_info WHERE ognz_id=?", Long.class, departmentId)==0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        var users=jdbc.query("SELECT esntl_id,user_id,user_nm FROM tb_user_info WHERE ognz_id=? ORDER BY esntl_id",
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),departmentId),departmentId);
        var members=users.stream().map(user -> {
            var membership=readMemberships(user.id());
            return new DepartmentMember(user.id(),user.userId(),user.userNm(),membership.groups(),membership.version(),true);
        }).toList();
        String digest=AuthorizationSnapshotService.digest(PermissionCodes.CATALOG_VERSION+"\n"+departmentId+"\n"+members);
        return new DepartmentSnapshot(departmentId,members,digest,true);
    }

    /** A complete roster version protects a selected-user delta; other groups are preserved. */
    @Transactional
    public DepartmentSnapshot changeDepartmentGroups(String departmentId, ChangeDepartmentGroups request) {
        SecurityUtil.assertPermission("AUTHRT_ASSIGN");
        if (!request.complete() || request.userIds()==null || request.userIds().isEmpty()
                || !Set.of("ADD","REMOVE").contains(Objects.toString(request.action(),""))) invalid("전체 부서 배정을 조회한 뒤 대상을 선택해 주세요.");
        lockAndAuthorize("AUTHRT_ASSIGN");
        var before=readDepartment(departmentId); requireVersion(before.version(),request.version());
        readGroup(request.groupCode());
        if ("ADD".equals(request.action()) && "ROLE_ANONYMOUS".equals(request.groupCode())) invalid("공개 메뉴용 그룹은 로그인 사용자에게 배정할 수 없습니다.");
        var selected=new TreeSet<>(request.userIds());
        if (selected.size()!=request.userIds().size()) invalid("중복된 사용자입니다.");
        var roster=new HashSet<String>(); before.users().forEach(member -> roster.add(member.userId()));
        if (!roster.containsAll(selected)) invalid("선택 사용자가 현재 부서에 속하지 않습니다.");
        long managers=managerCount(); String requestId=UUID.randomUUID().toString();
        for (var member: before.users()) if (selected.contains(member.userId())) {
            var desired=new TreeSet<>(member.groups());
            if ("ADD".equals(request.action())) desired.add(request.groupCode()); else desired.remove(request.groupCode());
            applyMemberships(requestId,member.userId(),member.groups(),desired);
        }
        protectLastManager(managers);
        return readDepartment(departmentId);
    }

    /**
     * [2026-10-02] 그룹 버전은 그룹 자신의 이력(GROUP·GROUP_GRANT)만 본다. 종전에는 그룹과 사용자를 같은 조건
     * ({@code authrt_cd=? OR scrty_dcsn_trgt_id=?})으로 셌는데, 구성원 추가·회수(USER_GROUP 행)도 {@code authrt_cd} 에
     * 그 그룹을 싣기 때문에 구성원 탭에서 저장하면 같은 그룹의 기능권한 초안이 409 가 됐다. 그룹 스냅샷은 구성원을 담지 않고
     * 그룹 삭제는 잠금 아래에서 구성원 수를 다시 세므로 이 분리로 막던 것은 없다. 각 축 안의 ABA 방지(마지막 이력 번호)는 유지된다.
     */
    private String groupVersion(String code, String state) {
        Long last = jdbc.queryForObject("SELECT coalesce(max(authrt_chg_hstry_sn),0) FROM tb_authrt_chg_hstry WHERE authrt_cd=? AND chg_trgt_type_cd<>'USER_GROUP'",Long.class,code);
        return versionDigest(code,state,last);
    }

    /** 사용자의 그룹 배정 버전 — 그 사용자를 대상으로 한 이력(USER_GROUP 행)만 본다. */
    private String membershipVersion(String userId, String state) {
        Long last = jdbc.queryForObject("SELECT coalesce(max(authrt_chg_hstry_sn),0) FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id=?",Long.class,userId);
        return versionDigest(userId,state,last);
    }

    private static String versionDigest(String target, String state, Long last) {
        // Including the most recent immutable delta prevents a changed-then-restored (ABA) overwrite.
        return AuthorizationSnapshotService.digest(PermissionCodes.CATALOG_VERSION + "\n" + target + "\n" + state + "\n" + last);
    }

    /** 메뉴 시드의 자리표시자({@code dir}·{@code #})와 빈 값은 화면 경로가 아니다. */
    private static String routeOf(String modernRoute) {
        if (modernRoute == null || modernRoute.isBlank() || "#".equals(modernRoute) || "dir".equalsIgnoreCase(modernRoute)) return null;
        return modernRoute;
    }

    public Catalog catalog() {
        SecurityUtil.assertPermission("AUTHRT_READ");
        List<Operation> operations = new ArrayList<>();
        try (var input = new ClassPathResource("authorization/permission-catalog.json").getInputStream()) {
            for (JsonNode item : JsonMapper.builder().configureForJackson2().build().readTree(input).path("permissions")) {
                operations.add(new Operation(item.path("code").asString(),item.path("domain").asString(),item.path("action").asString(),item.path("name").asString()));
            }
        } catch (IOException | JacksonException ex) { throw new IllegalStateException("Permission catalog unavailable",ex); }
        // 사용 여부는 사이드바와 같은 판정(값이 'Y' 일 때만 사용)으로 정규화한다 — NULL 을 사용 중으로 보이지 않게 한다.
        var navigation = jdbc.query("SELECT menu_sn::text,menu_nm,CASE WHEN up_menu_sn IS NULL OR up_menu_sn=0 THEN NULL ELSE up_menu_sn::text END,modern_route,use_yn FROM tb_menu_info ORDER BY menu_ordr NULLS LAST,menu_sn",
                (rs,n) -> new Navigation(rs.getString(1),rs.getString(2),rs.getString(3),routeOf(rs.getString(4)),"Y".equals(rs.getString(5))?"Y":"N"));
        return new Catalog(List.copyOf(operations),navigation,PermissionCodes.CATALOG_VERSION);
    }

    public Page<UserChoice> users(String keyword, int page, int size) {
        SecurityUtil.assertPermission("AUTHRT_READ");
        var pageable = pagination(page,size);
        String term = "%" + Objects.toString(keyword, "").replace("!","!!").replace("%","!%").replace("_","!_") + "%";
        var rows = jdbc.query("SELECT esntl_id,user_id,user_nm,ognz_id FROM tb_user_info WHERE user_id LIKE ? ESCAPE '!' OR user_nm LIKE ? ESCAPE '!' ORDER BY user_id LIMIT ? OFFSET ?",
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),term,term,pageable.getPageSize(),pageable.getOffset());
        Long total = jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE user_id LIKE ? ESCAPE '!' OR user_nm LIKE ? ESCAPE '!'",Long.class,term,term);
        return new PageImpl<>(rows,pageable,Objects.requireNonNull(total));
    }

    /** [2026-10-02] 저장 뒤 스냅샷을 돌려준다 — 화면이 새 버전을 알아 다른 탭의 초안을 이어받게 하기 위해서다. */
    @Transactional
    public GroupSnapshot createGroup(CreateGroup request) {
        SecurityUtil.assertPermission("AUTHRT_CREATE");
        lockAndAuthorize("AUTHRT_CREATE");
        if (RESERVED.contains(request.code())) invalid("예약된 그룹 코드는 생성할 수 없습니다.");
        if (jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd=?",Long.class,request.code()) != 0) invalid("이미 존재하는 그룹입니다.");
        insertGroup(UUID.randomUUID().toString(),request.code(),request.name(),request.description(),null);
        return readGroup(request.code());
    }

    private void insertGroup(String id, String code, String name, String description, String reason) {
        String actor = auditLogin();
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_expln,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",
                code,name,description,LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE),actor,actor);
        audit(id,"GROUP","ADD",code,null,null,"authrt_nm",null,name,reason);
        if (description!=null) audit(id,"GROUP","ADD",code,null,null,"authrt_expln",null,description,reason);
    }

    @Transactional
    public GroupSnapshot updateGroup(String code, UpdateGroup request) {
        SecurityUtil.assertPermission("AUTHRT_UPDATE");
        lockAndAuthorize("AUTHRT_UPDATE");
        var before = readGroup(code); requireVersion(before.version(),request.version());
        String id = UUID.randomUUID().toString();
        jdbc.update("UPDATE tb_authrt_info SET authrt_nm=?,authrt_expln=?,mdfcn_dt=CURRENT_TIMESTAMP,last_mdfr_id=? WHERE authrt_cd=?",request.name(),request.description(),auditLogin(),code);
        audit(id,"GROUP","UPDATE",code,null,null,"authrt_nm",before.name(),request.name());
        audit(id,"GROUP","UPDATE",code,null,null,"authrt_expln",before.description(),request.description());
        return readGroup(code);
    }

    /**
     * [2026-10-02] 그룹 복제. 원본의 기능권한·메뉴 표시를 새 그룹에 그대로 옮기고 구성원은 옮기지 않는다. 새 그룹에
     * 권한을 주는 일이므로 생성(AUTHRT_CREATE)과 함께 권한 부여(AUTHRT_GRANT)를 요구하고, 보호 권한이 옮겨 가면
     * {@link #applyGrants} 가 AUTHRT_GRANT·AUTHRT_ASSIGN 둘 다를 요구한다. 이력은 같은 요청 번호로 GROUP·GROUP_GRANT 행을
     * 남기고 사유 칸에 원본을 적는다 — 이력 표의 변경 유형 CHECK 를 넓히지 않기 위해 새 유형(COPY)을 만들지 않았다.
     */
    @Transactional
    public GroupSnapshot copyGroup(String source, CopyGroup request) {
        SecurityUtil.assertPermission("AUTHRT_CREATE");
        SecurityUtil.assertPermission("AUTHRT_GRANT");
        var parents = lockMenuParents();
        lockAndAuthorize("AUTHRT_CREATE");
        lockAndAuthorize("AUTHRT_GRANT");
        var original = readGroup(source); requireVersion(original.version(),request.sourceVersion());
        if (RESERVED.contains(request.code())) invalid("예약된 그룹 코드는 생성할 수 없습니다.");
        if (jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd=?",Long.class,request.code()) != 0) invalid("이미 존재하는 그룹입니다.");
        if ("ROLE_ANONYMOUS".equals(source)) invalid("공개 메뉴용 그룹은 복제할 수 없습니다.");
        var desired = new TreeSet<>(original.grants());
        var orphans = navigationWithoutSelectedAncestor(desired,parents);
        if (!orphans.isEmpty()) invalid("원본 그룹에 상위 메뉴가 선택되지 않은 메뉴 표시가 있습니다: " + menuNames(orphans)
                + ". 원본 그룹의 메뉴 표시를 먼저 정리해 주세요.");
        // 다른 쓰기 경로처럼 기능 권한은 카탈로그로 검증한다. 퇴역한 코드가 원본에 남아 있으면 복제본에 배정된 사용자의
        // 권한 스냅샷 로딩이 실패하므로(AuthorizationSnapshotService fail-closed) 원본을 먼저 정리하게 한다.
        var unknown = desired.stream().filter(grant -> "OPERATION".equals(grant.type()) && !PermissionCodes.ALL.contains(grant.code()))
                .map(Grant::code).toList();
        if (!unknown.isEmpty()) invalid("원본 그룹에 알 수 없는 기능 권한이 있습니다: "
                + String.join(", ", unknown.stream().limit(5).toList()) + (unknown.size() > 5 ? " 외 " + (unknown.size()-5) + "개" : "")
                + ". 원본 그룹의 기능 권한을 먼저 정리해 주세요.");
        String id = UUID.randomUUID().toString();
        String reason = "복제 원본: " + source;
        insertGroup(id,request.code(),request.name(),request.description(),reason);
        normalizeNavigationGrants(List.of(),desired,parents);
        applyGrants(id,request.code(),List.of(),desired,reason);
        return readGroup(request.code());
    }

    /** 상위 메뉴(존재하지 않는 상위 포함) 중 하나라도 선택되지 않은 메뉴 표시 — 복제 전에 이름을 밝혀 거부한다. */
    private static List<String> navigationWithoutSelectedAncestor(Set<Grant> grants, Map<String,String> parents) {
        var selected = new HashSet<String>();
        grants.stream().filter(grant -> "NAVIGATION".equals(grant.type())).forEach(grant -> selected.add(grant.code()));
        var orphans = new ArrayList<String>();
        for (String code: new TreeSet<>(selected)) {
            var visited = new HashSet<String>();
            String current = parents.containsKey(code) ? parents.get(code) : code;
            while (current!=null && !"0".equals(current)) {
                if (!visited.add(current) || !parents.containsKey(current) || !selected.contains(current)) { orphans.add(code); break; }
                current = parents.get(current);
            }
        }
        return orphans;
    }

    /** 메시지용 메뉴 이름. 지워진 메뉴는 번호로 남는다. */
    private String menuNames(List<String> codes) {
        var names = new HashMap<String,String>();
        jdbc.query("SELECT menu_sn::text,menu_nm FROM tb_menu_info ORDER BY menu_sn",
                (rs,n) -> names.put(rs.getString(1),rs.getString(2)));
        return codes.stream().limit(5).map(code -> "'" + names.getOrDefault(code,code) + "'")
                .collect(java.util.stream.Collectors.joining(", ")) + (codes.size() > 5 ? " 외 " + (codes.size()-5) + "개" : "");
    }

    /** [2026-10-02] 전체 그룹의 권한을 한 스냅샷으로 읽는다(코드 순). */
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ, readOnly=true)
    public GrantMatrix grantMatrix() {
        SecurityUtil.assertPermission("AUTHRT_READ");
        var groups = jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_info ORDER BY authrt_cd", String.class)
                .stream().map(this::readGroup).toList();
        return new GrantMatrix(PermissionCodes.CATALOG_VERSION,groups);
    }

    @Transactional
    public void deleteGroup(String code, String expectedVersion) {
        SecurityUtil.assertPermission("AUTHRT_DELETE");
        lockAndAuthorize("AUTHRT_DELETE");
        if (RESERVED.contains(code)) invalid("예약된 그룹은 삭제할 수 없습니다.");
        var before = readGroup(code); requireVersion(before.version(),expectedVersion);
        // [2026-10-01] 거부 사유에 배정 인원을 싣는다 — 종전 409 는 기본 문구뿐이라 몇 명을 해제해야 하는지 알 수 없었다.
        long assigned = Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_user_map WHERE authrt_cd=?",Long.class,code));
        if (assigned != 0) throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                "이 그룹에 배정된 사용자 " + assigned + "명이 있어 삭제할 수 없습니다. 구성원 목록에서 배정을 먼저 해제하세요.");
        if (before.grants().stream().anyMatch(AuthorizationAdministrationService::isSensitiveAdministrationGrant)) authorizeProtectedAdministration();
        String id = UUID.randomUUID().toString();
        for (var grant: before.grants()) removeGrant(id,code,grant);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd=?",code);
        audit(id,"GROUP","REMOVE",code,null,null,"authrt_nm",before.name(),null);
        if (before.description()!=null) audit(id,"GROUP","REMOVE",code,null,null,"authrt_expln",before.description(),null);
    }

    @Transactional
    public GroupSnapshot replaceGrants(String code, ReplaceGrants request) {
        SecurityUtil.assertPermission("AUTHRT_GRANT");
        if (!request.complete() || request.grants()==null) invalid("전체 권한을 조회한 뒤 저장해 주세요.");
        TreeSet<Grant> desired = validateGrants(request.grants());
        var parents = lockMenuParents();
        lockAndAuthorize("AUTHRT_GRANT");
        var before = readGroup(code); requireVersion(before.version(),request.version());
        normalizeNavigationGrants(before.grants(),desired,parents);
        long managers = managerCount();
        applyGrants(UUID.randomUUID().toString(),code,before.grants(),desired);
        protectLastManager(managers);
        return readGroup(code);
    }

    private TreeSet<Grant> validateGrants(List<Grant> grants) {
        var result = new TreeSet<Grant>();
        for (var grant: grants) {
            if (grant==null || grant.code()==null) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,"권한 값이 필요합니다.");
            }
            if ("OPERATION".equals(grant.type())) {
                if (!PermissionCodes.ALL.contains(grant.code())) invalid("알 수 없는 기능 권한입니다.");
            } else if ("NAVIGATION".equals(grant.type())) {
                if (!grant.code().matches("[1-9][0-9]{0,18}")) invalid("메뉴 번호가 올바르지 않습니다.");
                try { Long.parseLong(grant.code()); } catch (NumberFormatException ex) { invalid("메뉴 번호가 너무 큽니다."); }
            } else invalid("권한 유형이 올바르지 않습니다.");
            if (!result.add(grant)) invalid("중복된 권한입니다.");
        }
        return result;
    }

    private void lockMenus(List<Long> ids) {
        ids.stream().distinct().sorted().forEach(id -> {
            var found = jdbc.queryForList("SELECT menu_sn FROM tb_menu_info WHERE menu_sn=? FOR UPDATE",Long.class,id);
            if (found.isEmpty()) invalid("존재하지 않는 메뉴입니다.");
        });
    }

    private record MenuParent(String code, String parentCode) {}

    /** Stabilize parent links before ADMIN; allow the deferred self-FK's KEY SHARE during a move. */
    private Map<String,String> lockMenuParents() {
        var rows = jdbc.query("SELECT menu_sn::text,up_menu_sn::text FROM tb_menu_info ORDER BY menu_sn FOR NO KEY UPDATE",
                (rs,n) -> new MenuParent(rs.getString(1),rs.getString(2)));
        var parents = new HashMap<String,String>();
        rows.forEach(row -> parents.put(row.code(),row.parentCode()));
        return parents;
    }

    /** Revocation may only narrow a request. Missing ancestors never cause an implicit grant. */
    private void normalizeNavigationGrants(List<Grant> before, Set<Grant> desired, Map<String,String> parents) {
        var selected = new HashSet<String>();
        desired.stream().filter(grant -> "NAVIGATION".equals(grant.type())).forEach(grant -> selected.add(grant.code()));
        var removed = new HashSet<String>();
        before.stream().filter(grant -> "NAVIGATION".equals(grant.type()) && !selected.contains(grant.code()))
                .forEach(grant -> removed.add(grant.code()));
        for (Grant grant: new ArrayList<>(desired)) {
            if (!"NAVIGATION".equals(grant.type())) continue;
            var visited = new HashSet<String>();
            String current = grant.code();
            boolean ancestorRemoved = false;
            boolean ancestorMissing = false;
            while (current!=null && !"0".equals(current)) {
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

    private void applyGrants(String request, String group, List<Grant> before, Set<Grant> desired) {
        applyGrants(request,group,before,desired,null);
    }

    private void applyGrants(String request, String group, List<Grant> before, Set<Grant> desired, String reason) {
        boolean changesSensitiveGrant = before.stream().anyMatch(grant -> isSensitiveAdministrationGrant(grant) && !desired.contains(grant))
                || desired.stream().anyMatch(grant -> isSensitiveAdministrationGrant(grant) && !before.contains(grant));
        if (changesSensitiveGrant) authorizeProtectedAdministration();
        for (Grant old: before) if (!desired.contains(old)) removeGrant(request,group,old);
        for (Grant grant: desired) if (!before.contains(grant)) addGrant(request,group,grant,reason);
    }

    private void addGrant(String request, String group, Grant grant) {
        addGrant(request,group,grant,null);
    }

    private void addGrant(String request, String group, Grant grant, String reason) {
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",group,grant.type(),grant.code(),auditLogin(),auditLogin());
        audit(request,"GROUP_GRANT","ADD",group,null,grant,"grant",null,grant.code(),reason);
    }

    private void removeGrant(String request, String group, Grant grant) {
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=? AND authrt_type_cd=? AND authrt_grnt_cd=?",group,grant.type(),grant.code());
        audit(request,"GROUP_GRANT","REMOVE",group,null,grant,"grant",grant.code(),null);
    }

    @Transactional
    public void replaceMemberships(String userId, ReplaceGroups request) {
        SecurityUtil.assertPermission("AUTHRT_ASSIGN");
        if (!request.complete() || request.groups()==null) invalid("전체 그룹 배정을 조회한 뒤 저장해 주세요.");
        lockAndAuthorize("AUTHRT_ASSIGN");
        var before = readMemberships(userId); requireVersion(before.version(),request.version());
        var desired = new TreeSet<>(request.groups());
        if (desired.contains("ROLE_ANONYMOUS")) invalid("공개 메뉴용 그룹은 로그인 사용자에게 배정할 수 없습니다.");
        if (desired.size()!=request.groups().size()) invalid("중복된 그룹입니다.");
        for (String group: desired) readGroup(group);
        long managers = managerCount();
        applyMemberships(UUID.randomUUID().toString(),userId,before.groups(),desired);
        protectLastManager(managers);
    }

    private void applyMemberships(String request, String userId, List<String> before, Set<String> desired) {
        // Sensitive membership changes must not bypass protected-account or MFA recovery administration.
        // Inspect changed groups themselves, even if another group currently supplies the same grant.
        var changedGroups = new TreeSet<>(before);
        changedGroups.addAll(desired);
        changedGroups.removeIf(group -> before.contains(group) && desired.contains(group));
        if (changedGroups.stream().anyMatch(group -> readGrants(group).stream()
                .anyMatch(AuthorizationAdministrationService::isSensitiveAdministrationGrant))) authorizeProtectedAdministration();
        for (String group: before) if (!desired.contains(group)) removeMembership(request,userId,group);
        for (String group: desired) if (!before.contains(group)) addMembership(request,userId,group);
    }

    private void removeMembership(String request, String userId, String group) {
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=? AND authrt_cd=?",userId,group);
        audit(request,"USER_GROUP","REMOVE",group,userId,null,"membership",group,null);
    }

    private void addMembership(String request, String userId, String group) {
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",userId,group,auditLogin(),auditLogin());
        audit(request,"USER_GROUP","ADD",group,userId,null,"membership",null,group);
    }

    /**
     * [2026-10-02 D6] 그룹 쪽에서 구성원을 한꺼번에 추가·회수한다. 각 사용자의 다른 그룹 배정은 그대로다.
     * <p>버전 대신 변경의 전제(추가 대상은 아직 구성원이 아니고 회수 대상은 지금 구성원이다)로 동시성을 본다 — 다른
     * 관리자가 먼저 바꾼 사람이 있으면 그 사람을 이름으로 밝혀 409 로 전부 거부한다. 그룹 전체 버전으로 막으면 서로 다른
     * 사람을 고친 두 관리자도 충돌하고, 사람별 버전을 받으면 화면이 고른 사람마다 다시 읽어야 한다.
     * <p>그룹이 보호 권한(AUTHRT_GRANT·AUTHRT_ASSIGN·USER_PASSWORD·MFA_RECOVER)을 가지면 사용자별 배정 변경과 같은 이유로
     * AUTHRT_GRANT·AUTHRT_ASSIGN 둘 다를 요구하며, 마지막 활성 권한관리자를 회수할 수 없다.
     * <p>거부 사유와 응답이 대상의 이름·로그인 ID·구성원 여부를 담으므로 배정 권한(AUTHRT_ASSIGN)과 함께 조회 권한
     * (AUTHRT_READ)도 요구한다.
     */
    @Transactional
    public GroupMembersChange changeGroupMembers(String code, ChangeGroupMembers request) {
        SecurityUtil.assertPermission("AUTHRT_ASSIGN");
        // 거부 사유와 응답에 대상의 이름·로그인 ID·구성원 여부가 실린다 — 그룹 구성원 조회(AUTHRT_READ)가 주는 정보다.
        // 버전을 받지 않으므로 다른 배정 경로처럼 조회 권한이 묵시로 요구되지 않는다. 그래서 명시로 요구한다(H3).
        SecurityUtil.assertPermission("AUTHRT_READ");
        if (!request.complete() || request.add()==null || request.remove()==null) invalid("구성원 목록을 다시 조회한 뒤 저장해 주세요.");
        var add = distinctUsers(request.add());
        var remove = distinctUsers(request.remove());
        if (add.isEmpty() && remove.isEmpty()) invalid("추가하거나 회수할 사용자를 선택해 주세요.");
        if (add.stream().anyMatch(remove::contains)) invalid("같은 사용자를 추가와 회수에 함께 지정할 수 없습니다.");
        lockAndAuthorize("AUTHRT_ASSIGN");
        var group = readGroup(code);
        if (!add.isEmpty() && "ROLE_ANONYMOUS".equals(code)) invalid("공개 메뉴용 그룹은 로그인 사용자에게 배정할 수 없습니다.");
        var targets = new TreeSet<String>(add); targets.addAll(remove);
        var users = usersById(targets);
        var missing = targets.stream().filter(id -> !users.containsKey(id)).limit(5).toList();
        if (!missing.isEmpty()) invalid("존재하지 않는 사용자가 있습니다: " + String.join(", ", missing));
        List<Object> memberArgs = new ArrayList<>(); memberArgs.add(code); memberArgs.addAll(targets);
        var members = new HashSet<>(jdbc.queryForList("SELECT scrty_dcsn_trgt_id FROM tb_authrt_user_map WHERE authrt_cd=? AND scrty_dcsn_trgt_id IN ("
                + placeholders(targets.size()) + ")",String.class,memberArgs.toArray()));
        var alreadyMembers = add.stream().filter(members::contains).map(users::get).toList();
        var notMembers = remove.stream().filter(id -> !members.contains(id)).map(users::get).toList();
        if (!alreadyMembers.isEmpty() || !notMembers.isEmpty()) {
            var reasons = new ArrayList<String>();
            if (!alreadyMembers.isEmpty()) reasons.add("이미 구성원인 사용자 " + describeUsers(alreadyMembers));
            if (!notMembers.isEmpty()) reasons.add("구성원이 아닌 사용자 " + describeUsers(notMembers));
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION, "다른 곳에서 구성원이 바뀌었습니다("
                    + String.join(", ", reasons) + "). 구성원 목록을 다시 불러온 뒤 저장해 주세요.");
        }
        if (group.grants().stream().anyMatch(AuthorizationAdministrationService::isSensitiveAdministrationGrant)) authorizeProtectedAdministration();
        long managers = managerCount();
        String requestId = UUID.randomUUID().toString();
        var added = new ArrayList<UserChoice>();
        var removed = new ArrayList<UserChoice>();
        for (String userId: targets) {
            if (add.contains(userId)) { addMembership(requestId,userId,code); added.add(users.get(userId)); }
            else { removeMembership(requestId,userId,code); removed.add(users.get(userId)); }
        }
        protectLastManager(managers);
        long memberCount = Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_user_map WHERE authrt_cd=?",Long.class,code));
        return new GroupMembersChange(code,List.copyOf(added),List.copyOf(removed),memberCount);
    }

    private static TreeSet<String> distinctUsers(List<String> ids) {
        var result = new TreeSet<String>();
        for (String id: ids) {
            if (id==null || id.isBlank()) invalid("사용자 식별자가 비어 있습니다.");
            if (!result.add(id)) invalid("중복된 사용자입니다.");
        }
        return result;
    }

    /** 대상 사용자를 한 번에 읽는다. 상태와 무관하게 존재만 본다 — 비활성 계정의 배정 회수도 막지 않는다. */
    private Map<String,UserChoice> usersById(Set<String> ids) {
        var users = new HashMap<String,UserChoice>();
        jdbc.query("SELECT esntl_id,user_id,user_nm,ognz_id FROM tb_user_info WHERE esntl_id IN (" + placeholders(ids.size()) + ")",
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),ids.toArray())
                .forEach(user -> users.put(user.id(),user));
        return users;
    }

    private static String describeUsers(List<UserChoice> users) {
        return users.stream().limit(5).map(user -> Objects.toString(user.userNm(),user.id()) + "(" + Objects.toString(user.userId(),user.id()) + ")")
                .collect(java.util.stream.Collectors.joining(", ")) + (users.size() > 5 ? " 외 " + (users.size()-5) + "명" : "");
    }

    private static String placeholders(int count) {
        return String.join(",", Collections.nCopies(count,"?"));
    }

    /** Signup's only default. This is called from the user-creation transaction after flush. */
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void assignNewUser(String userId) {
        lockAdministration();
        var before = readMemberships(userId);
        if (!before.groups().isEmpty()) invalid("이미 배정된 사용자의 가입 기본 그룹을 다시 설정할 수 없습니다.");
        applyMemberships(UUID.randomUUID().toString(),userId,List.of(),Set.of("ROLE_USER"));
    }

    /** User deletion already has USER_DELETE; it must still retain the last active authorization manager. */
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void removeDeletedUsers(List<String> userIds) {
        SecurityUtil.assertPermission("USER_DELETE");
        lockAndAuthorize("USER_DELETE"); long managers=managerCount(); String request=UUID.randomUUID().toString();
        for (String userId: new TreeSet<>(userIds)) applyMemberships(request,userId,readMemberships(userId).groups(),Set.of());
        protectLastManager(managers);
    }

    @Transactional
    public void replaceNavigationGrants(String group, List<Long> ids, String expectedVersion) {
        SecurityUtil.assertPermission("AUTHRT_GRANT");
        var parents=lockMenuParents(); lockAndAuthorize("AUTHRT_GRANT"); var before=readGroup(group); requireVersion(before.version(),expectedVersion);
        var desired=new TreeSet<Grant>();
        before.grants().stream().filter(g -> "OPERATION".equals(g.type())).forEach(desired::add);
        ids.forEach(id -> desired.add(new Grant("NAVIGATION",id.toString())));
        normalizeNavigationGrants(before.grants(),desired,parents);
        applyGrants(UUID.randomUUID().toString(),group,before.grants(),desired);
    }

    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void grantNewMenuToCompatibilityAdmin(Long menuId) {
        SecurityUtil.assertPermission("MENU_CREATE");
        var parents=lockMenuParents(); lockAndAuthorize("MENU_CREATE");
        var grant=new Grant("NAVIGATION",menuId.toString());
        var before=readGrants("ROLE_ADMIN");
        if (before.contains(grant)) return;
        if (!ancestorsShown(grant.code(),new TreeSet<>(before),parents)) return;
        addGrant(UUID.randomUUID().toString(),"ROLE_ADMIN",grant);
    }

    /**
     * 새 메뉴의 호환 관리자 배정 조건 — 모든 상위 메뉴의 표시가 이미 선택돼 있어야 한다.
     * A new child must not restore a parent whose navigation grant was explicitly revoked.
     */
    private static boolean ancestorsShown(String code, Set<Grant> selected, Map<String,String> parents) {
        if (!parents.containsKey(code)) invalid("존재하지 않는 메뉴입니다.");
        var visited=new HashSet<String>(); visited.add(code);
        String current=parents.get(code);
        while (current!=null && !"0".equals(current)) {
            if (!visited.add(current) || !parents.containsKey(current)) invalid("상위 메뉴 계층이 올바르지 않습니다.");
            if (!selected.contains(new Grant("NAVIGATION",current))) return false;
            current=parents.get(current);
        }
        return true;
    }

    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void removeNavigationGrantsForMenus(List<Long> ids) {
        SecurityUtil.assertPermission("MENU_DELETE");
        lockMenus(ids); lockAndAuthorize("MENU_DELETE"); String request=UUID.randomUUID().toString();
        for (Long id: ids) {
            var groups=jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' AND authrt_grnt_cd=? ORDER BY authrt_cd",String.class,id.toString());
            for (String group: groups) removeGrant(request,group,new Grant("NAVIGATION",id.toString()));
        }
    }

    /**
     * [2026-10-02 D2] 메뉴 구조 저장이 메뉴를 바꾸기 전에 함께 바꿀 그룹들의 버전을 확인한다. 메뉴 행 → ADMIN 잠금 순서는
     * 권한 저장과 같다. 하나라도 낡았으면 409 로 메뉴 변경까지 전부 되돌린다.
     */
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void assertGroupVersions(List<GroupVersion> groups) {
        SecurityUtil.assertPermission("AUTHRT_GRANT");
        lockMenuParents();
        lockAndAuthorize("AUTHRT_GRANT");
        for (var expected: groups.stream().sorted(Comparator.comparing(GroupVersion::code)).toList()) {
            // 그룹 권한 행을 읽은 뒤 그 그룹이 지워졌으면 초안이 낡은 것이다 — 404 가 아니라 다시 불러오라는 409 다.
            if (jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd=?",Long.class,expected.code()) == 0) {
                throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,"'" + expected.code()
                        + "' 그룹이 다른 곳에서 삭제되었습니다. 다시 불러온 뒤 저장해 주세요.");
            }
            var current = readGroup(expected.code());
            if (!current.version().equals(expected.version())) {
                throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,"'" + current.name()
                        + "' 그룹의 권한이 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.");
            }
        }
    }

    /**
     * [2026-10-02 D2] 메뉴를 옮겼을 때 사이드바에서 숨겨질 그룹을 찾는다. 사이드바는 상위 메뉴 표시가 없는 하위 메뉴를
     * 조용히 버리므로(MenuService#buildMenuTree), 옮긴 메뉴 m 의 표시를 가진 그룹 중 새 상위 p 의 표시가 없는 그룹이 그
     * 대상이다. 요청이 함께 바꾸는 그룹은 저장 뒤 상태(현재 ∪ 추가 − 회수)로 판정한다. 새 메뉴는 음수 임시 번호로 온다.
     * <p>{@code compatibilityCandidates} 는 저장 뒤 호환 관리자 배정을 받을 수 있는 새 메뉴 → 최종 상위(가까운 것부터)이며
     * 부모 먼저 순서다. 관리자 그룹(ROLE_ADMIN)은 상위를 모두 보는 새 메뉴의 표시를 저장 뒤 받으므로 판정에 미리 반영한다
     * ({@link #grantNewMenuToCompatibilityAdmin} 과 같은 조건). 반영하지 않으면 새 폴더를 만들고 관리자 그룹이 보던 메뉴를
     * 그 아래로 옮기는 저장이 '관리자 그룹에서 숨겨진다' 는 거짓 사유로 거부된다.
     */
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public List<NavigationConflict> navigationVisibilityConflicts(Map<Long,Long> movedParents,
            Map<String,Set<Long>> added, Map<String,Set<Long>> removed, Map<Long,List<Long>> compatibilityCandidates) {
        SecurityUtil.assertPermission("MENU_UPDATE");
        if (movedParents.isEmpty()) return List.of();
        var navigation = new TreeMap<String,Set<Long>>();
        jdbc.query("SELECT authrt_cd,authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' ORDER BY authrt_cd,authrt_grnt_cd",
                (rs,n) -> navigation.computeIfAbsent(rs.getString(1),ignored -> new HashSet<>()).add(Long.valueOf(rs.getString(2))));
        added.forEach((group,ids) -> navigation.computeIfAbsent(group,ignored -> new HashSet<>()).addAll(ids));
        removed.forEach((group,ids) -> navigation.computeIfAbsent(group,ignored -> new HashSet<>()).removeAll(ids));
        var admin = navigation.computeIfAbsent("ROLE_ADMIN",ignored -> new HashSet<>());
        compatibilityCandidates.forEach((menu,ancestors) -> { if (admin.containsAll(ancestors)) admin.add(menu); });
        var names = new HashMap<String,String>();
        jdbc.query("SELECT authrt_cd,authrt_nm FROM tb_authrt_info ORDER BY authrt_cd",
                (rs,n) -> names.put(rs.getString(1),rs.getString(2)));
        var conflicts = new ArrayList<NavigationConflict>();
        new TreeMap<>(movedParents).forEach((menu,parent) -> {
            if (parent==null) return;
            navigation.forEach((group,shown) -> {
                if (shown.contains(menu) && !shown.contains(parent)) {
                    conflicts.add(new NavigationConflict(menu,parent,group,names.getOrDefault(group,group)));
                }
            });
        });
        return conflicts;
    }

    /**
     * [2026-10-02 D2] 메뉴 구조 저장의 그룹별 메뉴 표시·기능권한 변경. 메뉴를 옮기고 저장(flush)한 뒤 부른다 — 상위 메뉴
     * 검사는 지금 DB 의 부모로 한다. 버전은 메뉴를 바꾸기 전에 {@link #assertGroupVersions} 가 확인했고, 그 사이 이 요청의
     * 메뉴 삭제가 회수한 표시는 여기서 다시 읽은 상태에 반영돼 있다. 상위 메뉴를 묵시로 주지 않는다.
     * <p>{@code compatibilityCandidates} 는 이 요청이 만든 새 메뉴 중 호환 관리자 배정을 받을 수 있는 것(부모 먼저)이다.
     * 관리자 그룹을 함께 바꾸면, 상위를 모두 보는 후보의 표시를 정리 전에 더한다 — 저장 뒤 호환 배정이 줄 표시이므로,
     * 그 아래 새 메뉴를 명시로 준 요청이 '상위 메뉴를 함께 선택' 으로 거부되지 않게 한다. 상위 조건은
     * {@link #grantNewMenuToCompatibilityAdmin} 과 같다.
     */
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void applyMenuStructureGrants(List<ResolvedGrantChange> changes, List<Long> compatibilityCandidates) {
        SecurityUtil.assertPermission("AUTHRT_GRANT");
        var parents = lockMenuParents();
        lockAndAuthorize("AUTHRT_GRANT");
        long managers = managerCount();
        String requestId = UUID.randomUUID().toString();
        for (var change: changes.stream().sorted(Comparator.comparing(ResolvedGrantChange::groupCode)).toList()) {
            var before = readGroup(change.groupCode());
            if ("ROLE_ANONYMOUS".equals(change.groupCode()) && !change.operationAdd().isEmpty()) {
                invalid("공개 메뉴용 그룹에는 기능 권한을 줄 수 없습니다.");
            }
            var desired = new TreeSet<>(before.grants());
            for (String operation: change.operationAdd()) {
                if (!PermissionCodes.ALL.contains(operation)) invalid("알 수 없는 기능 권한입니다: " + operation);
                desired.add(new Grant("OPERATION",operation));
            }
            change.navigationAdd().forEach(id -> desired.add(new Grant("NAVIGATION",id.toString())));
            change.navigationRemove().forEach(id -> desired.remove(new Grant("NAVIGATION",id.toString())));
            if ("ROLE_ADMIN".equals(change.groupCode())) {
                for (Long candidate: compatibilityCandidates) {
                    if (ancestorsShown(candidate.toString(),desired,parents)) desired.add(new Grant("NAVIGATION",candidate.toString()));
                }
            }
            normalizeNavigationGrants(before.grants(),desired,parents);
            applyGrants(requestId,change.groupCode(),before.grants(),desired);
        }
        protectLastManager(managers);
    }

    public Page<Change> history(int page, int size, String groupCode, String userId, String actorId,
                                LocalDate fromDate, LocalDate toDate) {
        SecurityUtil.assertPermission("AUTHRT_AUDIT"); var pageable=pagination(page,size);
        if (fromDate!=null && toDate!=null && fromDate.isAfter(toDate)) invalid("조회 시작일은 종료일보다 늦을 수 없습니다.");
        var parameters=new org.springframework.jdbc.core.namedparam.MapSqlParameterSource();
        StringBuilder where=new StringBuilder(" WHERE 1=1");
        if (groupCode!=null && !groupCode.isBlank()) { where.append(" AND h.authrt_cd=:groupCode"); parameters.addValue("groupCode",groupCode); }
        // [2026-10-01] 대상도 처리자처럼 로그인 ID 로 찾는다 — 종전에는 내부 식별자(esntlId)만 비교해 화면에서 아는 값으로는
        //   한 건도 찾지 못했다. 이력의 대상 칸은 esntlId 이므로 로그인 ID 는 사용자 표를 거쳐 맞춘다.
        if (userId!=null && !userId.isBlank()) { where.append(" AND (h.scrty_dcsn_trgt_id=:userId OR h.scrty_dcsn_trgt_id IN (SELECT esntl_id FROM tb_user_info WHERE user_id=:userId))"); parameters.addValue("userId",userId); }
        // [2026-09-26 DIP V9] 변경자는 esntlId(chg_user_idntfr)와 로그인 ID(frst_rgtr_id)로 함께 기록된다. 화면은
        //   '변경자 로그인 ID' 를 받는데 종전 조건은 esntlId 만 비교해 로그인 ID 로는 한 건도 찾지 못했다.
        if (actorId!=null && !actorId.isBlank()) { where.append(" AND (h.frst_rgtr_id=:actorId OR h.chg_user_idntfr=:actorId)"); parameters.addValue("actorId",actorId); }
        if (fromDate!=null) { where.append(" AND h.crt_dt>=:fromDate"); parameters.addValue("fromDate",java.sql.Timestamp.valueOf(fromDate.atStartOfDay())); }
        if (toDate!=null) { where.append(" AND h.crt_dt<:untilDate"); parameters.addValue("untilDate",java.sql.Timestamp.valueOf(toDate.plusDays(1).atStartOfDay())); }
        var query=new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(jdbc);
        parameters.addValue("size",pageable.getPageSize()).addValue("offset",pageable.getOffset());
        // 처리자·대상 사용자 이름을 함께 싣는다 — 종전 화면은 내부 식별자(esntlId)만 보여 누가 바꿨는지 읽을 수 없었다.
        //   탈퇴 등으로 사용자가 없으면 이름은 null 이고 식별자가 남는다.
        var rows=query.query("SELECT h.*, actor.user_nm AS actor_nm, target.user_nm AS target_user_nm"
                + " FROM tb_authrt_chg_hstry h"
                + " LEFT JOIN tb_user_info actor ON actor.esntl_id=h.chg_user_idntfr"
                + " LEFT JOIN tb_user_info target ON target.esntl_id=h.scrty_dcsn_trgt_id"
                + where+" ORDER BY h.authrt_chg_hstry_sn DESC LIMIT :size OFFSET :offset",parameters,(rs,n) -> new Change(
                rs.getLong("authrt_chg_hstry_sn"),rs.getString("dmnd_idntfr"),rs.getString("plcy_ver_no"),rs.getString("chg_trgt_type_cd"),rs.getString("chg_type_cd"),
                rs.getString("authrt_cd"),rs.getString("scrty_dcsn_trgt_id"),rs.getString("target_user_nm"),rs.getString("authrt_type_cd"),rs.getString("authrt_grnt_cd"),rs.getString("chg_artcl_nm"),
                rs.getString("chg_bfr_cn"),rs.getString("chg_aftr_cn"),rs.getString("chg_user_idntfr"),rs.getString("actor_nm"),rs.getTimestamp("crt_dt").toLocalDateTime(),
                rs.getString("chg_rsn")));
        return new PageImpl<>(rows,pageable,Objects.requireNonNull(query.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry h"+where,parameters,Long.class)));
    }

    private void audit(String request, String target, String change, String group, String userId, Grant grant, String field, String before, String after) {
        audit(request,target,change,group,userId,grant,field,before,after,null);
    }

    /** {@code reason} 은 이력의 사유 칸(chg_rsn)이다. 복제는 원본 그룹을 남긴다 — 변경 유형 CHECK 를 넓히지 않는다. */
    private void audit(String request, String target, String change, String group, String userId, Grant grant, String field, String before, String after, String reason) {
        if (Objects.equals(before,after)) return;
        jdbc.update("""
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,scrty_dcsn_trgt_id,
                  authrt_type_cd,authrt_grnt_cd,chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_user_idntfr,frst_rgtr_id,chg_rsn,crt_dt)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
                """,request,PermissionCodes.CATALOG_VERSION,target,change,group,userId,grant==null?null:grant.type(),grant==null?null:grant.code(),field,before,after,
                SecurityUtil.getCurrentLoginId().isPresent()?SecurityUtil.getCurrentEsntlId().orElse(null):null,auditLogin(),reason);
    }

    public void lockAdministration() {
        if (jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_info WHERE authrt_cd='ROLE_ADMIN' FOR UPDATE",String.class).isEmpty()) {
            throw new IllegalStateException("Reserved authorization lock row missing");
        }
    }

    /** Recheck after serialization: a principal captured before a competing revocation is insufficient. */
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void lockAndAuthorize(String permission) {
        SecurityUtil.assertPermission(permission);
        lockAdministration();
        String actor = SecurityUtil.getCurrentEsntlId().orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
        Boolean allowed = jdbc.queryForObject("""
                SELECT EXISTS (
                  SELECT 1 FROM tb_user_info u
                  JOIN tb_authrt_user_map m ON m.scrty_dcsn_trgt_id=u.esntl_id
                  JOIN tb_authrt_grnt_map g ON g.authrt_cd=m.authrt_cd
                  WHERE u.esntl_id=? AND u.user_stts_cd='P' AND coalesce(u.lck_yn,'N')<>'Y'
                    AND g.authrt_type_cd='OPERATION' AND g.authrt_grnt_cd=?
                )
                """, Boolean.class, actor, permission);
        if (!Boolean.TRUE.equals(allowed)) throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
    }

    /**
     * Caller retains its own operation permission. Protected targets additionally need the two
     * trusted administration permissions, read from the DB after the shared serialization lock.
     * Inactive or locked targets retain protection: their grants, not ability to log in, classify them.
     */
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    @Override
    public void authorizeProtectedAccountChange(String esntlId) {
        lockAdministration();
        boolean protectedAccount = readMemberships(esntlId).groups().stream()
                .anyMatch(group -> readGrants(group).stream().anyMatch(AuthorizationAdministrationService::isProtectedGrant));
        if (protectedAccount) authorizeProtectedAdministration();
    }

    private void authorizeProtectedAdministration() {
        lockAndAuthorize("AUTHRT_GRANT");
        lockAndAuthorize("AUTHRT_ASSIGN");
    }

    private static boolean isProtectedGrant(Grant grant) {
        return "OPERATION".equals(grant.type()) && PROTECTED_PERMISSIONS.contains(grant.code());
    }

    private static boolean isSensitiveAdministrationGrant(Grant grant) {
        return "OPERATION".equals(grant.type()) && SENSITIVE_ADMINISTRATION_PERMISSIONS.contains(grant.code());
    }

    /**
     * Active managers are those who can sign in and administer grants now. A login-policy restriction
     * (lmt_yn='Y', GAP-SEC-006) blocks sign-in exactly like deactivation, so it does not count; IP and
     * time-window restrictions still allow sign-in under their condition and do.
     */
    @Override
    public long managerCount() {
        return Objects.requireNonNull(jdbc.queryForObject("""
                SELECT count(*) FROM (
                  SELECT u.esntl_id FROM tb_user_info u
                  JOIN tb_authrt_user_map m ON m.scrty_dcsn_trgt_id=u.esntl_id
                  JOIN tb_authrt_grnt_map g ON g.authrt_cd=m.authrt_cd AND g.authrt_type_cd='OPERATION'
                  WHERE u.user_stts_cd='P' AND coalesce(u.lck_yn,'N')<>'Y'
                    AND NOT EXISTS (SELECT 1 FROM tb_login_policy p WHERE p.user_id=u.user_id AND p.lmt_yn='Y')
                  GROUP BY u.esntl_id HAVING bool_or(g.authrt_grnt_cd='AUTHRT_READ')
                    AND bool_or(g.authrt_grnt_cd='AUTHRT_GRANT') AND bool_or(g.authrt_grnt_cd='AUTHRT_ASSIGN')
                ) managers
                """,Long.class));
    }

    @Override
    public void protectLastManager(long previous) {
        if (previous>0 && managerCount()==0) invalid("마지막 활성 권한관리자의 기능 권한 또는 그룹을 회수할 수 없습니다.");
    }

    private static PageRequest pagination(int page,int size) { return PageRequest.of(Math.max(page,0),Math.max(1,Math.min(size,100))); }
    private static String auditLogin() { return SecurityUtil.getCurrentLoginId().orElse("SYSTEM"); }
    private static void requireVersion(String current,String expected) {
        if (expected==null || !current.equals(expected)) throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,"다른 변경이 있습니다. 전체 배정을 다시 조회한 뒤 저장해 주세요.");
    }
    private static void invalid(String message) { throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,message); }
}
