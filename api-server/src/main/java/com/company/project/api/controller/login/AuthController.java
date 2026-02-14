package com.company.project.api.controller.login;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.sim.service.EgovClntInfo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;

@RestController("legacyAuthController")
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "로그인 및 인증 관리")
public class AuthController {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    public AuthController(AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @Operation(summary = "로그인 요청")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials,
            HttpServletRequest request,
            HttpServletResponse response) {
        String id = credentials.get("id");
        String password = credentials.get("password");

        LOGGER.debug(">>> AuthController.login() id={}", id);

        try {
            UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(id, password);
            Authentication authResult = authenticationManager.authenticate(token);

            SecurityContext sc = SecurityContextHolder.createEmptyContext();
            sc.setAuthentication(authResult);
            SecurityContextHolder.setContext(sc);

            if (securityContextRepository != null) {
                securityContextRepository.saveContext(sc, request, response);
            }

            // Map to LoginVO for legacy session support
            // This part is borrowed from EgovLoginController logic
            LoginVO loginVO = new LoginVO();
            loginVO.setId(id);
            loginVO.setName(authResult.getName());
            loginVO.setIp(EgovClntInfo.getClntIP(request));
            // Add other fields as needed from authResult.getPrincipal()

            request.getSession().setAttribute("LoginVO", loginVO);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("user", loginVO);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            LOGGER.error("Login failed", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", egovMessageSource.getMessage("fail.common.login", request.getLocale()));
            return ResponseEntity.status(401).body(error);
        }
    }

    @Operation(summary = "로그아웃 요청")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        request.getSession().invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("success", true));
    }

    @Operation(summary = "현재 사용자 정보 확인")
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        LoginVO loginVO = (LoginVO) request.getSession().getAttribute("LoginVO");
        if (loginVO != null) {
            return ResponseEntity.ok(Map.of("success", true, "user", loginVO));
        }

        // Check Spring Security context as fallback
        if (EgovUserDetailsHelper.isAuthenticated()) {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return ResponseEntity.ok(Map.of("success", true, "principal", principal));
        }

        return ResponseEntity.status(401).body(Map.of("success", false));
    }
}
