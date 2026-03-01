package com.company.project.integration;

import com.company.project.config.MinimalTestConfig;
import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MinimalTestConfig.class, properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
@Transactional
@ActiveProfiles("test")
public class CommonCodeIntegrationTest {

    @Autowired
    private CommonCodeService commonCodeService;

    @Test
    @DisplayName("공통분류코드 ?�록 �?조회 ?�스??)
    @WithMockUser(roles = "ADMIN")
    void cmmnClCodeIntegrationTest() {
        // 1. ?�록
        CmmnClCodeDto dto = CmmnClCodeDto.builder()
                .clCode("TST")
                .clCodeNm("?�스?�분�?)
                .clCodeDc("?�스?�분류설�?)
                .useAt("Y")
                .frstRegisterId("ADMIN")
                .build();
        commonCodeService.insertCmmnClCode(dto);

        // 2. ?�세 조회
        CmmnClCodeDto result = commonCodeService.selectCmmnClCodeDetail(dto);
        assertThat(result).isNotNull();
        assertThat(result.getClCodeNm()).isEqualTo("?�스?�분�?);

        // 3. 목록 조회
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchCondition("2"); // 명칭 검??(clCodeNm)
        searchVO.setSearchKeyword("?�스??);
        List<CmmnClCodeDto> list = commonCodeService.selectCmmnClCodeList(searchVO);
        assertThat(list).isNotEmpty();
    }

    @Test
    @DisplayName("공통코드(그룹) ?�록 �?조회 ?�스??)
    @WithMockUser(roles = "ADMIN")
    void cmmnCodeIntegrationTest() {
        // 0. 분류코드 ?�행 ?�록
        CmmnClCodeDto clDto = CmmnClCodeDto.builder()
                .clCode("G01")
                .clCodeNm("그룹분류")
                .useAt("Y")
                .build();
        commonCodeService.insertCmmnClCode(clDto);

        // 1. 그룹코드 ?�록
        CmmnCodeDto dto = CmmnCodeDto.builder()
                .codeId("GRP001")
                .codeIdNm("?�스?�그룹코??)
                .clCode("G01")
                .useAt("Y")
                .frstRegisterId("ADMIN")
                .build();
        commonCodeService.insertCmmnCode(dto);

        // 2. ?�세 조회
        CmmnCodeDto result = commonCodeService.selectCmmnCodeDetail(dto);
        assertThat(result).isNotNull();
        assertThat(result.getCodeIdNm()).isEqualTo("?�스?�그룹코??);
    }

    @Test
    @DisplayName("공통?�세코드 ?�록 �?조회 ?�스??)
    @WithMockUser(roles = "ADMIN")
    void cmmnDetailCodeIntegrationTest() {
        // 0. 분류 �?그룹코드 ?�행 ?�록
        CmmnClCodeDto clDto = CmmnClCodeDto.builder()
                .clCode("D01")
                .clCodeNm("?�세분류")
                .useAt("Y")
                .build();
        commonCodeService.insertCmmnClCode(clDto);
        
        CmmnCodeDto grpDto = CmmnCodeDto.builder()
                .codeId("DET001")
                .codeIdNm("?�세그룹")
                .clCode("D01")
                .useAt("Y")
                .build();
        commonCodeService.insertCmmnCode(grpDto);

        // 1. ?�세코드 ?�록
        CmmnDetailCodeDto dto = CmmnDetailCodeDto.builder()
                .codeId("DET001")
                .code("CD01")
                .codeNm("?�세코드01")
                .useAt("Y")
                .frstRegisterId("ADMIN")
                .build();
        commonCodeService.insertCmmnDetailCode(dto);

        // 2. ?�세 조회
        CmmnDetailCodeDto result = commonCodeService.selectCmmnDetailCodeDetail(dto);
        assertThat(result).isNotNull();
        assertThat(result.getCodeNm()).isEqualTo("?�세코드01");
    }
}
