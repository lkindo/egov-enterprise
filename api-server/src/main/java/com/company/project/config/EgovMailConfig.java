package com.company.project.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import egovframework.com.cop.ems.service.EgovSndngMailRegistService;
import egovframework.com.cop.ems.service.SndngMailVO;

/**
 * 메일 발송 서비스 의존성 해결을 위한 임시 설정
 * 실제 메일 발송은 하지 않고 성공 처리만 함 (시스템관리 모듈 활성화를 위함)
 */
@Configuration
public class EgovMailConfig {

    @Bean
    public EgovSndngMailRegistService sndngMailRegistService() {
        return new EgovSndngMailRegistService() {
            @Override
            public boolean insertSndngMail(SndngMailVO vo) throws Exception {
                // Dummy implementation
                return true;
            }

            @Override
            public boolean trnsmitXmlData(SndngMailVO sndngMailVO) throws Exception {
                // Dummy implementation
                return true;
            }

            @Override
            public boolean recptnXmlData(String xml) throws Exception {
                // Dummy implementation
                return true;
            }
        };
    }
}
