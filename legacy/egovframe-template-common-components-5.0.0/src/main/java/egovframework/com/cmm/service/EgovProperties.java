package egovframework.com.cmm.service;

import java.io.BufferedInputStream;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.utl.fcc.service.EgovStringUtil;


/**
 * EgovProperties ?대옒??
 *
 * <p>
 *  Description : properties媛믩뱾???뚯씪濡쒕????쎌뼱?   Globals?대옒?ㅼ쓽 ?뺤쟻蹂?섎줈 濡쒕뱶?쒖폒二쇰뒗 ?대옒?ㅻ줈
 *   臾몄옄???뺣낫 湲곗??쇰줈 ?ъ슜???꾩뿭蹂?섎? ?쒖뒪???ъ떆?묒쑝濡?諛섏쁺?????덈룄濡??쒕떎.
 * </p>
 *
 *  @since 2009. 01. 19
 *  @version 1.0
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤???
 *  @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??             ?섏젙??         ?섏젙?댁슜
 *   ----------  --------  ---------------------------
 *   2009.01.19  諛뺤???         理쒖큹 ?앹꽦
 *   2011.07.20    ?쒖???    Globals?뚯씪???곷?寃쎈줈瑜??쎌? 硫붿꽌??異붽?
 *   2014.10.13    ?닿린??    Globals.properties 媛믪씠 null??寃쎌슦 ?ㅻ쪟泥섎━
 *   2019.04.26    ?좎슜??    RELATIVE_PATH_PREFIX Path ?곸슜 諛⑹떇 媛쒖꽑
 *   2022.01.21    ?ㅼ＜??    Try-catch-resource 議곗튂 諛?Method Refactoring
 *</pre>
 */

