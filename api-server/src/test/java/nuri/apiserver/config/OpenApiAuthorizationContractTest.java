package nuri.apiserver.config;

import java.util.List;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import nuri.business.security.authorization.PermissionPolicy;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;

class OpenApiAuthorizationContractTest {
    @Test
    void exactMethodAndPathDetermineAuthenticationResponsesWithUnknownFailClosed() {
        var policy = spy(new PermissionPolicy());
        doReturn(List.of(new PermissionPolicy.Binding("GET", "/probe", "fixture#read", "PUBLIC", null, null)))
                .when(policy).bindings();
        Operation read = operation();
        Operation write = operation();
        Operation unknown = operation();
        var api = new OpenAPI().paths(new Paths().addPathItem("/probe", new PathItem().get(read).post(write))
                .addPathItem("/probe/other", new PathItem().get(unknown)));
        new OpenApiConfig().commonErrorResponsesCustomizer(policy).customise(api);
        assertThat(read.getResponses()).doesNotContainKeys("401", "403");
        assertThat(write.getResponses()).containsKeys("401", "403");
        assertThat(unknown.getResponses()).containsKeys("401", "403");
    }

    @Test
    void currentLoginAndMeBindingsDriveDocumentationWithoutLegacyWildcard() {
        Operation login = operation();
        Operation me = operation();
        var api = new OpenAPI().paths(new Paths().addPathItem("/api/v1/auth/login", new PathItem().post(login))
                .addPathItem("/api/v1/auth/me", new PathItem().get(me)));
        new OpenApiConfig().commonErrorResponsesCustomizer(new PermissionPolicy()).customise(api);
        assertThat(login.getResponses()).doesNotContainKeys("401", "403");
        assertThat(me.getResponses()).containsKeys("401", "403");
    }

    @Test
    void existingDomainResponsesRemainAuthoritative() {
        Operation operation = operation();
        var explicit = new ApiResponse().description("domain-specific authentication failure");
        operation.getResponses().addApiResponse("401", explicit);
        var api = new OpenAPI().paths(new Paths().addPathItem("/unknown/{id}", new PathItem().get(operation)));
        new OpenApiConfig().commonErrorResponsesCustomizer(new PermissionPolicy()).customise(api);
        assertThat(operation.getResponses().get("401")).isSameAs(explicit);
        assertThat(operation.getResponses()).containsKeys("400", "404", "500");
    }

    private static Operation operation() {
        return new Operation().responses(new ApiResponses().addApiResponse("200", new ApiResponse()));
    }
}
