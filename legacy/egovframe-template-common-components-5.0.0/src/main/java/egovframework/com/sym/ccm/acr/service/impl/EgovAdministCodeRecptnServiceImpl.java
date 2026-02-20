package egovframework.com.sym.ccm.acr.service.impl;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.apache.commons.io.IOUtils;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptn;
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptnVO;
import egovframework.com.sym.ccm.acr.service.EgovAdministCodeRecptnService;
import jakarta.annotation.Resource;

/**
 * 踰뺤젙?숈퐫?쒖뿉 ????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.10.07  ?닿린??         finally臾몄쓣 異붽??섏뿬 ?먮윭???먯썝諛섑솚?????덈룄濡?異붽?
 *   2017.02.08  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2023.08.10  ?뺤쭊??         踰뺤젙?숈퐫?쒖닔??諛⑹떇 ?섏젙(怨듦났?곗씠?고룷???댁슜)
 *   2024.10.29  沅뚰깭??         API ?섏떊 ?곗씠???깅줉 ??湲곕낯 ?ъ슜?щ? 媛??곸슜(insertAdministCodeRecptn())
 *   2025.07.05  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryImport(遺덊븘?뷀븳 import臾??좎뼵)
 *   2025.07.05  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-InefficientStringBuffering(StringBuffer ?⑥닔?댁뿉??鍮꾨Ц?먯뿴 ?곗궛 ?댁슜?섏뿬 吏곸젒 寃고빀?섎뒗 肄붾뱶 ?ъ슜???먯?. append 硫붿냼???ъ슜??沅뚯옣)
 *   2025.07.05  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.07.05  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AssignmentInOperand(?쇱뿰?곗옄?댁뿉 ?좊떦臾몄씠 ?ъ슜?? ?대떦 肄붾뱶瑜?蹂듭옟?섍퀬 媛?낆꽦???⑥뼱吏寃?留뚮벉)
 *
 *      </pre>
 */