public class EgovProperties {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovProperties.class);

	//?뚯씪援щ텇??
	final static String FILE_SEPARATOR = System.getProperty("file.separator");

	//?꾨줈?쇳떚 ?뚯씪??臾쇰━???꾩튂
	//public static final String GLOBALS_PROPERTIES_FILE = System.getProperty("user.home") + FILE_SEPARATOR + "egovProps" +FILE_SEPARATOR + "globals.properties";

	public static final String RELATIVE_PATH_PREFIX = EgovProperties.class.getResource("") == null ? ""
		: EgovProperties.class.getResource("").getPath().substring(0,
			EgovProperties.class.getResource("").getPath().lastIndexOf("com"));
	//public static final String RELATIVE_PATH_PREFIX = EgovProperties.class.getProtectionDomain().getCodeSource().getLocation().getPath().substring(0,EgovProperties.class.getProtectionDomain().getCodeSource().getLocation().getPath().indexOf("WEB-INF/classes/")+"WEB-INF/classes/".length())+"egovframework/";

	public static final String GLOBALS_PROPERTIES_FILE = RELATIVE_PATH_PREFIX + "egovProps" + FILE_SEPARATOR
		+ "globals.properties";

	/**
	 * ?몄옄濡?二쇱뼱吏?臾몄옄?댁쓣 Key媛믪쑝濡??섎뒗 ?꾨줈?쇳떚 媛믪쓣 諛섑솚?쒕떎(Globals.java ?꾩슜)
	 * @param keyName String
	 * @return String
	 */
	public static String getProperty(String keyName) {
		// 221116	源?쒖?	2022 ?쒗걧?댁퐫??議곗튂
		LOGGER.debug("===>>> getProperty" + EgovStringUtil.isNullToString(EgovProperties.class.getProtectionDomain().getCodeSource().getLocation().getPath()));
		LOGGER.debug("getProperty : {} = {}", GLOBALS_PROPERTIES_FILE, keyName);

		return getPropertyValueByKey(keyName);
	}

	/**
	 * ?몄옄濡?二쇱뼱吏?臾몄옄?댁쓣 Key媛믪쑝濡??섎뒗 ?곷?寃쎈줈 ?꾨줈?쇳떚 媛믪쓣 ?덈?寃쎈줈濡?諛섑솚?쒕떎(Globals.java ?꾩슜)
	 * @param keyName String
	 * @return String
	 */
	public static String getPathProperty(String keyName) {
		LOGGER.debug("getPathProperty : {} = {}", GLOBALS_PROPERTIES_FILE, keyName);

		return RELATIVE_PATH_PREFIX + "egovProps" + FILE_SEPARATOR + getProperty(keyName);
	}

	/**
	 * 二쇱뼱吏??뚯씪?먯꽌 ?몄옄濡?二쇱뼱吏?臾몄옄?댁쓣 Key媛믪쑝濡??섎뒗 ?꾨줈?쇳떚 媛믪쓣 諛섑솚?쒕떎
	 * @param fileName String
	 * @param key String
	 * @return String
	 */
	public static String getProperty(String fileName, String keyName) {
		return getPropertyValueByKey(fileName, keyName);
	}

	/**
	 * 二쇱뼱吏??뚯씪?먯꽌 ?몄옄濡?二쇱뼱吏?臾몄옄?댁쓣 Key媛믪쑝濡??섎뒗 ?꾨줈?쇳떚 ?곷? 寃쎈줈媛믪쓣 ?덈? 寃쎈줈媛믪쑝濡?諛섑솚?쒕떎
	 * @param fileName String
	 * @param key String
	 * @return String
	 */
	public static String getPathProperty(String fileName, String keyName) {
		return RELATIVE_PATH_PREFIX + "egovProps" + FILE_SEPARATOR + getProperty(fileName, keyName);
	}

	/**
	 * 二쇱뼱吏??꾨줈?뚯씪???댁슜???뚯떛?섏뿬 (key-value) ?뺥깭??援ъ“泥?諛곗뿴??諛섑솚?쒕떎.
	 * @param property String
	 * @return ArrayList
	 */
	public static ArrayList<Map<String, String>> loadPropertyFile(String propertyPath) {

		// key - value ?뺥깭濡???諛곗뿴 寃곌낵
		ArrayList<Map<String, String>> keyList = new ArrayList<>();

		String src = (RELATIVE_PATH_PREFIX + propertyPath).replace("\\", FILE_SEPARATOR).replace("/", FILE_SEPARATOR);

		// Windows OS : 留??욎뿉 ?덈뒗 \ ?쒓굅
		// Linux, Mac : ?대떦 ?놁쓬
        String normalizedPath = src.replaceFirst("^[\\\\]+", "");

		Path path = Paths.get(EgovWebUtil.filePathBlackList(normalizedPath));

		if (Files.exists(path)) { //2022.01 Potential Path Traversal
			Properties props = loadPropertiesFromFile(src);

			Enumeration<?> plist = props.propertyNames();
			if (plist != null) {
				while (plist.hasMoreElements()) {
					Map<String, String> map = new HashMap<>();
					String key = (String)plist.nextElement();
					map.put(key, props.getProperty(key));
					keyList.add(map);
				}
			}
		}

		return keyList;
	}

	/**
	 * 湲곕낯 Property ?먯꽌 Property Key濡?Property value 諛쏆븘?⑤떎.
	 * @param keyName
	 * @return
	 */
	public static String getPropertyValueByKey(String keyName) {
		return getPropertyValueByKey(GLOBALS_PROPERTIES_FILE, keyName);
	}

	/**
	 * Property ?뚯씪??吏?뺥븯??Property Key濡?Property value 諛쏆븘?⑤떎.
	 * @param fileName
	 * @param keyName
	 * @return
	 */
	public static String getPropertyValueByKey(String fileName, String keyName) {
		String propertyValue = "";
		Properties props = loadPropertiesFromFile(fileName);

		if (props.containsKey(keyName)) {
			propertyValue = props.getProperty(keyName).trim();
		}

		return propertyValue;
	}

	/**
	 * Property ?뚯씪?⑥뒪濡?Properties 媛앹껜瑜?由ы꽩?쒕떎.
	 * @param fileName
	 * @return
	 */
	private static Properties loadPropertiesFromFile(String fileName) {
		Properties props = new Properties();

		try (FileInputStream fis = new FileInputStream(EgovWebUtil.filePathBlackList(fileName));
			BufferedInputStream bis = new BufferedInputStream(fis);) {
			props.load(bis);
		} catch (FileNotFoundException fne) {
			LOGGER.debug("Property file not found.", fne);
			throw new RuntimeException("Property file not found", fne);
		} catch (IOException ioe) {
			LOGGER.debug("Property file IO exception", ioe);
			throw new RuntimeException("Property file IO exception", ioe);
		}

		return props;
	}
}
