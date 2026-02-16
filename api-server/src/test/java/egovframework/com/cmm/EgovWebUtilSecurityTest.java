package egovframework.com.cmm;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class EgovWebUtilSecurityTest {

    @Test
    public void testRemoveOSCmdRisk_Sanitization() {
        // Test dangerous characters that should be removed
        String dangerous1 = "`reboot`";
        assertEquals("reboot", EgovWebUtil.removeOSCmdRisk(dangerous1), "Backticks should be removed");

        String dangerous2 = "$(reboot)";
        assertEquals("reboot", EgovWebUtil.removeOSCmdRisk(dangerous2), "Command substitution syntax should be removed");

        String dangerous3 = "image.jpg";
        assertEquals("image.jpg", EgovWebUtil.removeOSCmdRisk(dangerous3), "Safe filename should remain");
    }
}
