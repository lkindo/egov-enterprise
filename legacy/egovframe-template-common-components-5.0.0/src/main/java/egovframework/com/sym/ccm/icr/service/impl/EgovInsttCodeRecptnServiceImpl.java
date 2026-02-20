package egovframework.com.sym.ccm.icr.service.impl;

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
import egovframework.com.sym.ccm.icr.service.EgovInsttCodeRecptnService;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptn;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptnVO;
import jakarta.annotation.Resource;

/**
 * 湲곌?肄붾뱶??????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎.
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
 *   2009.03.20  ?띻만??         理쒖큹 ?앹꽦
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.09.05	 ?쒖???         ?뚯씪 ?쎄린 臾댄븳 猷⑦봽 ?ㅻ쪟 ?섏젙
 *   2011.10.07  ?닿린??         finally臾몄쓣 異붽??섏뿬 ?먮윭???먯썝諛섑솚?????덈룄濡?異붽?
 *   2017.02.08  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2023.08.10  ?뺤쭊??         湲곌?肄붾뱶?섏떊 諛⑹떇 ?섏젙(怨듦났?곗씠?고룷???댁슜)
 *   2025.07.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessaryImport(遺덊븘?뷀븳 import臾??좎뼵)
 *   2025.07.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-InefficientStringBuffering(StringBuffer ?⑥닔?댁뿉??鍮꾨Ц?먯뿴 ?곗궛 ?댁슜?섏뿬 吏곸젒 寃고빀?섎뒗 肄붾뱶 ?ъ슜???먯?. append 硫붿냼???ъ슜??沅뚯옣)
 *   2025.07.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *   2025.07.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AssignmentInOperand(?쇱뿰?곗옄?댁뿉 ?좊떦臾몄씠 ?ъ슜?? ?대떦 肄붾뱶瑜?蹂듭옟?섍퀬 媛?낆꽦???⑥뼱吏寃?留뚮벉)
 *
 *      </pre>
 */
