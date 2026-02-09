package com.company.project.web.adapter;

import com.company.project.service.schedule.dto.ScheduleDto;
import egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO;
import egovframework.com.cop.smt.sim.service.IndvdlSchdulManageVO;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ScheduleAdapterTest {

    @Test
    void testToVO_withValidDto() {
        ScheduleDto dto = ScheduleDto.builder()
                .schdulId("S1")
                .schdulSe("SE1")
                .schdulDeptId("D1")
                .schdulKindCode("K1")
                .schdulBgnde("20230101")
                .schdulEndde("20230102")
                .schdulNm("Name")
                .schdulCn("Content")
                .schdulPlace("Place")
                .schdulIpcrCode("I1")
                .schdulChargerId("C1")
                .atchFileId("F1")
                .reptitSeCode("R1")
                .frstRegisterId("FR1")
                .build();

        IndvdlSchdulManageVO vo = ScheduleAdapter.toVO(dto);

        assertNotNull(vo);
        assertEquals("S1", vo.getSchdulId());
        assertEquals("SE1", vo.getSchdulSe());
        assertEquals("D1", vo.getSchdulDeptId());
        assertEquals("K1", vo.getSchdulKindCode());
        assertEquals("20230101", vo.getSchdulBgnde());
        assertEquals("20230102", vo.getSchdulEndde());
        assertEquals("Name", vo.getSchdulNm());
        assertEquals("Content", vo.getSchdulCn());
        assertEquals("Place", vo.getSchdulPlace());
        assertEquals("I1", vo.getSchdulIpcrCode());
        assertEquals("C1", vo.getSchdulChargerId());
        assertEquals("F1", vo.getAtchFileId());
        assertEquals("R1", vo.getReptitSeCode());
        assertEquals("FR1", vo.getFrstRegisterId());
    }

    @Test
    void testToVO_withNullDto() {
        assertNull(ScheduleAdapter.toVO(null));
    }

    @Test
    void testToDto_fromIndvdlSchdulManageVO_withValidVO() {
        IndvdlSchdulManageVO vo = new IndvdlSchdulManageVO();
        vo.setSchdulId("S1");
        vo.setSchdulSe("SE1");
        vo.setSchdulDeptId("D1");
        vo.setSchdulKindCode("K1");
        vo.setSchdulBgnde("20230101");
        vo.setSchdulEndde("20230102");
        vo.setSchdulNm("Name");
        vo.setSchdulCn("Content");
        vo.setSchdulPlace("Place");
        vo.setSchdulIpcrCode("I1");
        vo.setSchdulChargerId("C1");
        vo.setAtchFileId("F1");
        vo.setReptitSeCode("R1");
        vo.setFrstRegisterId("FR1");

        ScheduleDto dto = ScheduleAdapter.toDto(vo);

        assertNotNull(dto);
        assertEquals("S1", dto.getSchdulId());
        assertEquals("SE1", dto.getSchdulSe());
        assertEquals("D1", dto.getSchdulDeptId());
        assertEquals("K1", dto.getSchdulKindCode());
        assertEquals("20230101", dto.getSchdulBgnde());
        assertEquals("20230102", dto.getSchdulEndde());
        assertEquals("Name", dto.getSchdulNm());
        assertEquals("Content", dto.getSchdulCn());
        assertEquals("Place", dto.getSchdulPlace());
        assertEquals("I1", dto.getSchdulIpcrCode());
        assertEquals("C1", dto.getSchdulChargerId());
        assertEquals("F1", dto.getAtchFileId());
        assertEquals("R1", dto.getReptitSeCode());
        assertEquals("FR1", dto.getFrstRegisterId());
    }

    @Test
    void testToDto_fromIndvdlSchdulManageVO_withNullVO() {
        assertNull(ScheduleAdapter.toDto((IndvdlSchdulManageVO) null));
    }

    @Test
    void testToDeptVO_withValidDto() {
        ScheduleDto dto = ScheduleDto.builder()
                .schdulId("S1")
                .schdulSe("SE1")
                .schdulDeptId("D1")
                .schdulKindCode("K1")
                .schdulBgnde("20230101")
                .schdulEndde("20230102")
                .schdulNm("Name")
                .schdulCn("Content")
                .schdulPlace("Place")
                .schdulIpcrCode("I1")
                .schdulChargerId("C1")
                .atchFileId("F1")
                .reptitSeCode("R1")
                .frstRegisterId("FR1")
                .build();

        DeptSchdulManageVO vo = ScheduleAdapter.toDeptVO(dto);

        assertNotNull(vo);
        assertEquals("S1", vo.getSchdulId());
        assertEquals("SE1", vo.getSchdulSe());
        assertEquals("D1", vo.getSchdulDeptId());
        assertEquals("K1", vo.getSchdulKindCode());
        assertEquals("20230101", vo.getSchdulBgnde());
        assertEquals("20230102", vo.getSchdulEndde());
        assertEquals("Name", vo.getSchdulNm());
        assertEquals("Content", vo.getSchdulCn());
        assertEquals("Place", vo.getSchdulPlace());
        assertEquals("I1", vo.getSchdulIpcrCode());
        assertEquals("C1", vo.getSchdulChargerId());
        assertEquals("F1", vo.getAtchFileId());
        assertEquals("R1", vo.getReptitSeCode());
        assertEquals("FR1", vo.getFrstRegisterId());
    }

    @Test
    void testToDeptVO_withNullDto() {
        assertNull(ScheduleAdapter.toDeptVO(null));
    }

    @Test
    void testToDto_fromDeptSchdulManageVO_withValidVO() {
        DeptSchdulManageVO vo = new DeptSchdulManageVO();
        vo.setSchdulId("S1");
        vo.setSchdulSe("SE1");
        vo.setSchdulDeptId("D1");
        vo.setSchdulKindCode("K1");
        vo.setSchdulBgnde("20230101");
        vo.setSchdulEndde("20230102");
        vo.setSchdulNm("Name");
        vo.setSchdulCn("Content");
        vo.setSchdulPlace("Place");
        vo.setSchdulIpcrCode("I1");
        vo.setSchdulChargerId("C1");
        vo.setAtchFileId("F1");
        vo.setReptitSeCode("R1");
        vo.setFrstRegisterId("FR1");

        ScheduleDto dto = ScheduleAdapter.toDto(vo);

        assertNotNull(dto);
        assertEquals("S1", dto.getSchdulId());
        assertEquals("SE1", dto.getSchdulSe());
        assertEquals("D1", dto.getSchdulDeptId());
        assertEquals("K1", dto.getSchdulKindCode());
        assertEquals("20230101", dto.getSchdulBgnde());
        assertEquals("20230102", dto.getSchdulEndde());
        assertEquals("Name", dto.getSchdulNm());
        assertEquals("Content", dto.getSchdulCn());
        assertEquals("Place", dto.getSchdulPlace());
        assertEquals("I1", dto.getSchdulIpcrCode());
        assertEquals("C1", dto.getSchdulChargerId());
        assertEquals("F1", dto.getAtchFileId());
        assertEquals("R1", dto.getReptitSeCode());
        assertEquals("FR1", dto.getFrstRegisterId());
    }

    @Test
    void testToDto_fromDeptSchdulManageVO_withNullVO() {
        assertNull(ScheduleAdapter.toDto((DeptSchdulManageVO) null));
    }

    @Test
    void testToVOList_withValidList() {
        ScheduleDto dto1 = ScheduleDto.builder().schdulId("S1").build();
        ScheduleDto dto2 = ScheduleDto.builder().schdulId("S2").build();
        List<ScheduleDto> dtoList = Arrays.asList(dto1, dto2);

        List<IndvdlSchdulManageVO> voList = ScheduleAdapter.toVOList(dtoList);

        assertNotNull(voList);
        assertEquals(2, voList.size());
        assertEquals("S1", voList.get(0).getSchdulId());
        assertEquals("S2", voList.get(1).getSchdulId());
    }

    @Test
    void testToVOList_withNullList() {
        assertNull(ScheduleAdapter.toVOList(null));
    }
}
