package nuri.business.security.authorization;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Current assignments, read on every authentication without a role fallback or ACL cache. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AuthorizationSnapshotService {
    private final JdbcTemplate jdbc;
    public record Snapshot(List<String> groups, List<String> permissions, String authorizationVersion) {}

    @Transactional(readOnly = true)
    public Snapshot load(String esntlId) {
        return loadAll(List.of(esntlId)).get(esntlId);
    }

    /** One query for the current page; callers never cache an authorization-bearing DTO. */
    @Transactional(readOnly = true)
    public java.util.Map<String, Snapshot> loadAll(java.util.Collection<String> esntlIds) {
        var states=new java.util.LinkedHashMap<String, State>();
        esntlIds.forEach(id -> states.put(id,new State()));
        if (!states.isEmpty()) new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(jdbc).query("""
                SELECT u.scrty_dcsn_trgt_id,u.authrt_cd,g.authrt_type_cd,g.authrt_grnt_cd
                FROM tb_authrt_user_map u
                JOIN tb_authrt_info a ON a.authrt_cd=u.authrt_cd
                LEFT JOIN tb_authrt_grnt_map g ON g.authrt_cd=u.authrt_cd
                WHERE u.scrty_dcsn_trgt_id IN (:ids)
                ORDER BY u.scrty_dcsn_trgt_id,u.authrt_cd,g.authrt_type_cd,g.authrt_grnt_cd
                """,java.util.Map.of("ids",states.keySet()),(org.springframework.jdbc.core.RowCallbackHandler) rs -> {
            var state=states.get(rs.getString(1));
            String group=rs.getString(2), kind=rs.getString(3), code=rs.getString(4);
            state.groups.add(group);
            if (kind!=null) {
                if ("OPERATION".equals(kind)) {
                    if (!PermissionCodes.ALL.contains(code)) throw new IllegalStateException("Unknown stored operation permission");
                    state.permissions.add(code);
                } else if (!"NAVIGATION".equals(kind)) throw new IllegalStateException("Unknown stored permission type");
                state.grants.add(group+":"+kind+":"+code);
            }
        });
        var result=new java.util.LinkedHashMap<String, Snapshot>();
        states.forEach((id,state) -> result.put(id,new Snapshot(List.copyOf(state.groups),List.copyOf(state.permissions),
                digest(PermissionCodes.CATALOG_VERSION+"\n"+state.groups+"\n"+state.grants))));
        return java.util.Collections.unmodifiableMap(result);
    }

    private static final class State {
        private final TreeSet<String> groups=new TreeSet<>();
        private final TreeSet<String> permissions=new TreeSet<>();
        private final TreeSet<String> grants=new TreeSet<>();
    }

    public static String digest(String content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
