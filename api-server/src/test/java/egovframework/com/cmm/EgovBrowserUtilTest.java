package egovframework.com.cmm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.URLEncoder;
import java.util.HashMap;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class EgovBrowserUtilTest {

    @ParameterizedTest
    @MethodSource("provideUserAgents")
    void testGetBrowser(String userAgent, String expectedType, String expectedVersion) {
        HashMap<String, String> result = EgovBrowserUtil.getBrowser(userAgent);
        assertEquals(expectedType, result.get(EgovBrowserUtil.TYPEKEY), "Type mismatch for: " + userAgent);
        assertEquals(expectedVersion, result.get(EgovBrowserUtil.VERSIONKEY), "Version mismatch for: " + userAgent);
    }

    @Test
    void testGetDisposition() throws Exception {
        String filename = "테스트파일.txt";
        String charSet = "UTF-8";
        String encodedFilename = URLEncoder.encode(filename, charSet).replaceAll("\\+", "%20");
        String encodedFilenameWithStar = URLEncoder.encode(filename, charSet);

        // Case 1: MSIE version <= 8.0
        String userAgentIE8 = "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)";
        String dispositionIE8 = EgovBrowserUtil.getDisposition(filename, userAgentIE8, charSet);
        assertEquals("Content-Disposition: attachment; filename=" + encodedFilename, dispositionIE8);

        // Case 2: Other supported browser (Chrome)
        String userAgentChrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36";
        String dispositionChrome = EgovBrowserUtil.getDisposition(filename, userAgentChrome, charSet);
        assertEquals("attachment; filename*=" + charSet + "''" + encodedFilenameWithStar, dispositionChrome);

        // Case 3: Unsupported browser (OTHER)
        String userAgentOther = "MyCustomBrowser/1.0";
        Exception exception = assertThrows(RuntimeException.class, () -> {
            EgovBrowserUtil.getDisposition(filename, userAgentOther, charSet);
        });
        assertEquals("Not supported browser", exception.getMessage());
    }

    private static Stream<Arguments> provideUserAgents() {
        return Stream.of(
            // IE 7.0
            Arguments.of("Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)", EgovBrowserUtil.MSIE, "7.0"),
            Arguments.of("Mozilla/4.0 (Mozilla/4.0; MSIE 7.0; Windows NT 5.1; FDM; SV1; .NET CLR 3.0.04506.30)", EgovBrowserUtil.MSIE, "7.0"),
            // IE 8.0
            Arguments.of("Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)", EgovBrowserUtil.MSIE, "8.0"),
            // IE 9.0
            Arguments.of("Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)", EgovBrowserUtil.MSIE, "9.0"),
            // IE 10.0
            Arguments.of("Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)", EgovBrowserUtil.MSIE, "10.0"),
            // IE 11.0
            Arguments.of("Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko", EgovBrowserUtil.MSIE, "11.0"),
            // Chrome 68.0.3440.106
            Arguments.of("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36", EgovBrowserUtil.CHROME, "68.0"),
            // Edge 17.17134
            Arguments.of("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134", EgovBrowserUtil.EDGE, "17.17134"),
            // Opera 55.0.2994.44
            Arguments.of("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36 OPR/55.0.2994.44", EgovBrowserUtil.OPERA, "55.0"),
            Arguments.of("Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36 OPR/26.0.1656.60", EgovBrowserUtil.OPERA, "26.0"),
            // Firefox 61.0
            Arguments.of("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0", EgovBrowserUtil.FIREFOX, "61.0"),
            // Safari 11.1.2
            Arguments.of("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15", EgovBrowserUtil.SAFARI, "11.1"),
            // iPhone 11.0
            Arguments.of("Mozilla/5.0 (iPhone; CPU iPhone OS 11_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1", EgovBrowserUtil.SAFARI, "11.0"),
            // iPad 9.0
            Arguments.of("Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1", EgovBrowserUtil.SAFARI, "9.0"),
            // Window Phone 10 (Edge 12.0)
            Arguments.of("Mozilla/5.0 (Windows Phone 10.0;  Android 4.2.1; Nokia; Lumia 520) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Mobile Safari/537.36 Edge/12.0", EgovBrowserUtil.EDGE, "12.0"),
            // Window Phone 8.1 (IE 11.0)
            Arguments.of("Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 520) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537", EgovBrowserUtil.MSIE, "11.0"),
            // Window Phone 8 (IE 10.0)
            Arguments.of("Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch)", EgovBrowserUtil.MSIE, "10.0"),
            // Window Phone 7 (IE 9.0)
            Arguments.of("Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0)", EgovBrowserUtil.MSIE, "9.0"),
            // XBOX One (IE 10.0)
            Arguments.of("Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0; Xbox; Xbox One)", EgovBrowserUtil.MSIE, "10.0"),
            // XBOX 360 (IE 9.0)
            Arguments.of("Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0; Xbox)", EgovBrowserUtil.MSIE, "9.0"),
            // Whale 0.9.31.20
            Arguments.of("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Whale/0.9.31.20 Safari/537.36", EgovBrowserUtil.WHALE, "0.9")
        );
    }
}
