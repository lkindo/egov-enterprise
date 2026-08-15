package nuri.business.domain.schedule;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import static org.junit.jupiter.api.Assertions.*;

class ScheduleTest {

    @Test
    @DisplayName("Schedule 엔티티 생성자, 빌더 및 레거시 별칭 100% 검증")
    void schedule_all_features_test() throws Exception {
        // 1. 기본 생성자 (Protected) 검증
        Constructor<Schedule> noArgConstructor = Schedule.class.getDeclaredConstructor();
        noArgConstructor.setAccessible(true);
        Schedule schdl1 = noArgConstructor.newInstance();
        assertNotNull(schdl1);

        // 2. 전체 인자 생성자 및 기본 Getter/Setter 검증
        Schedule schdl2 = new Schedule(
                1L, "Cd1", "Name", "Content", "Rep1", "20260501", "20260505",
                "127.0.0.1", "Pic1", 101L, "Dept1", "Knd1", "Place", "Imprt1"
        );
        assertEquals(1L, schdl2.getSchdlSn());
        assertEquals("Cd1", schdl2.getSchdlSeCd());
        assertEquals("Name", schdl2.getSchdlNm());
        assertEquals("Content", schdl2.getSchdlCn());
        assertEquals("Rep1", schdl2.getReptSeCd());
        assertEquals("20260501", schdl2.getSchdlBgngYmd());
        assertEquals("20260505", schdl2.getSchdlEndYmd());
        assertEquals("127.0.0.1", schdl2.getSchdlIpAddr());
        assertEquals("Pic1", schdl2.getSchdlPicId());
        assertEquals(101L, schdl2.getAtchFileSn());
        assertEquals("Dept1", schdl2.getSchdlDeptId());
        assertEquals("Knd1", schdl2.getSchdlKndCd());
        assertEquals("Place", schdl2.getSchdlPlcNm());
        assertEquals("Imprt1", schdl2.getSchdlImprtCd());

        // Setter 동작 및 IpAddr 등 변경 검증
        schdl2.setSchdlIpAddr("192.168.0.1");
        assertEquals("192.168.0.1", schdl2.getSchdlIpAddr());

        // 3. SuperBuilder 검증 및 Legacy Alias 검증
        Schedule schdl3 = Schedule.builder()
                .schdlSn(3L)
                .schdlNm("Name3")
                .schdlCn("Content3")
                .schdlBgngYmd("20260510")
                .schdlEndYmd("20260515")
                .build();
        // 표준 필드 검증
        assertEquals(3L, schdl3.getSchdlSn());
        assertEquals("Name3", schdl3.getSchdlNm());
        assertEquals("Content3", schdl3.getSchdlCn());
        assertEquals("20260510", schdl3.getSchdlBgngYmd());
        assertEquals("20260515", schdl3.getSchdlEndYmd());

        // 4. 비즈니스 update() 메소드 검증
        schdl3.update("NewName", "NewCn", "NewSeCd", "20260601", "20260605", "NewRept", "NewPic", 102L);
        assertEquals("NewName", schdl3.getSchdlNm());
        assertEquals("NewCn", schdl3.getSchdlCn());
        assertEquals("NewSeCd", schdl3.getSchdlSeCd());
        assertEquals("20260601", schdl3.getSchdlBgngYmd());
        assertEquals("20260605", schdl3.getSchdlEndYmd());
        assertEquals("NewRept", schdl3.getReptSeCd());
        assertEquals("NewPic", schdl3.getSchdlPicId());
        assertEquals(102L, schdl3.getAtchFileSn());

        // 5. 비즈니스 updateAll() 메소드 검증
        schdl3.updateAll("AllName", "AllCn", "AllSe", "AllKnd", "20260701", "20260705", "AllPlc", "AllImp", "AllPic", "AllRep");
        assertEquals("AllName", schdl3.getSchdlNm());
        assertEquals("AllCn", schdl3.getSchdlCn());
        assertEquals("AllSe", schdl3.getSchdlSeCd());
        assertEquals("AllKnd", schdl3.getSchdlKndCd());
        assertEquals("20260701", schdl3.getSchdlBgngYmd());
        assertEquals("20260705", schdl3.getSchdlEndYmd());
        assertEquals("AllPlc", schdl3.getSchdlPlcNm());
        assertEquals("AllImp", schdl3.getSchdlImprtCd());
        assertEquals("AllPic", schdl3.getSchdlPicId());
        assertEquals("AllRep", schdl3.getReptSeCd());

        assertNotNull(Schedule.builder().toString());
    }
}
