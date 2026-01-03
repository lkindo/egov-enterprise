package com.company.project.api.controller.test;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 디버깅용 간단한 테스트 컨트롤러
 * 보안 검사 없이 응답을 반환하여 리다이렉트 문제 격리 테스트
 */
@RestController
public class TestPingController {

    @GetMapping("/test/ping")
    public String ping() {
        System.out.println(">>> TestPingController.ping ENTERED <<<");
        return "PONG from TestPingController";
    }
}
