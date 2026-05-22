package nuri.business.domain.schedule;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import static org.junit.jupiter.api.Assertions.*;

class LeaderScheduleTest {

    @Test
    @DisplayName("LeaderSchedule 엔티티 생성자, 빌더 및 비즈니스 갱신 100% 검증")
    void leaderSchedule_all_features_test() throws Exception {
        // 1. 기본 생성자 (Protected) 검증
        Constructor<LeaderSchedule> noArgConstructor = LeaderSchedule.class.getDeclaredConstructor();
        noArgConstructor.setAccessible(true);
        LeaderSchedule schdl1 = noArgConstructor.newInstance();
        assertNotNull(schdl1);

        // 2. 전체 인자 생성자 및 기본 Getter/Setter 검증
        LeaderSchedule schdl2 = new LeaderSchedule(
                "LS1", "Cd1", "Leader1", "Title", "Content", "Rept1", "Imp1", "20260501", "20260505", "Pic1", "Place1"
        );
        assertEquals("LS1", schdl2.getSchdlId());
        assertEquals("Cd1", schdl2.getSchdlSeCd());
        assertEquals("Leader1", schdl2.getLeaderId());
        assertEquals("Title", schdl2.getSchdlNm());
        assertEquals("Content", schdl2.getSchdlCn());
        assertEquals("Rept1", schdl2.getReptSeCd());
        assertEquals("Imp1", schdl2.getSchdlImprtCd());
        assertEquals("20260501", schdl2.getSchdlBgngYmd());
        assertEquals("20260505", schdl2.getSchdlEndYmd());
        assertEquals("Pic1", schdl2.getSchdlPicId());
        assertEquals("Place1", schdl2.getSchdlPlcNm());

        // Setter 검증
        schdl2.setSchdlNm("NewTitle");
        assertEquals("NewTitle", schdl2.getSchdlNm());

        // 3. SuperBuilder 검증
        LeaderSchedule schdl3 = LeaderSchedule.builder()
                .schdlId("LS3")
                .schdlSeCd("Cd3")
                .leaderId("Leader3")
                .schdlNm("Title3")
                .schdlCn("Content3")
                .reptSeCd("Rept3")
                .schdlImprtCd("Imp3")
                .schdlBgngYmd("20260510")
                .schdlEndYmd("20260515")
                .schdlPicId("Pic3")
                .schdlPlcNm("Place3")
                .build();
        assertEquals("LS3", schdl3.getSchdlId());
        assertEquals("Leader3", schdl3.getLeaderId());

        // 4. 비즈니스 update() 메소드 검증
        schdl3.update("NewCd", "NewLdr", "NewTtl", "NewCn", "NewRep", "NewImp", "20260601", "20260605", "NewPic", "NewPlc");
        assertEquals("NewCd", schdl3.getSchdlSeCd());
        assertEquals("NewLdr", schdl3.getLeaderId());
        assertEquals("NewTtl", schdl3.getSchdlNm());
        assertEquals("NewCn", schdl3.getSchdlCn());
        assertEquals("NewRep", schdl3.getReptSeCd());
        assertEquals("NewImp", schdl3.getSchdlImprtCd());
        assertEquals("20260601", schdl3.getSchdlBgngYmd());
        assertEquals("20260605", schdl3.getSchdlEndYmd());
        assertEquals("NewPic", schdl3.getSchdlPicId());
        assertEquals("NewPlc", schdl3.getSchdlPlcNm());

        assertNotNull(LeaderSchedule.builder().toString());
    }
}
