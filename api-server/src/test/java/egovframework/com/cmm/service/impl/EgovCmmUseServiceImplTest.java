package egovframework.com.cmm.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.organization.OrganizationManage;
import com.company.project.domain.organization.OrganizationManageRepository;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.service.CmmnDetailCode;

@ExtendWith(MockitoExtension.class)
class EgovCmmUseServiceImplTest {

    @InjectMocks
    private EgovCmmUseServiceImpl egovCmmUseService;

    @Mock
    private OrganizationManageRepository organizationManageRepository;

    @Test
    void selectOgrnztIdDetail() {
        // Given
        OrganizationManage org1 = OrganizationManage.builder()
                .orgnztId("ORG_001")
                .orgnztNm("Organization 1")
                .orgnztDc("Description 1")
                .build();

        OrganizationManage org2 = OrganizationManage.builder()
                .orgnztId("ORG_002")
                .orgnztNm("Organization 2")
                .orgnztDc("Description 2")
                .build();

        when(organizationManageRepository.findAll()).thenReturn(Arrays.asList(org1, org2));

        ComDefaultCodeVO vo = new ComDefaultCodeVO();

        // When
        List<CmmnDetailCode> result = egovCmmUseService.selectOgrnztIdDetail(vo);

        // Then
        assertEquals(2, result.size());

        CmmnDetailCode code1 = result.get(0);
        assertEquals("ORG_001", code1.getCode());
        assertEquals("Organization 1", code1.getCodeNm());
        assertEquals("Description 1", code1.getCodeDc());

        CmmnDetailCode code2 = result.get(1);
        assertEquals("ORG_002", code2.getCode());
        assertEquals("Organization 2", code2.getCodeNm());
        assertEquals("Description 2", code2.getCodeDc());
    }
}
