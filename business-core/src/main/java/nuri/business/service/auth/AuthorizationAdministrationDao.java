package nuri.business.service.auth;

import static nuri.business.service.auth.AuthorizationAdministrationSupport.placeholders;
import static nuri.business.service.auth.AuthorizationAdministrationSupport.routeOf;

import java.util.*;
import nuri.business.service.auth.dto.AuthorizationDto.*;
import nuri.foundation.core.persistence.VendorSqlDialect;
import nuri.foundation.core.persistence.VendorSqlDialect.RowLock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/**
 * [2026-11-27] 권한 관리의 자료 접근 — 그룹·권한·배정·이력 표의 조회와 쓰기 SQL 이다(품질 평가 A안 7번). 종전에는
 * {@link AuthorizationAdministrationService} 한 파일에 권한 검사·업무 판단과 섞여 있었다. SQL 과 인자는 한 글자도 바꾸지 않고
 * 옮겼다.
 *
 * <p>인가 판정 SQL — 직렬화 잠금({@code lockAdministration}), 현재 계정·권한 재확인({@code lockAndAuthorize}), 활성 권한관리자
 * 수({@code managerCount}) — 은 서비스에 남겼다. 그 원문은 인가 정책 원장(authorization-policies.json manualGuardPolicies)이
 * 서비스 본문에서 고정하는 판정 경계다(H3). 권한 검사({@code SecurityUtil})도 서비스에만 있다 — 이 클래스는 호출자가 이미 권한을
 * 확인한 트랜잭션 안에서만 쓰인다.
 *
 * <p>서비스가 같은 {@link JdbcTemplate}·방언으로 만든다(스프링 빈이 아니다). 서비스의 트랜잭션·잠금 순서를 그대로 따른다.
 */
final class AuthorizationAdministrationDao {
    /**
     * [2026-10-02] 그룹 버전은 그룹 자신의 이력(GROUP·GROUP_GRANT)만 본다. 종전에는 그룹과 사용자를 같은 조건
     * ({@code authrt_cd=? OR scrty_dcsn_trgt_id=?})으로 셌는데, 구성원 추가·회수(USER_GROUP 행)도 {@code authrt_cd} 에
     * 그 그룹을 싣기 때문에 구성원 탭에서 저장하면 같은 그룹의 기능권한 초안이 409 가 됐다. 그룹 스냅샷은 구성원을 담지 않고
     * 그룹 삭제는 잠금 아래에서 구성원 수를 다시 세므로 이 분리로 막던 것은 없다. 각 축 안의 ABA 방지(마지막 이력 번호)는 유지된다.
     * 단건({@link #groupLastChange})과 일괄({@link #findGroupLastChanges}) 조회가 이 조건 하나를 함께 쓴다.
     */
    static final String GROUP_HISTORY = "chg_trgt_type_cd<>'USER_GROUP'";

    private final JdbcTemplate jdbc;
    private final VendorSqlDialect vendorSql;

    AuthorizationAdministrationDao(JdbcTemplate jdbc, VendorSqlDialect vendorSql) {
        this.jdbc = jdbc;
        this.vendorSql = vendorSql;
    }

    // --- 그룹 ---

    List<GroupSummary> findGroup(String code) {
        return jdbc.query("SELECT authrt_cd,authrt_nm,authrt_expln FROM tb_authrt_info WHERE authrt_cd=?",
                (rs, n) -> new GroupSummary(rs.getString(1),rs.getString(2),rs.getString(3),null), code);
    }

