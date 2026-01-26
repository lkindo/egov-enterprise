package egovframework.com.cmm.service;

import org.junit.jupiter.api.Test;
import java.io.IOException;
import static org.junit.jupiter.api.Assertions.*;

public class FileSystemUtilsTest {

    @Test
    public void testProcessOperate_AllowedClass() {
        FileSystemUtils utils = new FileSystemUtils();
        // The current implementation of openProcess creates new ProcessBuilder() and calls start()
        // which throws IndexOutOfBoundsException because command list is empty.
        // We just verify that it REACHES that point (meaning it passed the allow list check).
        assertThrows(IndexOutOfBoundsException.class, () -> {
             utils.processOperate("BatchShellScriptJob", "ls");
        });
    }

    @Test
    public void testProcessOperate_DeniedClass() throws IOException {
        FileSystemUtils utils = new FileSystemUtils();
        // Should return null because it's not in allowed list
        Process p = utils.processOperate("UnknownClass", "ls");
        assertNull(p);
    }
}