@Service("InsttCodeRecptnService")
public class EgovInsttCodeRecptnServiceImpl extends EgovAbstractServiceImpl implements EgovInsttCodeRecptnService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovInsttCodeRecptnServiceImpl.class);

	@Resource(name = "InsttCodeRecptnDAO")
	private InsttCodeRecptnDAO insttCodeRecptnDAO;

	/** EgovIdGnrService */
	@Resource(name = "egovInsttCodeRecptnIdGnrService")
	private EgovIdGnrService idgenService;

	/**
	 * 湲곌?肄붾뱶?섏떊??泥섎━?쒕떎.
	 */
	@Override
	public void insertInsttCodeRecptn() throws Exception {
		List<HashMap<String, String>> list = apiLink();
		for (HashMap<String, String> row : list) {
			InsttCodeRecptn insttCodeRecptn = new InsttCodeRecptn();
			insttCodeRecptn.setOccrrDe(ObjectUtils.isEmpty(row.get("crtDe")) ? "20000101" : row.get("crtDe")); // ?좎쭨 >> crt_de ?앹꽦??x 20000101
			insttCodeRecptn.setInsttCode(row.get("orgCd")); // 湲곌?肄붾뱶 >> org_cd 湲곌?肄붾뱶
			insttCodeRecptn.setOpertSn(idgenService.getNextIntegerId()); // ?묒뾽?쇰젴踰덊샇 >> idgenService.getNextIntegerId()
			insttCodeRecptn.setChangeSeCode("01"); // 蹂寃쎄뎄遺꾩퐫??01 肄붾뱶?앹꽦 02 肄붾뱶蹂寃?03 肄붾뱶留먯냼 >> 01 / 02
			insttCodeRecptn.setProcessSe("00"); // ?묒뾽援щ텇 00 ?섏떊泥섎━ 01 泥섎━?꾨즺 11 ?앹꽦?ㅻ쪟 12 蹂寃쎌삤瑜?13 留먯냼?ㅻ쪟>> 00
			insttCodeRecptn.setEtcCode(row.get("locatstdCd")); // 湲고?肄붾뱶 >> locatstd_cd ?뚯옱吏肄붾뱶
			insttCodeRecptn.setAllInsttNm(row.get("fullNm")); // ?꾩껜湲곌?紐?>> full_nm 湲곌?紐낆쟾泥?
			insttCodeRecptn.setLowestInsttNm(row.get("lowNm")); // 理쒗븯?꾧린愿紐?>> low_nm 湲곌?紐낆턀?섏쐞
			insttCodeRecptn.setInsttAbrvNm(row.get("abbrNm")); // 湲곌??쎌묶紐?>> abbr_nm 湲곌?紐낆빟??
			insttCodeRecptn.setOdr(row.get("gapNo")); // 李⑥닔 >> gap_no 李⑥닔
			insttCodeRecptn.setOrd(row.get("rankNo")); // ?쒖뿴 >> rank_no ?쒖뿴
			insttCodeRecptn.setInsttOdr(row.get("subChasu")); // ?뚯냽湲곌?李⑥닔 >> sub_chasu ?뚯냽湲곌?李⑥닔
			insttCodeRecptn.setUpperInsttCode(row.get("highCd")); // 李⑥긽?꾧린愿肄붾뱶 >> high_cd ?곸쐞湲곌?肄붾뱶
			insttCodeRecptn.setBestInsttCode(row.get("highstCd")); // 理쒖긽?꾧린愿肄붾뱶 >> highst_cd 理쒖긽?꾧린愿肄붾뱶
			insttCodeRecptn.setReprsntInsttCode(row.get("repCd")); // ??쒓린愿肄붾뱶 >> rep_cd ??쒓린愿肄붾뱶
			insttCodeRecptn.setInsttTyLclas(row.get("typebigNm")); // 湲곌??좏삎(?) >> typebig_nm 湲곌??遺꾨쪟
			insttCodeRecptn.setInsttTyMclas(row.get("typemidNm")); // 湲곌??좏삎(以? >> typemid_nm 湲곌?以묐텇瑜?
			insttCodeRecptn.setInsttTySclas(row.get("typesmlNm")); // 湲곌??좏삎(?? >> typesml_nm 湲곌??뚮텇瑜?
			insttCodeRecptn.setTelno(""); // ?꾪솕踰덊샇 >> x
			insttCodeRecptn.setFxnum(""); // ?⑹뒪踰덊샇 >> x
			insttCodeRecptn.setCreatDe(row.get("crtDe")); // ?앹꽦?쇱옄 >> crt_de ?앹꽦??
			insttCodeRecptn.setAblDe(row.get("clsDe")); // ?먯??쇱옄 >> cls_de ?먯???
			insttCodeRecptn.setAblEnnc(row.get("stopSelt")); // ?먯?援щ텇 >> stop_selt ?먯?援щ텇
			insttCodeRecptn.setChangede(row.get("chgDe")); // 蹂寃쎌씪??>> chg_de 蹂寃쎌씪
			insttCodeRecptn.setChangeTime(""); // 蹂寃쎌떆媛?>> x
			insttCodeRecptn.setBsisDe(row.get("baseDate")); // 湲곗큹?좎쭨 >> base_date 湲곗큹?쇱옄
			insttCodeRecptn.setSortOrdr(0); // ?뺣젹?쒖꽌 >> x
			insttCodeRecptn.setFrstRegisterId("System Batch"); // ?깅줉??Batch System
			insttCodeRecptn.setLastUpdusrId("System Batch"); // ?섏젙??Batch System

			InsttCodeRecptnVO vo = new InsttCodeRecptnVO();
			vo.setSearchCondition("CodeList");
			vo.setInsttCode(row.get("orgCd"));
			int count = insttCodeRecptnDAO.selectInsttCodeRecptnListTotCnt(vo);
			if (count > 0) {
				insttCodeRecptnDAO.updateInsttCode(insttCodeRecptn);
			} else {
				insttCodeRecptnDAO.insertInsttCodeRecptn(insttCodeRecptn);
				insttCodeRecptnDAO.insertInsttCode(insttCodeRecptn);
			}
		}
	}

	/**
	 * 湲곌?肄붾뱶瑜??섏떊?섍린 ?꾪븳 ?붿껌???ㅼ젙?쒕떎.
	 */
	public static String requestString(int pageNo, int numOfRows) throws IOException {
		String serviceKey = EgovProperties.getProperty("Globals.data.serviceKey");
		StringBuilder sb = new StringBuilder();

		// URL
		sb.append("http://apis.data.go.kr/1741000/StanOrgCd2/getStanOrgCdList2");

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

		// 湲곌?紐??듭뀡)
		sb.append("&");
		sb.append(URLEncoder.encode("full_nm", "UTF-8"));
		sb.append("=");
		sb.append(URLEncoder.encode("?됱젙?덉쟾遺", "UTF-8"));

		// ?ъ슜:0, ?먯?:1(?듭뀡)
		sb.append("&");
		sb.append(URLEncoder.encode("stop_selt", "UTF-8"));
		sb.append("=");
		sb.append(URLEncoder.encode("0", "UTF-8"));

		return sb.toString();
	}

	/**
	 * 湲곌?肄붾뱶 ?섏씠吏?섎? ?뺤씤?쒕떎.
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
			JSONParser jsonParser = new JSONParser();
			String s = IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8);
			if (LOGGER.isDebugEnabled()) {
				LOGGER.debug("s={}", s);
			}
			JSONObject jsonObject = (JSONObject) jsonParser.parse(s);
			JSONArray jsonArray = (JSONArray) jsonObject.get("StanOrgCd");
			JSONObject headObject = (JSONObject) jsonArray.get(0);
			JSONArray headArray = (JSONArray) headObject.get("head");
			JSONObject object = (JSONObject) headArray.get(0);
			int totalCount = Integer.parseInt(object.get("totalCount").toString());
			pageNo = (int) Math.ceil((double) totalCount / 1000);

		} else {
			LOGGER.debug("##### InsttCodeRecptnService.numberOfRows() Error Code >>> " + conn.getResponseCode());
		}

		conn.disconnect();

		return pageNo;
	}

	/**
	 * 湲곌?肄붾뱶瑜??섏떊?쒕떎.
	 */
	public static List<HashMap<String, String>> apiLink() throws IOException, ParseException {
		List<HashMap<String, String>> organizationCodeList = new ArrayList<>();

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
				JSONParser jsonParser = new JSONParser();
				String s = IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8);
				if (LOGGER.isDebugEnabled()) {
					LOGGER.debug("s={}", s);
				}
				JSONObject jsonObject = (JSONObject) jsonParser.parse(s);
				JSONArray jsonArray = (JSONArray) jsonObject.get("StanOrgCd");
				JSONObject bodyObject = (JSONObject) jsonArray.get(1);
				JSONArray row = (JSONArray) bodyObject.get("row");

				for (int r = 0; r < row.size(); r++) {
					JSONObject object = (JSONObject) row.get(r);
					HashMap<String, String> organizationCode = new HashMap<>();
					organizationCode.put("orgCd", stringValueOf(object.get("org_cd")));
					organizationCode.put("fullNm", stringValueOf(object.get("full_nm")));
					organizationCode.put("lowNm", stringValueOf(object.get("low_nm")));
					organizationCode.put("abbrNm", stringValueOf(object.get("abbr_nm")));
					organizationCode.put("gapNo", stringValueOf(object.get("gap_no")));
					organizationCode.put("rankNo", stringValueOf(object.get("rank_no")));
					organizationCode.put("subChasu", stringValueOf(object.get("sub_chasu")));
					organizationCode.put("highCd", stringValueOf(object.get("high_cd")));
					organizationCode.put("highstCd", stringValueOf(object.get("highst_cd")));
					organizationCode.put("repCd", stringValueOf(object.get("rep_cd")));
					organizationCode.put("typebigNm", stringValueOf(object.get("typebig_nm")));
					organizationCode.put("typemidNm", stringValueOf(object.get("typemid_nm")));
					organizationCode.put("typesmlNm", stringValueOf(object.get("typesml_nm")));
					organizationCode.put("locatstdCd", stringValueOf(object.get("locatstd_cd")));
					organizationCode.put("useCd", stringValueOf(object.get("use_cd")));
					organizationCode.put("crtDe", stringValueOf(object.get("crt_de")));
					organizationCode.put("clsDe", stringValueOf(object.get("cls_de")));
					organizationCode.put("stopSelt", stringValueOf(object.get("stop_selt")));
					organizationCode.put("chgDe", stringValueOf(object.get("chg_de")));
					organizationCode.put("baseDate", stringValueOf(object.get("base_date")));
					organizationCode.put("adptDate", stringValueOf(object.get("adpt_date")));
					organizationCode.put("preorgCd", stringValueOf(object.get("preorg_cd")));
					organizationCodeList.add(organizationCode);
				}

			} else {
				LOGGER.debug("##### InsttCodeRecptnService.apiLink() Error Code >>> " + conn.getResponseCode());
			}

			conn.disconnect();
		}

		return organizationCodeList;
	}

	private static String stringValueOf(Object object) {
		return object == null ? "" : String.valueOf(object);
	}

	/**
	 * 湲곌?肄붾뱶 ?곸꽭?댁뿭??議고쉶?쒕떎.
	 */
	@Override
	public InsttCodeRecptn selectInsttCodeDetail(InsttCodeRecptn insttCodeRecptn) throws Exception {
		InsttCodeRecptn ret = insttCodeRecptnDAO.selectInsttCodeDetail(insttCodeRecptn);
		return ret;
	}

	/**
	 * 湲곌?肄붾뱶?섏떊 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectInsttCodeRecptnList(InsttCodeRecptnVO searchVO) throws Exception {
		return insttCodeRecptnDAO.selectInsttCodeRecptnList(searchVO);
	}

	/**
	 * 湲곌?肄붾뱶?섏떊 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectInsttCodeRecptnListTotCnt(InsttCodeRecptnVO searchVO) throws Exception {
		return insttCodeRecptnDAO.selectInsttCodeRecptnListTotCnt(searchVO);
	}

	/**
	 * 湲곌?肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectInsttCodeList(InsttCodeRecptnVO searchVO) throws Exception {
		return insttCodeRecptnDAO.selectInsttCodeList(searchVO);
	}

	/**
	 * 湲곌?肄붾뱶 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectInsttCodeListTotCnt(InsttCodeRecptnVO searchVO) throws Exception {
		return insttCodeRecptnDAO.selectInsttCodeListTotCnt(searchVO);
	}

}
