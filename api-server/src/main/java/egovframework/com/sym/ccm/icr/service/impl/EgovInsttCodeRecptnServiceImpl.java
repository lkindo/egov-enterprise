package egovframework.com.sym.ccm.icr.service.impl;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

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
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ObjectUtils;

import com.company.project.domain.code.InstitutionCode;
import com.company.project.domain.code.InstitutionCodeRecptnLog;
import com.company.project.domain.code.InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId;
import com.company.project.domain.code.InstitutionCodeRecptnLogRepository;
import com.company.project.domain.code.InstitutionCodeRepository;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.sym.ccm.icr.service.EgovInsttCodeRecptnService;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptn;
import egovframework.com.sym.ccm.icr.service.InsttCodeRecptnVO;
import lombok.RequiredArgsConstructor;

/**
 * 기관코드에 대한 서비스 구현클래스
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.1
 */
@Service("InsttCodeRecptnService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovInsttCodeRecptnServiceImpl extends EgovAbstractServiceImpl implements EgovInsttCodeRecptnService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovInsttCodeRecptnServiceImpl.class);

	private final InstitutionCodeRepository institutionCodeRepository;
	private final InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository;
	private final EgovIdGnrService idgenService;

	/**
	 * 기관코드수신을 처리한다.
	 */
	@Override
	@Transactional
	public void insertInsttCodeRecptn() throws Exception {
		List<HashMap<String, String>> list = apiLink();
		for (HashMap<String, String> row : list) {
			String occrrDe = ObjectUtils.isEmpty(row.get("crtDe")) ? "20000101" : row.get("crtDe");
			String insttCode = row.get("orgCd");

			InstitutionCodeRecptnLog log = InstitutionCodeRecptnLog.builder()
					.id(InstitutionCodeRecptnLogId.builder()
							.occrrncDe(occrrDe)
							.insttCode(insttCode)
							.opertSn((long) idgenService.getNextIntegerId())
							.build())
					.changeSeCode("01")
					.processSe("00")
					.etcCode(row.get("locatstdCd"))
					.allInsttNm(row.get("fullNm"))
					.lowestInsttNm(row.get("lowNm"))
					.insttAbrvNm(row.get("abbrNm"))
					.odr(row.get("gapNo"))
					.ord(row.get("rankNo"))
					.insttOdr(row.get("subChasu"))
					.upperInsttCode(row.get("highCd"))
					.bestInsttCode(row.get("highstCd"))
					.reprsntInsttCode(row.get("repCd"))
					.insttTyLclas(row.get("typebigNm"))
					.insttTyMclas(row.get("typemidNm"))
					.insttTySclas(row.get("typesmlNm"))
					.creatDe(row.get("crtDe"))
					.ablDe(row.get("clsDe"))
					.ablEnnc(row.get("stopSelt"))
					.changede(row.get("chgDe"))
					.bsisDe(row.get("baseDate"))
					.frstRegisterId("System Batch")
					.build();

			if (institutionCodeRepository.existsById(insttCode)) {
				institutionCodeRepository.findById(insttCode).ifPresent(e -> {
					e.update(row.get("fullNm"), row.get("lowNm"), row.get("abbrNm"), row.get("gapNo"),
							row.get("rankNo"),
							row.get("subChasu"), row.get("highstCd"), row.get("highCd"), row.get("repCd"),
							row.get("typebigNm"), row.get("typemidNm"), row.get("typesmlNm"), "", "",
							row.get("crtDe"), row.get("clsDe"), row.get("stopSelt"), row.get("chgDe"),
							"", row.get("baseDate"), 0, "System Batch");
				});
			} else {
				institutionCodeRecptnLogRepository.save(log);
				institutionCodeRepository.save(InstitutionCode.builder()
						.insttCode(insttCode)
						.allInsttNm(row.get("fullNm"))
						.lowestInsttNm(row.get("lowNm"))
						.insttAbrvNm(row.get("abbrNm"))
						.odr(row.get("gapNo"))
						.ord(row.get("rankNo"))
						.insttOdr(row.get("subChasu"))
						.bestInsttCode(row.get("highstCd"))
						.upperInsttCode(row.get("highCd"))
						.reprsntInsttCode(row.get("repCd"))
						.insttTyLclas(row.get("typebigNm"))
						.insttTyMclas(row.get("typemidNm"))
						.insttTySclas(row.get("typesmlNm"))
						.creatDe(row.get("crtDe"))
						.ablDe(row.get("clsDe"))
						.ablEnnc(row.get("stopSelt"))
						.changede(row.get("chgDe"))
						.bsisDe(row.get("baseDate"))
						.frstRegisterId("System Batch")
						.build());
			}
		}
	}

	/**
	 * 기관코드를 수신하기 위한 API 요청 로직 (유지)
	 */
	public static String requestString(int pageNo, int numOfRows) throws IOException {
		String serviceKey = EgovProperties.getProperty("Globals.data.serviceKey");
		StringBuilder sb = new StringBuilder();
		sb.append("http://apis.data.go.kr/1741000/StanOrgCd2/getStanOrgCdList2");
		sb.append("?").append(URLEncoder.encode("serviceKey", "UTF-8")).append("=").append(serviceKey);
		sb.append("&").append(URLEncoder.encode("pageNo", "UTF-8")).append("=")
				.append(URLEncoder.encode(Integer.toString(pageNo), "UTF-8"));
		sb.append("&").append(URLEncoder.encode("numOfRows", "UTF-8")).append("=")
				.append(URLEncoder.encode(Integer.toString(numOfRows), "UTF-8"));
		sb.append("&").append(URLEncoder.encode("type", "UTF-8")).append("=")
				.append(URLEncoder.encode("JSON", "UTF-8"));
		sb.append("&").append(URLEncoder.encode("full_nm", "UTF-8")).append("=")
				.append(URLEncoder.encode("행정안전부", "UTF-8"));
		sb.append("&").append(URLEncoder.encode("stop_selt", "UTF-8")).append("=")
				.append(URLEncoder.encode("0", "UTF-8"));
		return sb.toString();
	}

	public static int numberOfRows() throws IOException, ParseException {
		String requestString = requestString(1, 1);
		URL url = java.net.URI.create(requestString).toURL();
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		conn.setRequestMethod("GET");
		conn.setRequestProperty("Content-Type", "application/json");
		try {
			if (conn.getResponseCode() >= 200 && conn.getResponseCode() <= 300) {
				JSONParser jsonParser = new JSONParser();
				JSONObject jsonObject = (JSONObject) jsonParser
						.parse(IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8));
				JSONArray jsonArray = (JSONArray) jsonObject.get("StanOrgCd");
				JSONObject headObject = (JSONObject) jsonArray.get(0);
				JSONArray headArray = (JSONArray) headObject.get("head");
				JSONObject object = (JSONObject) headArray.get(0);
				int totalCount = Integer.parseInt(object.get("totalCount").toString());
				return (int) Math.ceil((double) totalCount / 1000);
			}
		} finally {
			conn.disconnect();
		}
		return 1;
	}

	public static List<HashMap<String, String>> apiLink() throws IOException, ParseException {
		List<HashMap<String, String>> organizationCodeList = new ArrayList<>();
		int totalPages = numberOfRows();
		for (int p = 1; p <= totalPages; p++) {
			URL url = java.net.URI.create(requestString(p, 1000)).toURL();
			HttpURLConnection conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod("GET");
			conn.setRequestProperty("Content-Type", "application/json");
			try {
				if (conn.getResponseCode() >= 200 && conn.getResponseCode() <= 300) {
					JSONParser jsonParser = new JSONParser();
					JSONObject jsonObject = (JSONObject) jsonParser
							.parse(IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8));
					JSONArray jsonArray = (JSONArray) jsonObject.get("StanOrgCd");
					JSONObject bodyObject = (JSONObject) jsonArray.get(1);
					JSONArray row = (JSONArray) bodyObject.get("row");
					for (Object element : row) {
						JSONObject object = (JSONObject) element;
						HashMap<String, String> map = new HashMap<>();
						map.put("orgCd", stringValueOf(object.get("org_cd")));
						map.put("fullNm", stringValueOf(object.get("full_nm")));
						map.put("lowNm", stringValueOf(object.get("low_nm")));
						map.put("abbrNm", stringValueOf(object.get("abbr_nm")));
						map.put("gapNo", stringValueOf(object.get("gap_no")));
						map.put("rankNo", stringValueOf(object.get("rank_no")));
						map.put("subChasu", stringValueOf(object.get("sub_chasu")));
						map.put("highCd", stringValueOf(object.get("high_cd")));
						map.put("highstCd", stringValueOf(object.get("highst_cd")));
						map.put("repCd", stringValueOf(object.get("rep_cd")));
						map.put("typebigNm", stringValueOf(object.get("typebig_nm")));
						map.put("typemidNm", stringValueOf(object.get("typemid_nm")));
						map.put("typesmlNm", stringValueOf(object.get("typesml_nm")));
						map.put("locatstdCd", stringValueOf(object.get("locatstd_cd")));
						map.put("crtDe", stringValueOf(object.get("crt_de")));
						map.put("clsDe", stringValueOf(object.get("cls_de")));
						map.put("stopSelt", stringValueOf(object.get("stop_selt")));
						map.put("chgDe", stringValueOf(object.get("chg_de")));
						map.put("baseDate", stringValueOf(object.get("base_date")));
						organizationCodeList.add(map);
					}
				}
			} finally {
				conn.disconnect();
			}
		}
		return organizationCodeList;
	}

	private static String stringValueOf(Object object) {
		return object == null ? "" : String.valueOf(object);
	}

	/**
	 * 기관코드 상세내역을 조회한다.
	 */
	@Override
	public InsttCodeRecptn selectInsttCodeDetail(InsttCodeRecptn vo) throws Exception {
		return institutionCodeRepository.findById(vo.getInsttCode())
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 기관코드수신 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectInsttCodeRecptnList(InsttCodeRecptnVO searchVO) throws Exception {
		return institutionCodeRecptnLogRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage()))
				.getContent().stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("insttCode", e.getId().getInsttCode());
					map.put("occrrncDe", e.getId().getOccrrncDe());
					map.put("opertSn", e.getId().getOpertSn());
					map.put("changeSeCode", e.getChangeSeCode());
					map.put("processSe", e.getProcessSe());
					map.put("allInsttNm", e.getAllInsttNm());
					return map;
				}).collect(Collectors.toList());
	}

	@Override
	public int selectInsttCodeRecptnListTotCnt(InsttCodeRecptnVO searchVO) throws Exception {
		return (int) institutionCodeRecptnLogRepository.count();
	}

	@Override
	public List<EgovMap> selectInsttCodeList(InsttCodeRecptnVO searchVO) throws Exception {
		return institutionCodeRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage()))
				.getContent().stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("insttCode", e.getInsttCode());
					map.put("allInsttNm", e.getAllInsttNm());
					return map;
				}).collect(Collectors.toList());
	}

	@Override
	public int selectInsttCodeListTotCnt(InsttCodeRecptnVO searchVO) throws Exception {
		return (int) institutionCodeRepository.count();
	}

	private InsttCodeRecptn toVO(InstitutionCode entity) {
		InsttCodeRecptn vo = new InsttCodeRecptn();
		vo.setInsttCode(entity.getInsttCode());
		vo.setAllInsttNm(entity.getAllInsttNm());
		vo.setLowestInsttNm(entity.getLowestInsttNm());
		vo.setInsttAbrvNm(entity.getInsttAbrvNm());
		vo.setOdr(entity.getOdr());
		vo.setOrd(entity.getOrd());
		vo.setInsttOdr(entity.getInsttOdr());
		vo.setBestInsttCode(entity.getBestInsttCode());
		vo.setUpperInsttCode(entity.getUpperInsttCode());
		vo.setReprsntInsttCode(entity.getReprsntInsttCode());
		vo.setInsttTyLclas(entity.getInsttTyLclas());
		vo.setInsttTyMclas(entity.getInsttTyMclas());
		vo.setInsttTySclas(entity.getInsttTySclas());
		vo.setCreatDe(entity.getCreatDe());
		vo.setAblDe(entity.getAblDe());
		vo.setAblEnnc(entity.getAblEnnc());
		vo.setChangede(entity.getChangede());
		vo.setBsisDe(entity.getBsisDe());
		return vo;
	}
}
