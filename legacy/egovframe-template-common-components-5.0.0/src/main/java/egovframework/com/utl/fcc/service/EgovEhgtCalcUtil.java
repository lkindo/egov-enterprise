package egovframework.com.utl.fcc.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import javax.swing.text.html.HTMLEditorKit;
import javax.swing.text.html.parser.ParserDelegator;

import egovframework.com.cmm.service.EgovProperties;
import twitter4j.JSONArray;
import twitter4j.JSONObject;

/**
 * ??쒕?援? 誘멸뎅,?좊읇?고빀, ?쇰낯, 以묎뎅?고빀 ?ъ씠???섏쑉怨꾩궛湲곕뒫???쒓났?섎뒗 Business Interface class
 * <p>
 * ?붿냼湲곗닠 - ?섏쑉怨꾩궛
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.01.13
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.01.13  諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2023.08.25  源?쒖?          ?명솚????쒓났 ?섏쑉 api?먯꽌 ?쒓뎅?섏텧?낆????쒓났 ?섏쑉 api濡?蹂寃?
 *   2025.08.30  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.08.30  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
public class EgovEhgtCalcUtil {

	static private final String EHGT_URL = "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON";
	static private final String AUTH_KEY = EgovProperties.getProperty("ehgtCalc.authKey");
	// ?섏쑉....
	static final char EGHT_USD = 'U'; // 誘멸뎅
	static final char EGHT_JPY = 'J'; // ?쇰낯
	static final char EGHT_EUR = 'E'; // ?좊읇?고빀
	static final char EGHT_CNY = 'C'; // 以묎뎅?고빀

	static final char EGHT_KWR = 'K'; // ??쒕?援?

	static StringBuffer sb = new StringBuffer();

	/**
	 * ??쒕?援?KRW), 誘멸뎅(USD), ?좊읇?고빀(EUR), ?쇰낯(JPY), 以묎뎅?먰솕(CNY) ?ъ씠???섏쑉??怨꾩궛?섎뒗 湲곕뒫?대떎 ?섏쑉??-
	 * 留ㅻℓ湲곗???=> 誘멸뎅(USD) - 1485.00(USD), ?쇰낯-100(JPY) - 1596.26(JPY) 怨꾩궛踰? ??쒕???KRW) -
	 * 1,000??-> 誘멸뎅(USD)濡?蹂????=> 1,000(??/1485(留ㅻℓ湲곗??? = 0.67(URS) 怨꾩궛踰? ?쇰낯(JPY) -
	 * 100,000??-> ??쒕?援?KRW) 蹂????=> (100,000(?? * 1596.26(留ㅻℓ湲곗???) / 100(100?붾떦
	 * 湲곗??쒖씠誘濡? = 1,596,260.00 (KRW) 怨꾩궛踰? ?쇰낯(JPY) - 100,000??-> 誘멸뎅(USD) 蹂????=> (
	 * (100,000(?? * 1596.26(留ㅻℓ湲곗???) / 100(100?붾떦 湲곗??쒖씠誘濡? = 1,596,260.00 (KRW)) /
	 * 1,485.00 = 1,074.92 (USD)
	 * 
	 * @param srcType   - ?섏쑉湲곗?
	 * @param srcAmount - 湲덉븸
	 * @param cnvrType  - 蹂?섑솚??
	 * @return ?섏쑉湲덉븸
	 * @exception MyException
	 * @see
	 */
	public void readHtmlParsing(String str) {
		HttpURLConnection con = null;
		try {
			// ?낅젰諛쏆? URL???곌껐?섏뿬 InputStream???듯빐 ?쎌? ???뚯떛 ?쒕떎.
			URL url = new URL(EHGT_URL + str);

			con = (HttpURLConnection) url.openConnection();

			try (InputStream is = con.getInputStream();
					InputStreamReader reader = new InputStreamReader(is, "euc-kr");) {
				// InputStreamReader reader = new InputStreamReader(con.getInputStream(),
				// "utf-8");

				new ParserDelegator().parse(reader, new CallbackHandler(), true);
			}

			con.disconnect();

		} catch (MalformedURLException e) {
			throw new RuntimeException(e);
		} catch (IOException e) {
			throw new RuntimeException(e);
		} finally {
			if (con != null) {
				con.disconnect();
			}
		}
	}

	// ?뚯꽌??肄쒕갚 ?뺤떇?쇰줈 ?섏뼱 ?덈떎. 媛??쒓렇媛 ?ㅼ뼱 ?щ븣 ?곸젅??硫붿냼?쒓? ?몄텧??
	private class CallbackHandler extends HTMLEditorKit.ParserCallback {

		@Override
		public void handleText(char[] data, int pos) {

			String srcStr = new String(data);

			srcStr = EgovStringUtil.strip(srcStr, "혻");

			sb.append(srcStr).append("/");
		}
	}

	/**
	 * 二쇱뼱吏??뚯뒪 ?뷀룓 ?좏삎 諛?湲덉븸???곕씪 ????뷀룓 ?좏삎?쇰줈???섏쑉??怨꾩궛?섎뒗 硫붿꽌??
	 *
	 * @param srcType   ?먮옒 ?뷀룓 ?좏삎
	 * @param srcAmount 蹂?섑븯?ㅻ뒗 湲덉븸
	 * @param cnvrType  ????뷀룓 ?좏삎
	 * @return 蹂?섎맂 湲덉븸怨?????뷀룓 ?좏삎???ы븿?섎뒗 臾몄옄??
	 * @throws Exception ?덉쇅 諛쒖깮 ??
	 */
	public static String getEhgtCalc(String srcType, long srcAmount, String cnvrType) throws Exception {

		sb.setLength(0); // ?쇱옄 蹂寃????ы샇異????ㅻ쪟 諛⑹?瑜??꾪븳 珥덇린??
		String rtnStr = null;

		JSONArray eghtStdrRt = null; // Html?먯꽌 ?뚯떛???섏쑉留ㅻℓ湲곗??⑥쓣 ??ν븯湲??꾪븳 臾몄옄?대같??

		double srcStdrRt = 0.00; // ?먮옒 留ㅻℓ湲곗???
		double cnvrStdrRt = 0.00; // 蹂??留ㅻℓ湲곗???

		// double cnvrAmount = 0.00; // 蹂?섍툑??
		String sCnvrAmount = null; // 蹂?섍툑??

		String srcStr = null;
		String cnvrStr = null;

		String srcTypeCnvr = srcType.toUpperCase();
		String cnvrTypeCnvr = cnvrType.toUpperCase();

		EgovEhgtCalcUtil parser = new EgovEhgtCalcUtil();

		LocalDate currentDate = LocalDate.now();
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
		String searchDate = "";

		for (int i = 0; i < 10; i++) { // 鍮꾩쁺?낆씪/鍮꾩쁺?낆떆媛?議고쉶 ???꾨궇 ?곗씠??議고쉶?섎룄濡??쇱옄 蹂寃????붿껌 諛섎났
			searchDate = currentDate.format(formatter);
			parser.readHtmlParsing("?authkey=" + AUTH_KEY + "&data=AP01&searchdate=" + searchDate);
			eghtStdrRt = new JSONArray(sb.toString());

			if (eghtStdrRt.length() != 0) {
				break;
			}

			sb.setLength(0);
			currentDate = currentDate.minusDays(1);
		}

		if (sb == null) {
			throw new RuntimeException("StringBuffer is null!!");
		}

		if (eghtStdrRt == null || (eghtStdrRt.length() == 0)) {
			throw new RuntimeException("String Split Error!");
		}

		char srcChr = srcTypeCnvr.charAt(0);
		char cnvrChr = cnvrTypeCnvr.charAt(0);

		// ?먮옒 ?섏쑉湲곗? ?뺤쓽
		switch (srcChr) {

		case EGHT_USD: // 誘멸뎅
			srcStr = "USD";
			break;

		case EGHT_JPY: // ?쇰낯
			srcStr = "JPY(100)";
			break;

		case EGHT_EUR: // ?좊읇?고빀
			srcStr = "EUR";
			break;

		case EGHT_CNY: // 以묎뎅?고빀
			srcStr = "CNH";
			break;

		default:
			srcStr = "USD";
			break;
		}

		// 蹂?섑븯怨좎옄 ?섎뒗 ?섏쑉湲곗? ?뺤쓽
		switch (cnvrChr) {

		case EGHT_USD: // 誘멸뎅
			cnvrStr = "USD";
			break;

		case EGHT_JPY: // ?쇰낯
			cnvrStr = "JPY(100)";
			break;

		case EGHT_EUR: // ?좊읇?고빀
			cnvrStr = "EUR";
			break;

		case EGHT_CNY: // 以묎뎅?고빀
			cnvrStr = "CNH";
			break;

		default:
			cnvrStr = "KRW";
			break;
		}

		// 蹂?섑븯怨좎옄 ?섎뒗 援?????섏쑉留ㅻℓ湲곗???異붿텧...
		// ?먮옒 留ㅻℓ湲곗???異붿텧
		for (int i = 0; i < eghtStdrRt.length(); i++) {
			JSONObject jsonObject = eghtStdrRt.getJSONObject(i);
			if (srcStr.equals(jsonObject.getString("cur_unit"))) {
				srcStdrRt = Double.parseDouble(jsonObject.getString("deal_bas_r").replace(",", ""));
				break;
			}
		}
		// 蹂??留ㅻℓ湲곗???異붿텧
		for (int i = 0; i < eghtStdrRt.length(); i++) {
			JSONObject jsonObject = eghtStdrRt.getJSONObject(i);
			if (cnvrStr.equals(jsonObject.getString("cur_unit"))) {
				cnvrStdrRt = Double.parseDouble(jsonObject.getString("deal_bas_r").replace(",", ""));
				break;
			}
		}

		// ?뺥솗??怨꾩궛???꾪븳 BigDecimal ?뺥깭濡?援ы쁽.
		BigDecimal bSrcAmount = new BigDecimal(String.valueOf(srcAmount)); // 蹂?섑븯怨좎옄 ?섎뒗 湲덉븸
		BigDecimal bSrcStdrRt = new BigDecimal(String.valueOf(srcStdrRt)); // ?먮옒 留ㅻℓ 鍮꾩쑉
		BigDecimal bCnvrStdrRt = new BigDecimal(String.valueOf(cnvrStdrRt)); // 蹂??留ㅻℓ 鍮꾩쑉
		BigDecimal bStdr = new BigDecimal("100"); // 蹂??留ㅻℓ 鍮꾩쑉

		// ?먮옒 留ㅻℓ湲곗???諛?蹂?섎ℓ留ㅺ린以??湲곗??쇰줈 ?섏쑉湲덉븸 怨꾩궛
		switch (srcChr) {

		case EGHT_KWR: // ??쒕?援?
			if (cnvrChr == 'K') {
				// 蹂?섍툑??= 蹂?섎??곴툑??
				sCnvrAmount = bSrcAmount.toString();
			} else if (cnvrChr == 'J') {
				// 蹂?섍툑??= (蹂?섎??곴툑??/ 蹂?섎ℓ留ㅻ퉬?? * 100;
				sCnvrAmount = bSrcAmount.divide(bCnvrStdrRt, 4, 4).multiply(bStdr).setScale(2, 4).toString();
			} else {
				// 蹂?섍툑??= (蹂?섎??곴툑??/ 蹂?섎ℓ留ㅻ퉬??;
				sCnvrAmount = bSrcAmount.divide(bCnvrStdrRt, 2, 4).toString();
			}
			break;

		case EGHT_USD: // 誘멸뎅
			if (cnvrChr == 'U') {
				// 蹂?섍툑??= 蹂?섎??곴툑??
				sCnvrAmount = bSrcAmount.toString();
			} else if (cnvrChr == 'K') {
				// 蹂?섍툑??= 蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(2, 4).toString();
			} else if (cnvrChr == 'J') {
				// cnvrAmount = ((蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 蹂??留ㅻℓ 鍮꾩쑉) * 100;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bCnvrStdrRt, 2, 4).multiply(bStdr)
						.setScale(2, 4).toString();
			} else {
				// cnvrAmount = (蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 蹂??留ㅻℓ 鍮꾩쑉;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bCnvrStdrRt, 2, 4).toString();
			}
			break;

		case EGHT_EUR: // ?좊읇?고빀
			if (cnvrChr == 'E') {
				// 蹂?섍툑??= 蹂?섎??곴툑??
				sCnvrAmount = bSrcAmount.toString();
			} else if (cnvrChr == 'K') {
				// cnvrAmount = 蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(2, 4).toString();
			} else if (cnvrChr == 'J') {
				// cnvrAmount = ((蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 蹂??留ㅻℓ 鍮꾩쑉) * 100;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bCnvrStdrRt, 2, 4).multiply(bStdr)
						.setScale(2, 4).toString();
			} else {
				// cnvrAmount = (蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 蹂??留ㅻℓ 鍮꾩쑉;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bCnvrStdrRt, 2, 4).toString();
			}
			break;

		case EGHT_JPY: // ?쇰낯
			if (cnvrChr == 'J') {
				// 蹂?섍툑??= 蹂?섎??곴툑??
				sCnvrAmount = bSrcAmount.toString();
			} else if (cnvrChr == 'K') {
				// cnvrAmount = (蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 100;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bStdr, 2, 4).toString();
			} else {
				// cnvrAmount = ((蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 100) / 蹂??留ㅻℓ 鍮꾩쑉;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bStdr, 2, 4)
						.divide(bCnvrStdrRt, 2, 4).toString();
			}
			break;

		case EGHT_CNY: // 以묎뎅?고빀
			if (cnvrChr == 'C') {
				// 蹂?섍툑??= 蹂?섎??곴툑??
				sCnvrAmount = bSrcAmount.toString();
			} else if (cnvrChr == 'K') {
				// cnvrAmount = 蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(2, 4).toString();
			} else if (cnvrChr == 'J') {
				// cnvrAmount = ((蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 蹂??留ㅻℓ 鍮꾩쑉) * 100;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bCnvrStdrRt, 2, 4).multiply(bStdr)
						.setScale(2, 4).toString();
			} else {
				// cnvrAmount = (蹂?섎??곴툑??* ?먮옒 留ㅻℓ 鍮꾩쑉) / 蹂??留ㅻℓ 鍮꾩쑉;
				sCnvrAmount = bSrcAmount.multiply(bSrcStdrRt).setScale(4, 4).divide(bCnvrStdrRt, 2, 4).toString();
			}
			break;

		default:
			// 蹂?섍툑??= (蹂?섎??곴툑??/ 蹂?섎ℓ留ㅻ퉬??;
			sCnvrAmount = bSrcAmount.divide(bCnvrStdrRt, 2, 4).toString();
			break;
		}

		rtnStr = sCnvrAmount + "  " + cnvrStr;

		return rtnStr;
	}

}