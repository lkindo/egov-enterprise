package egovframework.com.cmm.aop;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;

import org.springframework.util.ObjectUtils;

import egovframework.com.cmm.service.EgovProperties;
import lombok.extern.slf4j.Slf4j;

/**
 * EgovFileBasePathSecurityValidator Class 援ы쁽
 * 
 * @author ?쒖??꾨젅?꾩썙???좎슜??
 * @since 2025.04.01
 * @version 4.3
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2025.04.01  ?좎슜??         理쒖큹 ?앹꽦
 *   2025.05.22  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-InefficientEmptyStringCheck(鍮꾪슚?⑥쟻??鍮?臾몄옄??寃??, SimplifyBooleanExpressions(遺???쒗쁽???⑥닚??
 *
 *      </pre>
 * 
 *      <pre>
 *  - String basePath ?뚮씪誘명꽣?????蹂댁븞媛뺥솕 泥댄겕瑜??쒕떎.
 *  - 蹂댁븞?깆쓣 ?꾪빐 basePath??ROOT Path瑜?吏?뺥븷???녿떎.
 *  - basePath??????ㅼ쓬 寃쎈줈媛 異붽??섏뼱 ?붿씠?몃━?ㅽ듃 諛⑹떇?쇰줈 ?먭??쒕떎. (?꾩슂???붿씠?몃━?ㅽ듃瑜?異붽??쒕떎)
 *    basePath媛 ?ㅼ쓬 ?쒗븳??寃쎈줈???섏쐞???꾩튂?섎뒗吏 ?먭??쒕떎.
 *    1) Globals.fileStorePath # ?뚯씪 ?낅줈??寃쎈줈
 *    2) Globals.SynchrnServerPath # ?뚯씪 ?숆린??而댄룷?뚰듃?먯꽌 ?ъ슜???뚯씪 ?낅줈??寃쎈줈
 *      </pre>
 */

@Slf4j
public class EgovFileBasePathSecurityValidator {

	public static boolean validate(String basePath) {

		boolean validateResult = false;

		ArrayList<String> whiteList = new ArrayList<String>();
		// ?뚯씪 ?낅줈??寃쎈줈
		whiteList.add(EgovProperties.getProperty("Globals.fileStorePath"));
		// ?뚯씪 ?숆린??而댄룷?뚰듃?먯꽌 ?ъ슜???뚯씪 ?낅줈??寃쎈줈
		whiteList.add(EgovProperties.getProperty("Globals.SynchrnServerPath"));
		// ?뚯뒪?몄슜 Base Path - Windows OS
		// whiteList.add("D:/TEMP/");
		// ?뚯뒪?몄슜 Base Path - Linux, Mac OS
		// whiteList.add("/Users/EgovStoredFiles");

		if (ObjectUtils.isEmpty(basePath)) {
			log.error("ERROR : The base path is empty.");
			return false;
		}

		String normalizedBasePath = basePath.trim().replace("\\", "/"); // ?덈룄??寃쎈줈???숈씪?섍쾶 泥섎━

		// 猷⑦듃 寃쎈줈 ?쒗븳 (由щ늼??/ ?먮뒗 ?덈룄???쒕씪?대툕 猷⑦듃 寃쎈줈??
		if (normalizedBasePath.matches("(?i)^[a-z]:/$") || normalizedBasePath.equals("/")) {
			log.error("ERROR : Root base paths are not allowed. basePath = {}", basePath);
			return false;
		}

		try {
			// ?낅젰 寃쎈줈 ?뺢퇋??(Canonical Path濡?蹂??
			File base = new File(normalizedBasePath).getCanonicalFile();

			// ?덉슜???붾젆?좊━ ?댁씤吏 寃利?
			for (String whiteBasePath : whiteList) {
				File file = new File(whiteBasePath).getCanonicalFile();
				if (file.getPath().startsWith(base.getPath())) {
					validateResult = true;
				}
			}
		} catch (IOException e) {
			log.error("Base Path IO Exception!");
		}

		if (!validateResult) {
			log.error("ERROR : Unacceptable base path: {} ", basePath);
		}

		return validateResult;
	}
}
