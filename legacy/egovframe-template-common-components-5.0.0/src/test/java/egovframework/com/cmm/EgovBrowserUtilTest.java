package egovframework.com.cmm;

import static org.junit.Assert.assertEquals;
import java.util.HashMap;
import org.junit.Test;

public class EgovBrowserUtilTest {

    @Test
    public void testGetBrowser() {
        String[][] testCases = {
            // IE 7.0
            {"Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)", EgovBrowserUtil.MSIE, "7.0"},
            {"Mozilla/4.0 (Mozilla/4.0; MSIE 7.0; Windows NT 5.1; FDM; SV1; .NET CLR 3.0.04506.30)", EgovBrowserUtil.MSIE, "7.0"},
            // IE 8.0
            {"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0)", EgovBrowserUtil.MSIE, "8.0"},
            // IE 9.0
            {"Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)", EgovBrowserUtil.MSIE, "9.0"},
            // IE 10.0
            {"Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)", EgovBrowserUtil.MSIE, "10.0"},
            // IE 11.0
            {"Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko", EgovBrowserUtil.MSIE, "11.0"},
            // Chrome 68.0.3440.106
            {"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36", EgovBrowserUtil.CHROME, "68.0"},
            // Edge 17.17134
            {"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134", EgovBrowserUtil.EDGE, "17.17134"},
            // Opera 55.0.2994.44
            {"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36 OPR/55.0.2994.44", EgovBrowserUtil.OPERA, "55.0"},
            {"Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36 OPR/26.0.1656.60", EgovBrowserUtil.OPERA, "26.0"},
            // Firefox 61.0
            {"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0", EgovBrowserUtil.FIREFOX, "61.0"},
            // Safari 11.1.2
            {"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15", EgovBrowserUtil.SAFARI, "11.1"},
            // iPhone 11.0
            {"Mozilla/5.0 (iPhone; CPU iPhone OS 11_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1", EgovBrowserUtil.SAFARI, "11.0"},
            // iPad 9.0
            {"Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1", EgovBrowserUtil.SAFARI, "9.0"},
            // Window Pohone 10
            {"Mozilla/5.0 (Windows Phone 10.0;  Android 4.2.1; Nokia; Lumia 520) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Mobile Safari/537.36 Edge/12.0", EgovBrowserUtil.EDGE, "12.0"},
            // Window Pohone 8.1
            {"Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 520) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537", EgovBrowserUtil.MSIE, "11.0"},
            // Window Pohone 8
            {"Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch)", EgovBrowserUtil.MSIE, "10.0"},
            // Window Pohone 7
            {"Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0)", EgovBrowserUtil.MSIE, "9.0"},
            // XBOX One
            {"Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0; Xbox; Xbox One)", EgovBrowserUtil.MSIE, "10.0"},
            // XBOX 360
            {"Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0; Xbox)", EgovBrowserUtil.MSIE, "9.0"}
        };

        for (String[] testCase : testCases) {
            String userAgent = testCase[0];
            String expectedType = testCase[1];
            String expectedVersion = testCase[2];

            HashMap<String, String> result = EgovBrowserUtil.getBrowser(userAgent);

            assertEquals("Type mismatch for UserAgent: " + userAgent, expectedType, result.get(EgovBrowserUtil.TYPEKEY));
            assertEquals("Version mismatch for UserAgent: " + userAgent, expectedVersion, result.get(EgovBrowserUtil.VERSIONKEY));
        }
    }
}
