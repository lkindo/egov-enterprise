package nuri.business.service.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class AuthorizationAdministrationService {
    private final JdbcTemplate jdbc;
    private static final Set<String> RESERVED = Set.of("ROLE_ADMIN", "ROLE_SYSTEM", "ROLE_USER", "ROLE_ANONYMOUS");

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
        return new GroupSnapshot(code,g.name(),g.description(),grants,version(code, state),true);
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
        return new MembershipSnapshot(userId,groups,version(userId,groups.toString()),true);
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

    private String version(String target, String state) {
        // Including the most recent immutable delta prevents a changed-then-restored (ABA) overwrite.
        Long last = jdbc.queryForObject("SELECT coalesce(max(authrt_chg_hstry_sn),0) FROM tb_authrt_chg_hstry WHERE authrt_cd=? OR scrty_dcsn_trgt_id=?",Long.class,target,target);
        return AuthorizationSnapshotService.digest(PermissionCodes.CATALOG_VERSION + "\n" + target + "\n" + state + "\n" + last);
    }

    public Catalog catalog() {
        SecurityUtil.assertPermission("AUTHRT_READ");
        List<Operation> operations = new ArrayList<>();
        try (var input = new ClassPathResource("authorization/permission-catalog.json").getInputStream()) {
            for (JsonNode item : new ObjectMapper().readTree(input).path("permissions")) {
                operations.add(new Operation(item.path("code").asText(),item.path("domain").asText(),item.path("action").asText(),item.path("name").asText()));
            }
        } catch (IOException ex) { throw new IllegalStateException("Permission catalog unavailable",ex); }
        var navigation = jdbc.query("SELECT menu_sn::text,menu_nm,up_menu_sn::text FROM tb_menu_info ORDER BY menu_sn",
                (rs,n) -> new Navigation(rs.getString(1),rs.getString(2),rs.getString(3)));
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

    @Transactional
    public void createGroup(CreateGroup request) {
        SecurityUtil.assertPermission("AUTHRT_CREATE");
        lockAndAuthorize("AUTHRT_CREATE");
        if (RESERVED.contains(request.code())) invalid("예약된 그룹 코드는 생성할 수 없습니다.");
        if (jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd=?",Long.class,request.code()) != 0) invalid("이미 존재하는 그룹입니다.");
        String actor = auditLogin();
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_expln,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",
                request.code(),request.name(),request.description(),LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE),actor,actor);
        String id = UUID.randomUUID().toString();
        audit(id,"GROUP","ADD",request.code(),null,null,"authrt_nm",null,request.name());
        if (request.description()!=null) audit(id,"GROUP","ADD",request.code(),null,null,"authrt_expln",null,request.description());
    }

    @Transactional
    public void updateGroup(String code, UpdateGroup request) {
        SecurityUtil.assertPermission("AUTHRT_UPDATE");
        lockAndAuthorize("AUTHRT_UPDATE");
        var before = readGroup(code); requireVersion(before.version(),request.version());
        String id = UUID.randomUUID().toString();
        jdbc.update("UPDATE tb_authrt_info SET authrt_nm=?,authrt_expln=?,mdfcn_dt=CURRENT_TIMESTAMP,last_mdfr_id=? WHERE authrt_cd=?",request.name(),request.description(),auditLogin(),code);
        audit(id,"GROUP","UPDATE",code,null,null,"authrt_nm",before.name(),request.name());
        audit(id,"GROUP","UPDATE",code,null,null,"authrt_expln",before.description(),request.description());
    }

    @Transactional
    public void deleteGroup(String code, String expectedVersion) {
        SecurityUtil.assertPermission("AUTHRT_DELETE");
        lockAndAuthorize("AUTHRT_DELETE");
        if (RESERVED.contains(code)) invalid("예약된 그룹은 삭제할 수 없습니다.");
        var before = readGroup(code); requireVersion(before.version(),expectedVersion);
        if (jdbc.queryForObject("SELECT count(*) FROM tb_authrt_user_map WHERE authrt_cd=?",Long.class,code) != 0) throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE);
        String id = UUID.randomUUID().toString();
        for (var grant: before.grants()) removeGrant(id,code,grant);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd=?",code);
        audit(id,"GROUP","REMOVE",code,null,null,"authrt_nm",before.name(),null);
        if (before.description()!=null) audit(id,"GROUP","REMOVE",code,null,null,"authrt_expln",before.description(),null);
    }

    @Transactional
    public void replaceGrants(String code, ReplaceGrants request) {
        SecurityUtil.assertPermission("AUTHRT_GRANT");
        if (!request.complete() || request.grants()==null) invalid("전체 권한을 조회한 뒤 저장해 주세요.");
        TreeSet<Grant> desired = validateGrants(request.grants());
        lockMenus(desired.stream().filter(g -> "NAVIGATION".equals(g.type())).map(g -> Long.valueOf(g.code())).toList());
        lockAndAuthorize("AUTHRT_GRANT");
        var before = readGroup(code); requireVersion(before.version(),request.version());
        long managers = managerCount();
        applyGrants(UUID.randomUUID().toString(),code,before.grants(),desired);
        protectLastManager(managers);
    }

    private TreeSet<Grant> validateGrants(List<Grant> grants) {
        var result = new TreeSet<Grant>();
        for (var grant: grants) {
            if (grant==null || grant.code()==null) invalid("권한 값이 필요합니다.");
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

    private void applyGrants(String request, String group, List<Grant> before, Set<Grant> desired) {
        for (Grant old: before) if (!desired.contains(old)) removeGrant(request,group,old);
        for (Grant grant: desired) if (!before.contains(grant)) addGrant(request,group,grant);
    }

    private void addGrant(String request, String group, Grant grant) {
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",group,grant.type(),grant.code(),auditLogin(),auditLogin());
        audit(request,"GROUP_GRANT","ADD",group,null,grant,"grant",null,grant.code());
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
        for (String group: before) if (!desired.contains(group)) {
            jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=? AND authrt_cd=?",userId,group);
            audit(request,"USER_GROUP","REMOVE",group,userId,null,"membership",group,null);
        }
        for (String group: desired) if (!before.contains(group)) {
            jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",userId,group,auditLogin(),auditLogin());
            audit(request,"USER_GROUP","ADD",group,userId,null,"membership",null,group);
        }
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
        lockMenus(ids); lockAndAuthorize("AUTHRT_GRANT"); var before=readGroup(group); requireVersion(before.version(),expectedVersion);
        var desired=new TreeSet<Grant>();
        before.grants().stream().filter(g -> "OPERATION".equals(g.type())).forEach(desired::add);
        ids.forEach(id -> desired.add(new Grant("NAVIGATION",id.toString())));
        applyGrants(UUID.randomUUID().toString(),group,before.grants(),desired);
    }

    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void grantNewMenuToCompatibilityAdmin(Long menuId) {
        SecurityUtil.assertPermission("MENU_CREATE");
        lockMenus(List.of(menuId)); lockAndAuthorize("MENU_CREATE");
        var grant=new Grant("NAVIGATION",menuId.toString());
        if (!readGrants("ROLE_ADMIN").contains(grant)) addGrant(UUID.randomUUID().toString(),"ROLE_ADMIN",grant);
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

    public Page<Change> history(int page, int size, String groupCode, String userId, String actorId,
                                LocalDate fromDate, LocalDate toDate) {
        SecurityUtil.assertPermission("AUTHRT_AUDIT"); var pageable=pagination(page,size);
        if (fromDate!=null && toDate!=null && fromDate.isAfter(toDate)) invalid("조회 시작일은 종료일보다 늦을 수 없습니다.");
        var parameters=new org.springframework.jdbc.core.namedparam.MapSqlParameterSource();
        StringBuilder where=new StringBuilder(" WHERE 1=1");
        if (groupCode!=null && !groupCode.isBlank()) { where.append(" AND authrt_cd=:groupCode"); parameters.addValue("groupCode",groupCode); }
        if (userId!=null && !userId.isBlank()) { where.append(" AND scrty_dcsn_trgt_id=:userId"); parameters.addValue("userId",userId); }
        if (actorId!=null && !actorId.isBlank()) { where.append(" AND chg_user_idntfr=:actorId"); parameters.addValue("actorId",actorId); }
        if (fromDate!=null) { where.append(" AND crt_dt>=:fromDate"); parameters.addValue("fromDate",java.sql.Timestamp.valueOf(fromDate.atStartOfDay())); }
        if (toDate!=null) { where.append(" AND crt_dt<:untilDate"); parameters.addValue("untilDate",java.sql.Timestamp.valueOf(toDate.plusDays(1).atStartOfDay())); }
        var query=new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(jdbc);
        parameters.addValue("size",pageable.getPageSize()).addValue("offset",pageable.getOffset());
        var rows=query.query("SELECT * FROM tb_authrt_chg_hstry"+where+" ORDER BY authrt_chg_hstry_sn DESC LIMIT :size OFFSET :offset",parameters,(rs,n) -> new Change(
                rs.getLong("authrt_chg_hstry_sn"),rs.getString("dmnd_idntfr"),rs.getString("plcy_ver_no"),rs.getString("chg_trgt_type_cd"),rs.getString("chg_type_cd"),
                rs.getString("authrt_cd"),rs.getString("scrty_dcsn_trgt_id"),rs.getString("authrt_type_cd"),rs.getString("authrt_grnt_cd"),rs.getString("chg_artcl_nm"),
                rs.getString("chg_bfr_cn"),rs.getString("chg_aftr_cn"),rs.getString("chg_user_idntfr"),rs.getTimestamp("crt_dt").toLocalDateTime()));
        return new PageImpl<>(rows,pageable,Objects.requireNonNull(query.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry"+where,parameters,Long.class)));
    }

    private void audit(String request, String target, String change, String group, String userId, Grant grant, String field, String before, String after) {
        if (Objects.equals(before,after)) return;
        jdbc.update("""
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,scrty_dcsn_trgt_id,
                  authrt_type_cd,authrt_grnt_cd,chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_user_idntfr,frst_rgtr_id,crt_dt)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
                """,request,PermissionCodes.CATALOG_VERSION,target,change,group,userId,grant==null?null:grant.type(),grant==null?null:grant.code(),field,before,after,
                SecurityUtil.getCurrentLoginId().isPresent()?SecurityUtil.getCurrentEsntlId().orElse(null):null,auditLogin());
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

    public long managerCount() {
        return Objects.requireNonNull(jdbc.queryForObject("""
                SELECT count(*) FROM (
                  SELECT u.esntl_id FROM tb_user_info u
                  JOIN tb_authrt_user_map m ON m.scrty_dcsn_trgt_id=u.esntl_id
                  JOIN tb_authrt_grnt_map g ON g.authrt_cd=m.authrt_cd AND g.authrt_type_cd='OPERATION'
                  WHERE u.user_stts_cd='P' AND coalesce(u.lck_yn,'N')<>'Y'
                  GROUP BY u.esntl_id HAVING bool_or(g.authrt_grnt_cd='AUTHRT_READ')
                    AND bool_or(g.authrt_grnt_cd='AUTHRT_GRANT') AND bool_or(g.authrt_grnt_cd='AUTHRT_ASSIGN')
                ) managers
                """,Long.class));
    }

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
