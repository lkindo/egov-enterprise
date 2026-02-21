package egovframework.com.cmm;

import java.net.URLEncoder;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ????? ????????? ( IE?Edge, Safari, Chrome, Firefox, Opera )
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????             ????             ????
 *  -----------  --------    ---------------------------
 *   2018.08.27  ???             ????
 *
 * </pre>
 **/

public class EgovBrowserUtil {
	
	public static final String FIREFOX = "Firefox";
	public static final String SAFARI = "Safari";
	public static final String CHROME = "Chrome";
	public static final String OPERA = "Opera";
	public static final String MSIE = "MSIE";
	public static final String EDGE = "Edge";
	public static final String WHALE = "Whale";
	public static final String OTHER = "Other";
	
	public static final String TYPEKEY = "type";
	public static final String VERSIONKEY = "version";

	private static final Pattern PATTERN_MSIE = Pattern.compile("MSIE ([0-9]{1,2}.[0-9])");
	private static final Pattern PATTERN_EDGE = Pattern.compile("Edge/([0-9]{1,3}.[0-9]{1,5})");
	private static final Pattern PATTERN_FIREFOX = Pattern.compile("Firefox/([0-9]{1,3}.[0-9]{1,3})");
	private static final Pattern PATTERN_OPERA = Pattern.compile("OPR/([0-9]{1,3}.[0-9]{1,3})");
	private static final Pattern PATTERN_WHALE = Pattern.compile("Whale/([0-9]{1,3}\\.[0-9]{1,3})");
	private static final Pattern PATTERN_CHROME = Pattern.compile("Chrome/([0-9]{1,3}.[0-9]{1,3})");
	private static final Pattern PATTERN_SAFARI = Pattern.compile("Version/([0-9]{1,2}.[0-9]{1,3})");

	public static HashMap<String,String> getBrowser(String userAgent) {
		
		HashMap<String,String> result = new HashMap<String,String>();
		Matcher matcher = null;
		//System.out.println("=====>>>>> userAgent = "+userAgent);
		
		matcher = PATTERN_MSIE.matcher(userAgent);
		if (matcher.find())
		{
		    result.put(TYPEKEY,MSIE);
		    result.put(VERSIONKEY,matcher.group(1));
			return result;
		}
		
		if (userAgent.indexOf("Trident/7.0") > -1) {
		    result.put(TYPEKEY,MSIE);
		    result.put(VERSIONKEY,"11.0");
		    return result;
		}
		
		matcher = PATTERN_EDGE.matcher(userAgent);
		if (matcher.find())
		{
		    result.put(TYPEKEY,EDGE);
		    result.put(VERSIONKEY,matcher.group(1));
			return result;
		}
		
		matcher = PATTERN_FIREFOX.matcher(userAgent);
		if (matcher.find())
		{
		    result.put(TYPEKEY,FIREFOX);
		    result.put(VERSIONKEY,matcher.group(1));
			return result;		    
		}

		matcher = PATTERN_OPERA.matcher(userAgent);
		if (matcher.find())
		{
		    result.put(TYPEKEY,OPERA);
		    result.put(VERSIONKEY,matcher.group(1));
			return result;		    
		}

		matcher = PATTERN_WHALE.matcher(userAgent);
		if (matcher.find()) {
			result.put(TYPEKEY, WHALE);
			result.put(VERSIONKEY, matcher.group(1));
			return result;
		}

		matcher = PATTERN_CHROME.matcher(userAgent);
		if (matcher.find())
		{
		    result.put(TYPEKEY,CHROME);
		    result.put(VERSIONKEY,matcher.group(1));
			return result;		    
		}
		
		matcher = PATTERN_SAFARI.matcher(userAgent);
		if (matcher.find())
		{
		    result.put(TYPEKEY,SAFARI);
		    result.put(VERSIONKEY,matcher.group(1));
			return result;		    
		}

	    result.put(TYPEKEY,OTHER);
	    result.put(VERSIONKEY,"0.0");
		return result;
	}
	
	public static String getDisposition(String filename, String userAgent, String charSet) throws Exception {
		
		String encodedFilename = null;
		HashMap<String,String> result = EgovBrowserUtil.getBrowser(userAgent);
		float version = Float.parseFloat(result.get(EgovBrowserUtil.VERSIONKEY));
		//System.out.println("=====>>>>> browser type = "+result.get(TYPEKEY));
		//System.out.println("=====>>>>> browser version = "+result.get(VERSIONKEY));
		//System.out.println("=====>>>>> filename = "+filename);
		
		if ( EgovBrowserUtil.MSIE.equals(result.get(EgovBrowserUtil.TYPEKEY)) && version <= 8.0f ) {
			encodedFilename = "Content-Disposition: attachment; filename="+URLEncoder.encode(filename, charSet).replaceAll("\\+", "%20");
		} else if ( EgovBrowserUtil.OTHER.equals(result.get(EgovBrowserUtil.TYPEKEY)) ) {
			throw new RuntimeException("Not supported browser");
		} else {
			encodedFilename = "attachment; filename*="+charSet+"''"+URLEncoder.encode(filename, charSet);
		}
		
		return encodedFilename;
	}

}
