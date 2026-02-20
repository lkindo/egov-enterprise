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
 * EgovProperties ?????
 *
 * <p>
 * Description : properties????????????? Globals????? ??? ?????????
 * ????? ??? ????????? ???????????????????.
 * </p>
 *
 * @since 2009. 01. 19
 * @version 1.0
 * @author ????????? ???
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????             ????         ????
 *   ----------  --------  ---------------------------
 *   2009.01.19  ???         ????
 *   2011.07.20    ?????    Globals??????????? ????
 *   2014.10.13    ????    Globals.properties ???null????????
 *   2019.04.26    ???    RELATIVE_PATH_PREFIX Path ? ???
 *   2022.01.21    ????    Try-catch-resource ???Method Refactoring
 *      </pre>
 **/

public class EgovProperties {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovProperties.class);

	// ??????
	final static String FILE_SEPARATOR = System.getProperty("file.separator");

	// ??? ??????????
	// public static final String GLOBALS_PROPERTIES_FILE =
	// System.getProperty("user.home") + FILE_SEPARATOR + "egovProps"
	// +FILE_SEPARATOR + "globals.properties";

	public static final String RELATIVE_PATH_PREFIX = EgovProperties.class.getResource("") == null ? ""
			: EgovProperties.class.getResource("").getPath().substring(0,
					EgovProperties.class.getResource("").getPath().lastIndexOf("com"));
	// public static final String RELATIVE_PATH_PREFIX =
	// EgovProperties.class.getProtectionDomain().getCodeSource().getLocation().getPath().substring(0,EgovProperties.class.getProtectionDomain().getCodeSource().getLocation().getPath().indexOf("WEB-INF/classes/")+"WEB-INF/classes/".length())+"egovframework/";

	public static final String GLOBALS_PROPERTIES_FILE = RELATIVE_PATH_PREFIX + "egovProps" + FILE_SEPARATOR
			+ "globals.properties";

	/**
	 * ??????? Key????? ??? ??????(Globals.java ?)
	 * 
	 * @param keyName String
	 * @return String
	 **/
	public static String getProperty(String keyName) {
		// 221116 ??? 2022 ????????
		LOGGER.debug("===>>> getProperty" + EgovStringUtil
				.isNullToString(EgovProperties.class.getProtectionDomain().getCodeSource().getLocation().getPath()));
		LOGGER.debug("getProperty : {} = {}", GLOBALS_PROPERTIES_FILE, keyName);

		return getPropertyValueByKey(keyName);
	}

	/**
	 * ??????? Key????? ?????? ??????????(Globals.java ?)
	 * 
	 * @param keyName String
	 * @return String
	 **/
	public static String getPathProperty(String keyName) {
		LOGGER.debug("getPathProperty : {} = {}", GLOBALS_PROPERTIES_FILE, keyName);

		return RELATIVE_PATH_PREFIX + "egovProps" + FILE_SEPARATOR + getProperty(keyName);
	}

	/**
	 * ?????? ??????? Key????? ??? ??????
	 * 
	 * @param fileName String
	 * @param key      String
	 * @return String
	 **/
	public static String getProperty(String fileName, String keyName) {
		return getPropertyValueByKey(fileName, keyName);
	}

	/**
	 * ?????? ??????? Key????? ??? ??  ??? ????
	 * 
	 * @param fileName String
	 * @param key      String
	 * @return String
	 **/
	public static String getPathProperty(String fileName, String keyName) {
		return RELATIVE_PATH_PREFIX + "egovProps" + FILE_SEPARATOR + getProperty(fileName, keyName);
	}

	/**
	 * ???????????????? (key-value) ??????????.
	 * 
	 * @param property String
	 * @return ArrayList
	 **/
	public static ArrayList<Map<String, String>> loadPropertyFile(String propertyPath) {

		// key - value ???????
		ArrayList<Map<String, String>> keyList = new ArrayList<>();

		String src = (RELATIVE_PATH_PREFIX + propertyPath).replace("\\", FILE_SEPARATOR).replace("/", FILE_SEPARATOR);

		// Windows OS : ??? ?? \ ??
		// Linux, Mac : ??????
		String normalizedPath = src.replaceFirst("^[\\\\]+", "");

		Path path = Paths.get(EgovWebUtil.filePathBlackList(normalizedPath));

		if (Files.exists(path)) { // 2022.01 Potential Path Traversal
			Properties props = loadPropertiesFromFile(src);

			Enumeration<?> plist = props.propertyNames();
			if (plist != null) {
				while (plist.hasMoreElements()) {
					Map<String, String> map = new HashMap<>();
					String key = (String) plist.nextElement();
					map.put(key, props.getProperty(key));
					keyList.add(map);
				}
			}
		}

		return keyList;
	}

	/**
	 * ??Property ?? Property Key?Property value ??.
	 * 
	 * @param keyName
	 * @return
	 **/
	public static String getPropertyValueByKey(String keyName) {
		return getPropertyValueByKey(GLOBALS_PROPERTIES_FILE, keyName);
	}

	/**
	 * Property ????????Property Key?Property value ??.
	 * 
	 * @param fileName
	 * @param keyName
	 * @return
	 **/
	public static String getPropertyValueByKey(String fileName, String keyName) {
		String propertyValue = "";
		Properties props = loadPropertiesFromFile(fileName);

		if (props.containsKey(keyName)) {
			propertyValue = props.getProperty(keyName).trim();
		}

		return propertyValue;
	}

	/**
	 * Property ??????Properties ????.
	 * 
	 * @param fileName
	 * @return
	 **/
	private static Properties loadPropertiesFromFile(String fileName) {
		Properties props = new Properties();

		try {
			// 1. Try absolute/relative file path
			String filteredName = EgovWebUtil.filePathBlackList(fileName);
			try (FileInputStream fis = new FileInputStream(filteredName);
					BufferedInputStream bis = new BufferedInputStream(fis)) {
				props.load(bis);
				LOGGER.debug("Loaded properties from file: {}", filteredName);
				return props;
			} catch (FileNotFoundException e) {
				// Fallback to classpath if not found on filesystem
				String resourcePath = fileName;
				if (resourcePath.contains("egovProps")) {
					resourcePath = "/egovframework/egovProps/"
							+ resourcePath.substring(resourcePath.lastIndexOf(FILE_SEPARATOR) + 1);
				}

				// Try direct classpath loading
				try (java.io.InputStream is = EgovProperties.class.getResourceAsStream(resourcePath)) {
					if (is != null) {
						props.load(is);
						LOGGER.debug("Loaded properties from classpath: {}", resourcePath);
						return props;
					}
				}

				// Try one more common path for globals.properties
				if (fileName.contains("globals.properties")) {
					try (java.io.InputStream is = EgovProperties.class
							.getResourceAsStream("/egovframework/egovProps/globals.properties")) {
						if (is != null) {
							props.load(is);
							LOGGER.debug("Loaded globals.properties from default classpath location");
							return props;
						}
					}
				}

				throw e; // Rethrow if all fails
			}
		} catch (IOException ioe) {
			LOGGER.debug("Property file IO exception", ioe);
			throw new RuntimeException("Property file IO exception", ioe);
		}
	}
}