@Service("AdministCodeRecptnService")
public class EgovAdministCodeRecptnServiceImpl extends EgovAbstractServiceImpl
		implements EgovAdministCodeRecptnService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovAdministCodeRecptnServiceImpl.class);

	@Resource(name = "AdministCodeRecptnDAO")
	private AdministCodeRecptnDAO administCodeRecptnDAO;

	/** EgovIdGnrService */
	@Resource(name = "egovAdministCodeRecptnIdGnrService")
	private EgovIdGnrService idgenService;

	/**
	 * 踰뺤젙?숈퐫?쒖닔?좎쓣 泥섎━?쒕떎.
	 */
	@Override
	public void insertAdministCodeRecptn() throws Exception {
		List<HashMap<String, String>> list = apiLink();
		for (HashMap<String, String> row : list) {
			AdministCodeRecptn administCodeRecptn = new AdministCodeRecptn();

			// ?좎쭨 >> adpt_de ?앹꽦??x 20000101
			administCodeRecptn.setOccrrDe(ObjectUtils.isEmpty(row.get("adptDe")) ? "20000101" : row.get("adptDe"));

			administCodeRecptn.setAdministZoneSe("1"); // ?됱젙援ъ뿭遺遺?1 踰뺤젙??2 ?됱젙??
			administCodeRecptn.setAdministZoneCode(row.get("regionCd")); // ?됱젙援ъ뿭肄붾뱶 >> region_cd
			administCodeRecptn.setOpertSn(idgenService.getNextIntegerId()); // ?묒뾽?쇰젴踰덊샇 >> idgenService.getNextIntegerId()
			administCodeRecptn.setChangeSeCode("01"); // 蹂寃쎄뎄遺꾩퐫??01 肄붾뱶?앹꽦 02 肄붾뱶蹂寃?03 肄붾뱶留먯냼 >> 01 / 02
			administCodeRecptn.setProcessSe("00"); // ?묒뾽援щ텇 00 ?섏떊泥섎━ 01 泥섎━?꾨즺 11 ?앹꽦?ㅻ쪟 12 蹂寃쎌삤瑜?13 留먯냼?ㅻ쪟>> 00
			administCodeRecptn.setAdministZoneNm(row.get("locataddNm")); // ?됱젙援ъ뿭紐?>> locatadd_nm 吏??＜?뚮챸
			administCodeRecptn.setLowestAdministZoneNm(row.get("locallowNm")); // 理쒗븯?꾪뻾?뺢뎄??챸 >> locallow_nm 理쒗븯?꾩???챸
			administCodeRecptn.setCtprvnCode(row.get("sidoCd")); // ?쒕룄肄붾뱶 >> sido_cd ?쒕룄肄붾뱶
			administCodeRecptn.setSignguCode(row.get("sggCd")); // ?쒓뎔援ъ퐫??>> sgg_cd ?쒓뎔援ъ퐫??
			administCodeRecptn.setEmdCode(row.get("umdCd")); // ?띾㈃?숈퐫??>> umd_cd ?띾㈃?숈퐫??
			administCodeRecptn.setLiCode(row.get("riCd")); // 由ъ퐫??>> ri_cd 由ъ퐫??
			administCodeRecptn.setCreatDe(row.get("adptDe")); // ?앹꽦?쇱옄 >> adpt_de ?앹꽦??
			administCodeRecptn.setAblDe(""); // ?먯??쇱옄 >> x
			administCodeRecptn.setAblEnnc(""); // ?먯??좊Т >> x
			administCodeRecptn.setFrstRegisterId("Batch System"); // ?깅줉??Batch System
			administCodeRecptn.setLastUpdusrId("Batch System"); // ?섏젙??Batch System
			administCodeRecptn.setUseAt("Y"); // ?ъ슜?щ? >> Y

			AdministCodeRecptnVO vo = new AdministCodeRecptnVO();
			vo.setSearchCondition("CodeList");
			vo.setAdministZoneSe("1");
			vo.setAdministZoneCode(row.get("regionCd"));
			int count = administCodeRecptnDAO.selectAdministCodeRecptnListTotCnt(vo);
			if (count > 0) {
				administCodeRecptnDAO.updateAdministCode(administCodeRecptn);
			} else {
				administCodeRecptnDAO.insertAdministCodeRecptn(administCodeRecptn);
				administCodeRecptnDAO.insertAdministCode(administCodeRecptn);
			}
		}
	}

	/**
	 * 踰뺤젙?숈퐫?쒕? ?섏떊?섍린 ?꾪븳 ?붿껌???ㅼ젙?쒕떎.
	 */
	public static String requestString(int pageNo, int numOfRows) throws IOException {
		String serviceKey = EgovProperties.getProperty("Globals.data.serviceKey");
		StringBuilder sb = new StringBuilder();

		// URL
		sb.append("https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList");

		// Service Key
		sb.append("?");
		sb.append(URLEncoder.encode("serviceKey", "UTF-8"));
		sb.append("=");
		sb.append(serviceKey);

		// ?섏씠吏踰덊샇
		sb.append("&");
		sb.append(URLEncoder.encode("pageNo", "UTF-8"));
		sb.append("=");
		sb.append(URLEncoder.encode(Integer.toString(pageNo), "UTF-8"));

		// ???섏씠吏 寃곌낵 ??
		sb.append("&");
		sb.append(URLEncoder.encode("numOfRows", "UTF-8"));
		sb.append("=");
		sb.append(URLEncoder.encode(Integer.toString(numOfRows), "UTF-8"));

		// ?붿껌?먮즺?뺤떇(XML/JSON) Default: XML
		sb.append("&");
		sb.append(URLEncoder.encode("type", "UTF-8"));
		sb.append("=");
		sb.append(URLEncoder.encode("JSON", "UTF-8"));

		// 吏??＜?뚮챸(?듭뀡)
		sb.append("&");
		sb.append(URLEncoder.encode("locatadd_nm", "UTF-8"));
		sb.append("=");
		sb.append(URLEncoder.encode("?쒖슱?밸퀎??, "UTF-8"));

		return sb.toString();
	}

	/**
	 * 踰뺤젙?숈퐫???섏씠吏?섎? ?뺤씤?쒕떎.
	 */
	public static int numberOfRows() throws IOException, ParseException {
		int pageNo = 1;

		String requestString = requestString(1, 1);

		URL url = new URL(requestString);
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		conn.setRequestMethod("GET");
		conn.setRequestProperty("Content-Type", "application/json");
		conn.setRequestProperty("Accept", "*/*;q=0.9");
		conn.setDoOutput(true);
		conn.setUseCaches(false);

		if (conn.getResponseCode() >= 200 && conn.getResponseCode() <= 300) {
			StringBuilder sb = new StringBuilder();

			sb.append(IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8));

			JSONParser jsonParser = new JSONParser();
			JSONObject jsonObject = (JSONObject) jsonParser.parse(sb.toString());
			JSONArray jsonArray = (JSONArray) jsonObject.get("StanReginCd");
			JSONObject headObject = (JSONObject) jsonArray.get(0);
			JSONArray headArray = (JSONArray) headObject.get("head");
			JSONObject object = (JSONObject) headArray.get(0);
			int totalCount = Integer.parseInt(object.get("totalCount").toString());
			pageNo = (int) Math.ceil((double) totalCount / 1000);

		} else {
			LOGGER.debug("##### AdministCodeRecptnService.numberOfRows() Error Code >>> " + conn.getResponseCode());
		}

		conn.disconnect();

		return pageNo;
	}

	/**
	 * 踰뺤젙?숈퐫?쒕? ?섏떊?쒕떎.
	 */
	public static List<HashMap<String, String>> apiLink() throws IOException, ParseException {
		List<HashMap<String, String>> administCodeList = new ArrayList<>();

		int pageNo = 1;
		int numOfRows = 1000;

		pageNo = numberOfRows();

		for (int p = 1; p <= pageNo; p++) {

			String requestString = requestString(p, numOfRows);

			URL url = new URL(requestString);
			HttpURLConnection conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod("GET");
			conn.setRequestProperty("Content-Type", "application/json");
			conn.setRequestProperty("Accept", "*/*;q=0.9");
			conn.setDoOutput(true);
			conn.setUseCaches(false);

			if (conn.getResponseCode() >= 200 && conn.getResponseCode() <= 300) {
				StringBuilder sb = new StringBuilder();
				sb.append(IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8));

				JSONParser jsonParser = new JSONParser();
				JSONObject jsonObject = (JSONObject) jsonParser.parse(sb.toString());
				JSONArray jsonArray = (JSONArray) jsonObject.get("StanReginCd");
				JSONObject bodyObject = (JSONObject) jsonArray.get(1);
				JSONArray row = (JSONArray) bodyObject.get("row");

	            for (Object element : row) {
	            	JSONObject object = (JSONObject) element;
					HashMap<String, String> administCode = new HashMap<>();
					administCode.put("regionCd", stringValueOf(object.get("region_cd")));
					administCode.put("sidoCd", stringValueOf(object.get("sido_cd")));
					administCode.put("sggCd", stringValueOf(object.get("sgg_cd")));
					administCode.put("umdCd", stringValueOf(object.get("umd_cd")));
					administCode.put("riCd", stringValueOf(object.get("ri_cd")));
					administCode.put("locatjuminCd", stringValueOf(object.get("locatjumin_cd")));
					administCode.put("locatjijukCd", stringValueOf(object.get("locatjijuk_cd")));
					administCode.put("locataddNm", stringValueOf(object.get("locatadd_nm")));
					administCode.put("locatOrder", stringValueOf(object.get("locat_order")));
					administCode.put("locatRm", stringValueOf(object.get("locat_rm")));
					administCode.put("locathighCd", stringValueOf(object.get("locathigh_cd")));
					administCode.put("locallowNm", stringValueOf(object.get("locallow_nm")));
					administCode.put("adptDe", stringValueOf(object.get("adpt_de")));
					administCodeList.add(administCode);
				}

			} else {
				LOGGER.debug("##### AdministCodeRecptnService.apiLink() Error Code >>> " + conn.getResponseCode());
			}

			conn.disconnect();
		}

		return administCodeList;
	}

	private static String stringValueOf(Object object) {
		return object == null ? "" : String.valueOf(object);
	}

	/**
	 * 踰뺤젙?숈퐫???곸꽭?댁뿭??議고쉶?쒕떎.
	 */
	@Override
	public AdministCodeRecptn selectAdministCodeDetail(AdministCodeRecptn administCodeRecptn) throws Exception {
		AdministCodeRecptn ret = administCodeRecptnDAO.selectAdministCodeDetail(administCodeRecptn);
		return ret;
	}

	/**
	 * 踰뺤젙?숈퐫?쒖닔??紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectAdministCodeRecptnList(AdministCodeRecptnVO searchVO) throws Exception {
		return administCodeRecptnDAO.selectAdministCodeRecptnList(searchVO);
	}

	/**
	 * 踰뺤젙?숈퐫?쒖닔??珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectAdministCodeRecptnListTotCnt(AdministCodeRecptnVO searchVO) throws Exception {
		return administCodeRecptnDAO.selectAdministCodeRecptnListTotCnt(searchVO);
	}

	/**
	 * 踰뺤젙?숈퐫??紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectAdministCodeList(AdministCodeRecptnVO searchVO) throws Exception {
		return administCodeRecptnDAO.selectAdministCodeList(searchVO);
	}

	/**
	 * 踰뺤젙?숈퐫??珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectAdministCodeListTotCnt(AdministCodeRecptnVO searchVO) throws Exception {
		return administCodeRecptnDAO.selectAdministCodeListTotCnt(searchVO);
	}

}
