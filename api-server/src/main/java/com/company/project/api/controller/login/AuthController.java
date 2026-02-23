package com.company.project.api.controller.login;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController("legacyAuthController")
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "인증 및 권한 관련 API")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final MessageSource messageSource;

    @Operation(summary = "로그인 처리")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials,
                                 HttpServletRequest request,
                                 HttpServletResponse response) {
        String id = credentials.get("id");
        String password = credentials.get("password");
        log.debug(">>> AuthController.login() id={}", id);

        try {
            UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(id, password);
            Authentication authResult = authenticationManager.authenticate(token);

            SecurityContext sc = SecurityContextHolder.createEmptyContext();
            sc.setAuthentication(authResult);
            SecurityContextHolder.setContext(sc);

            if (securityContextRepository != null) {
                securityContextRepository.saveContext(sc, request, response);
            }

            Map<String, Object> userData = new HashMap<>();
            userData.put("id", id);
            userData.put("name", authResult.getName());
            userData.put("ip", request.getRemoteAddr());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("user", userData);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Login failed for user: {}", id, e);
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            
            String message = messageSource.getMessage("fail.common.login", null, "Login failed", request.getLocale());
            error.put("message", message);
            
            return ResponseEntity.status(401).body(error);
        }
    }

    @Operation(summary = "로그아웃 처리")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        request.getSession().invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("success", true));
    }

    @Operation(summary = "현재 사용자 정보 조회")
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", auth.getName());
            user.put("name", auth.getName());
            return ResponseEntity.ok(Map.of("success", true, "user", user));
        }
        return ResponseEntity.status(401).body(Map.of("success", false, "message", "Not Authenticated"));
    }
}
