package nuri.business.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import nuri.business.security.authorization.PermissionCodes;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

/** Explicit initial-group fixture, expanded from the reviewed catalog; never used by production. */
public final class AuthorizationTestPrincipal {
    private AuthorizationTestPrincipal() {}
    public static CustomUserDetails principal(String loginId, String esntlId, String... groups) {
        return (CustomUserDetails) authentication(loginId, esntlId, groups).getPrincipal();
    }
    public static Authentication authentication(String loginId,String esntlId,String... groups) {
        var groupList=Arrays.stream(groups).map(g -> g.startsWith("ROLE_")?g:"ROLE_"+g).toList();
        List<String> permissions=new ArrayList<>();
        try(var stream=AuthorizationTestPrincipal.class.getResourceAsStream("/authorization/permission-catalog.json")) {
            for(var row:new ObjectMapper().readTree(stream).path("permissions")) {
                for(var group:row.path("defaultGroups")) if(groupList.contains(group.asText())) { permissions.add(row.path("code").asText());break; }
            }
        } catch(java.io.IOException ex) { throw new IllegalStateException(ex); }
        var principal=CustomUserDetails.builder().userId(loginId).esntlId(esntlId).userNm(loginId)
                .authorCode(groupList.stream().sorted().findFirst().orElse(null))
                .password("test").groups(groupList).permissions(permissions).enabled(true).lockAt("N")
                .authorizationVersion(PermissionCodes.CATALOG_VERSION).build();
        return new UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities());
    }
}
