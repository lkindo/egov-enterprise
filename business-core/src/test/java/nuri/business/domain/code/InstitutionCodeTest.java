package nuri.business.domain.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("InstitutionCode 엔티티 테스트")
class InstitutionCodeTest {

    @Test
    @DisplayName("빌더 및 getter 테스트")
    void testBuilderAndGetter() {
        InstitutionCode code = InstitutionCode.builder()
                .instCd("INST_01")
                .allInstNm("전체기관명")
                .lwstInstNm("하위기관명")
                .instAbbrNm("약어")
                .odr("01")
                .ord("001")
                .instCycl(3)
                .topInstCd("TOP")
                .uprInstCd("UP")
                .reprsInstCd("RPRS")
                .instTypeLclsf("L")
                .instTypeMclsf("M")
                .instTypeSclas("S")
                .telno("02-123")
                .faxNo("02-456")
                .crtYmd("20200101")
                .ablYmd("20201231")
                .ablYn(null) // null이면 "0"으로 설정되는지 확인
                .chgYmd("20200505")
                .chgTm("120000")
                .crtrYmd("20200101")
                .sortOrdr(1L)
                .frstRgtrId("admin")
                .build();

        assertEquals("INST_01", code.getInstCd());
        assertEquals("전체기관명", code.getAllInstNm());
        assertEquals("하위기관명", code.getLwstInstNm());
        assertEquals("약어", code.getInstAbbrNm());
        assertEquals("01", code.getOdr());
        assertEquals("001", code.getOrd());
        assertEquals(3, code.getInstCycl());
        assertEquals("TOP", code.getTopInstCd());
        assertEquals("UP", code.getUprInstCd());
        assertEquals("RPRS", code.getReprsInstCd());
        assertEquals("L", code.getInstTypeLclsf());
        assertEquals("M", code.getInstTypeMclsf());
        assertEquals("S", code.getInstTypeSclsf());
        assertEquals("02-123", code.getTelno());
        assertEquals("02-456", code.getFaxNo());
        assertEquals("20200101", code.getCrtYmd());
        assertEquals("20201231", code.getAblYmd());
        assertEquals("0", code.getAblYn());
        assertEquals("20200505", code.getChgYmd());
        assertEquals("120000", code.getChgTm());
        assertEquals("20200101", code.getCrtrYmd());
        assertEquals(1L, code.getSortOrdr());
        assertEquals("admin", code.getFrstRgtrId());
    }
}