    Long countGroup(String code) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_authrt_info WHERE authrt_cd=?",Long.class,code);
    }

    List<GroupSummary> findAllGroups() {
        return jdbc.query("SELECT authrt_cd,authrt_nm,authrt_expln FROM tb_authrt_info ORDER BY authrt_cd",
                (rs,n) -> new GroupSummary(rs.getString(1),rs.getString(2),rs.getString(3),null));
    }

    /** 이름 순이 아니라 코드 순의 그룹 이름 — 메뉴 이동 충돌 사유에 쓴다. */
    Map<String,String> findGroupNames() {
        var names = new HashMap<String,String>();
        jdbc.query("SELECT authrt_cd,authrt_nm FROM tb_authrt_info ORDER BY authrt_cd",
                (rs,n) -> names.put(rs.getString(1),rs.getString(2)));
        return names;
    }

    void insertGroup(String code, String name, String description, String createdDate, String actor) {
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_expln,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",
                code,name,description,createdDate,actor,actor);
    }

    void updateGroup(String code, String name, String description, String actor) {
        jdbc.update("UPDATE tb_authrt_info SET authrt_nm=?,authrt_expln=?,mdfcn_dt=CURRENT_TIMESTAMP,last_mdfr_id=? WHERE authrt_cd=?",name,description,actor,code);
    }

    void deleteGroup(String code) {
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd=?",code);
    }

    // --- 그룹 권한 ---

    List<Grant> findGrants(String code) {
        return jdbc.query("SELECT authrt_type_cd,authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_cd=? ORDER BY authrt_type_cd,authrt_grnt_cd",
                (rs,n) -> new Grant(rs.getString(1),rs.getString(2)),code);
    }

    /** 전체 그룹의 권한 행(그룹 코드 → 권한), 그룹·유형·코드 순. */
    List<Map.Entry<String,Grant>> findAllGrants() {
        return jdbc.query("SELECT authrt_cd,authrt_type_cd,authrt_grnt_cd FROM tb_authrt_grnt_map ORDER BY authrt_cd,authrt_type_cd,authrt_grnt_cd",
                (rs,n) -> Map.entry(rs.getString(1),new Grant(rs.getString(2),rs.getString(3))));
    }

    /** 메뉴 표시(NAVIGATION) 행 전체(그룹 코드 → 메뉴 번호 글자), 그룹·메뉴 순. */
    List<Map.Entry<String,String>> findAllNavigationGrants() {
        return jdbc.query("SELECT authrt_cd,authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' ORDER BY authrt_cd,authrt_grnt_cd",
                (rs,n) -> Map.entry(rs.getString(1),rs.getString(2)));
    }

    /** 그 메뉴의 표시를 가진 그룹(코드 순). */
    List<String> findNavigationGroups(Long menuId) {
        return jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' AND authrt_grnt_cd=? ORDER BY authrt_cd",String.class,menuId.toString());
    }

    void insertGrant(String group, Grant grant, String firstRegistrant, String lastModifier) {
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",group,grant.type(),grant.code(),firstRegistrant,lastModifier);
    }

    void deleteGrant(String group, Grant grant) {
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=? AND authrt_type_cd=? AND authrt_grnt_cd=?",group,grant.type(),grant.code());
    }

    /** [V2_153] 그 그룹 구성원 전원의 세션차수를 올린다(옛 토큰 401). */
    void bumpGroupMemberSessions(String group) {
        jdbc.update("UPDATE tb_user_info SET ssn_cycl = ssn_cycl + 1 WHERE esntl_id IN "
                + "(SELECT m.scrty_dcsn_trgt_id FROM tb_authrt_user_map m WHERE m.authrt_cd=?)",group);
    }

    // --- 사용자·부서·배정 ---

    Long countUser(String userId) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE esntl_id=?",Long.class,userId);
    }

    List<String> findUserGroups(String userId) {
        return jdbc.queryForList("SELECT authrt_cd FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=? ORDER BY authrt_cd",String.class,userId);
    }

    List<UserChoice> findGroupMembers(String code, Pageable pageable) {
        return jdbc.query(vendorSql.paginate("SELECT u.esntl_id,u.user_id,u.user_nm,u.ognz_id FROM tb_authrt_user_map m"
                + " JOIN tb_user_info u ON u.esntl_id=m.scrty_dcsn_trgt_id WHERE m.authrt_cd=?"
                + " ORDER BY u.user_nm,u.user_id",pageable.getPageSize(),pageable.getOffset()),
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),
                code);
    }

    Long countGroupMembersWithUser(String code) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_authrt_user_map m JOIN tb_user_info u"
                + " ON u.esntl_id=m.scrty_dcsn_trgt_id WHERE m.authrt_cd=?",Long.class,code);
    }

    /** 그룹의 배정 행 수(사용자 존재와 무관). */
    Long countGroupAssignments(String code) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_authrt_user_map WHERE authrt_cd=?",Long.class,code);
    }

    /** 대상 중 지금 그 그룹의 구성원인 사용자. */
    List<String> findMembersAmong(String code, Set<String> targets) {
        List<Object> memberArgs = new ArrayList<>(); memberArgs.add(code); memberArgs.addAll(targets);
        return jdbc.queryForList("SELECT scrty_dcsn_trgt_id FROM tb_authrt_user_map WHERE authrt_cd=? AND scrty_dcsn_trgt_id IN ("
                + placeholders(targets.size()) + ")",String.class,memberArgs.toArray());
    }

    List<UserChoice> findUsersByIds(Set<String> ids) {
        return jdbc.query("SELECT esntl_id,user_id,user_nm,ognz_id FROM tb_user_info WHERE esntl_id IN (" + placeholders(ids.size()) + ")",
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),ids.toArray());
    }

    List<UserChoice> searchUsers(String term, Pageable pageable) {
        return jdbc.query(vendorSql.paginate("SELECT esntl_id,user_id,user_nm,ognz_id FROM tb_user_info WHERE user_id LIKE ? ESCAPE '!' OR user_nm LIKE ? ESCAPE '!' ORDER BY user_id",pageable.getPageSize(),pageable.getOffset()),
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4)),term,term);
    }

    Long countUsers(String term) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_user_info WHERE user_id LIKE ? ESCAPE '!' OR user_nm LIKE ? ESCAPE '!'",Long.class,term,term);
    }

    List<DepartmentChoice> findDepartments() {
        return jdbc.query("SELECT ognz_id,ognz_nm FROM tb_ognz_info ORDER BY ognz_nm,ognz_id",
                (rs,n) -> new DepartmentChoice(rs.getString(1),rs.getString(2)));
    }

    Long countDepartment(String departmentId) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_ognz_info WHERE ognz_id=?", Long.class, departmentId);
    }

    List<UserChoice> findDepartmentUsers(String departmentId) {
        return jdbc.query("SELECT esntl_id,user_id,user_nm FROM tb_user_info WHERE ognz_id=? ORDER BY esntl_id",
                (rs,n) -> new UserChoice(rs.getString(1),rs.getString(2),rs.getString(3),departmentId),departmentId);
    }

    /** 부서 사용자의 배정(사용자 → 그룹), 사용자·그룹 순. */
    List<Map.Entry<String,String>> findDepartmentMemberships(String departmentId) {
        return jdbc.query("SELECT m.scrty_dcsn_trgt_id,m.authrt_cd FROM tb_authrt_user_map m"
                + " JOIN tb_user_info u ON u.esntl_id=m.scrty_dcsn_trgt_id WHERE u.ognz_id=?"
                + " ORDER BY m.scrty_dcsn_trgt_id,m.authrt_cd",
                (rs,n) -> Map.entry(rs.getString(1),rs.getString(2)),departmentId);
    }

    void deleteMembership(String userId, String group) {
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=? AND authrt_cd=?",userId,group);
    }

    /** [V2_153] 그 사용자의 세션차수를 올린다(옛 토큰 401). */
    void bumpUserSession(String userId) {
        jdbc.update("UPDATE tb_user_info SET ssn_cycl = ssn_cycl + 1 WHERE esntl_id=?",userId);
    }

    void insertMembership(String userId, String group, String firstRegistrant, String lastModifier) {
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?)",userId,group,firstRegistrant,lastModifier);
    }

    // --- 메뉴 ---

    List<Navigation> findNavigation() {
        // 사용 여부는 사이드바와 같은 판정(값이 'Y' 일 때만 사용)으로 정규화한다 — NULL 을 사용 중으로 보이지 않게 한다.
        return jdbc.query("SELECT menu_sn,menu_nm,NULLIF(up_menu_sn,0),modern_route,use_yn FROM tb_menu_info ORDER BY menu_ordr,menu_sn",
                (rs,n) -> new Navigation(rs.getString(1),rs.getString(2),rs.getString(3),routeOf(rs.getString(4)),"Y".equals(rs.getString(5))?"Y":"N"));
    }

    /** 메시지용 메뉴 이름(메뉴 번호 → 이름). */
    Map<String,String> findMenuNames() {
        var names = new HashMap<String,String>();
        jdbc.query("SELECT menu_sn,menu_nm FROM tb_menu_info ORDER BY menu_sn",
                (rs,n) -> names.put(rs.getString(1),rs.getString(2)));
        return names;
    }

    /** 메뉴 행을 FOR UPDATE 로 잠근다. 없으면 빈 목록이다. */
    List<Long> lockMenu(Long id) {
        return jdbc.queryForList(vendorSql.selectForLock("menu_sn","tb_menu_info","WHERE menu_sn=?",RowLock.FOR_UPDATE),Long.class,id);
    }

    private record MenuParent(String code, String parentCode) {}

    /** Stabilize parent links before ADMIN; allow the deferred self-FK's KEY SHARE during a move. */
    Map<String,String> lockMenuParents() {
        var rows = jdbc.query(vendorSql.selectForLock("menu_sn,up_menu_sn","tb_menu_info","ORDER BY menu_sn",RowLock.FOR_NO_KEY_UPDATE),
                (rs,n) -> new MenuParent(rs.getString(1),rs.getString(2)));
        var parents = new HashMap<String,String>();
        rows.forEach(row -> parents.put(row.code(),row.parentCode()));
        return parents;
    }

    // --- 변경 이력 ---

    /** 그룹 자신의 마지막 이력 번호 — 조건은 {@link #GROUP_HISTORY} 다. */
    Long groupLastChange(String code) {
        return jdbc.queryForObject("SELECT coalesce(max(authrt_chg_hstry_sn),0) FROM tb_authrt_chg_hstry WHERE authrt_cd=? AND " + GROUP_HISTORY,Long.class,code);
    }

    /** 그룹별 마지막 이력 번호(그룹 코드 → 번호) — 조건은 {@link #GROUP_HISTORY} 다. */
    List<Map.Entry<String,Long>> findGroupLastChanges() {
        return jdbc.query("SELECT authrt_cd,max(authrt_chg_hstry_sn) FROM tb_authrt_chg_hstry WHERE " + GROUP_HISTORY + " GROUP BY authrt_cd",
                (rs,n) -> Map.entry(rs.getString(1),rs.getLong(2)));
    }

    /** 사용자를 대상으로 한 마지막 이력 번호(USER_GROUP 행)만 본다. */
    Long membershipLastChange(String userId) {
        return jdbc.queryForObject("SELECT coalesce(max(authrt_chg_hstry_sn),0) FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id=?",Long.class,userId);
    }

    /** 부서 사용자별 마지막 이력 번호(사용자 → 번호). */
    List<Map.Entry<String,Long>> findDepartmentLastChanges(String departmentId) {
        return jdbc.query("SELECT h.scrty_dcsn_trgt_id,max(h.authrt_chg_hstry_sn) FROM tb_authrt_chg_hstry h"
                + " JOIN tb_user_info u ON u.esntl_id=h.scrty_dcsn_trgt_id WHERE u.ognz_id=? GROUP BY h.scrty_dcsn_trgt_id",
                (rs,n) -> Map.entry(rs.getString(1),rs.getLong(2)),departmentId);
    }

    /** 이력 한 쪽. {@code where} 는 서비스가 바인드 변수로만 만든 조건절이다. */
    Page<Change> history(String where, MapSqlParameterSource parameters, Pageable pageable) {
        var query=new NamedParameterJdbcTemplate(jdbc);
        // 처리자·대상 사용자 이름을 함께 싣는다 — 종전 화면은 내부 식별자(esntlId)만 보여 누가 바꿨는지 읽을 수 없었다.
        //   탈퇴 등으로 사용자가 없으면 이름은 null 이고 식별자가 남는다.
        var rows=query.query(vendorSql.paginate("SELECT h.*, actor.user_nm AS actor_nm, target.user_nm AS target_user_nm"
                + " FROM tb_authrt_chg_hstry h"
                + " LEFT JOIN tb_user_info actor ON actor.esntl_id=h.chg_user_idntfr"
                + " LEFT JOIN tb_user_info target ON target.esntl_id=h.scrty_dcsn_trgt_id"
                + where+" ORDER BY h.authrt_chg_hstry_sn DESC",pageable.getPageSize(),pageable.getOffset()),parameters,AuthorizationAdministrationSupport::mapHistoryChange);
        return new PageImpl<>(rows,pageable,Objects.requireNonNull(query.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry h"+where,parameters,Long.class)));
    }

    void insertHistory(String request, String policyVersion, String target, String change, String group, String userId,
                       String grantType, String grantCode, String field, String before, String after,
                       String changer, String registrant, String reason) {
        jdbc.update("""
                INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr,plcy_ver_no,chg_trgt_type_cd,chg_type_cd,authrt_cd,scrty_dcsn_trgt_id,
                  authrt_type_cd,authrt_grnt_cd,chg_artcl_nm,chg_bfr_cn,chg_aftr_cn,chg_user_idntfr,frst_rgtr_id,chg_rsn,crt_dt)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
                """,request,policyVersion,target,change,group,userId,grantType,grantCode,field,before,after,
                changer,registrant,reason);
    }
}
