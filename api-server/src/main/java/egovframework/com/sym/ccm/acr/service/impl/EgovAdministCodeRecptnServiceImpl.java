package egovframework.com.sym.ccm.acr.service.impl;

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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ObjectUtils;

import com.company.project.domain.code.AdministCode;
import com.company.project.domain.code.AdministCode.AdministCodeId;
import com.company.project.domain.code.AdministCodeRecptnLog;
import com.company.project.domain.code.AdministCodeRecptnLog.AdministCodeRecptnLogId;
import com.company.project.domain.code.AdministCodeRecptnLogRepository;
import com.company.project.domain.code.AdministCodeRepository;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptn;
import egovframework.com.sym.ccm.acr.service.AdministCodeRecptnVO;
import egovframework.com.sym.ccm.acr.service.EgovAdministCodeRecptnService;
import lombok.RequiredArgsConstructor;

/**
 * 법정동코드에 대한 서비스 구현클래스
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.1
 */
@Service("AdministCodeRecptnService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovAdministCodeRecptnServiceImpl extends EgovAbstractServiceImpl
		implements EgovAdministCodeRecptnService {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovAdministCodeRecptnServiceImpl.class);

	private final AdministCodeRepository administCodeRepository;
	private final AdministCodeRecptnLogRepository administCodeRecptnLogRepository;
	private final EgovIdGnrService idgenService;
	private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

	/**
	 * 법정동코드수신을 처리한다.
	 */
	@Override
	@Transactional
	public void insertAdministCodeRecptn() throws Exception {
		List<HashMap<String, String>> list = apiLink();
		for (HashMap<String, String> row : list) {
			String occrrDe = ObjectUtils.isEmpty(row.get("adptDe")) ? "20000101" : row.get("adptDe");
			String regionCd = row.get("regionCd");

			AdministCodeId codeId = AdministCodeId.builder()
					.administZoneSe("1")
					.administZoneCode(regionCd)
					.build();

			AdministCodeRecptnLog log = AdministCodeRecptnLog.builder()
					.id(AdministCodeRecptnLogId.builder()
							.occrrncDe(occrrDe)
							.administZoneSe("1")
							.administZoneCode(regionCd)
							.opertSn((long) idgenService.getNextIntegerId())
							.build())
					.changeSeCode("01")
					.processSe("00")
					.administZoneNm(row.get("locataddNm"))
					.lowestAdministZoneNm(row.get("locallowNm"))
					.ctprvnCode(row.get("sidoCd"))
					.signguCode(row.get("sggCd"))
					.emdCode(row.get("umdCd"))
					.liCode(row.get("riCd"))
					.creatDe(row.get("adptDe"))
					.frstRegisterId("Batch System")
					.build();

			if (administCodeRepository.existsById(codeId)) {
				administCodeRepository.findById(codeId).ifPresent(e -> {
					e.update(row.get("locataddNm"), null, row.get("adptDe"), "", "Y", "Batch System");
				});
			} else {
				administCodeRecptnLogRepository.save(log);
				administCodeRepository.save(AdministCode.builder()
						.id(codeId)
						.administZoneNm(row.get("locataddNm"))
						.creatDe(row.get("adptDe"))
						.useAt("Y")
						.frstRegisterId("Batch System")
						.build());
			}
		}
	}

	/**
	 * 법정동코드수신을 위한 API 링크 및 호출 로직 (유지)
	 */
	public static String requestString(int pageNo, int numOfRows) throws IOException {
		String serviceKey = EgovProperties.getProperty("Globals.data.serviceKey");
		StringBuilder sb = new StringBuilder();
		sb.append("https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList");
		sb.append("?");
		sb.append(URLEncoder.encode("serviceKey", "UTF-8")).append("=").append(serviceKey);
		sb.append("&").append(URLEncoder.encode("pageNo", "UTF-8")).append("=")
				.append(URLEncoder.encode(Integer.toString(pageNo), "UTF-8"));
		sb.append("&").append(URLEncoder.encode("numOfRows", "UTF-8")).append("=")
				.append(URLEncoder.encode(Integer.toString(numOfRows), "UTF-8"));
		sb.append("&").append(URLEncoder.encode("type", "UTF-8")).append("=")
				.append(URLEncoder.encode("JSON", "UTF-8"));
		sb.append("&").append(URLEncoder.encode("locatadd_nm", "UTF-8")).append("=")
				.append(URLEncoder.encode("서울특별시", "UTF-8"));
		return sb.toString();
	}

	public static int numberOfRows() throws IOException {
		String requestString = requestString(1, 1);
		URL url = java.net.URI.create(requestString).toURL();
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		conn.setRequestMethod("GET");
		conn.setRequestProperty("Content-Type", "application/json");
		try {
			if (conn.getResponseCode() >= 200 && conn.getResponseCode() <= 300) {
				JsonNode jsonObject = OBJECT_MAPPER.readTree(IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8));
				JsonNode jsonArray = jsonObject.get("StanReginCd");
				JsonNode headObject = jsonArray.get(0);
				JsonNode headArray = headObject.get("head");
				JsonNode object = headArray.get(0);
				int totalCount = object.get("totalCount").asInt();
				return (int) Math.ceil((double) totalCount / 1000);
			}
		} finally {
			conn.disconnect();
		}
		return 1;
	}

	public static List<HashMap<String, String>> apiLink() throws IOException {
		List<HashMap<String, String>> administCodeList = new ArrayList<>();
		int totalPages = numberOfRows();
		for (int p = 1; p <= totalPages; p++) {
			URL url = java.net.URI.create(requestString(p, 1000)).toURL();
			HttpURLConnection conn = (HttpURLConnection) url.openConnection();
			conn.setRequestMethod("GET");
			conn.setRequestProperty("Content-Type", "application/json");
			try {
				if (conn.getResponseCode() >= 200 && conn.getResponseCode() <= 300) {
					JsonNode jsonObject = OBJECT_MAPPER.readTree(IOUtils.toString(conn.getInputStream(), StandardCharsets.UTF_8));
					JsonNode jsonArray = jsonObject.get("StanReginCd");
					JsonNode bodyObject = jsonArray.get(1);
					JsonNode row = bodyObject.get("row");
					if (row.isArray()) {
						for (JsonNode object : row) {
							HashMap<String, String> map = new HashMap<>();
							map.put("regionCd", stringValueOf(object.get("region_cd")));
							map.put("sidoCd", stringValueOf(object.get("sido_cd")));
							map.put("sggCd", stringValueOf(object.get("sgg_cd")));
							map.put("umdCd", stringValueOf(object.get("umd_cd")));
							map.put("riCd", stringValueOf(object.get("ri_cd")));
							map.put("locataddNm", stringValueOf(object.get("locatadd_nm")));
							map.put("locallowNm", stringValueOf(object.get("locallow_nm")));
							map.put("adptDe", stringValueOf(object.get("adpt_de")));
							administCodeList.add(map);
						}
					}
				}
			} finally {
				conn.disconnect();
			}
		}
		return administCodeList;
	}

	private static String stringValueOf(JsonNode node) {
		return (node == null || node.isNull()) ? "" : node.asText();
	}

	/**
	 * 법정동코드 상세내역을 조회한다.
	 */
	@Override
	public AdministCodeRecptn selectAdministCodeDetail(AdministCodeRecptn vo) throws Exception {
		AdministCodeId id = AdministCodeId.builder()
				.administZoneSe(vo.getAdministZoneSe())
				.administZoneCode(vo.getAdministZoneCode())
				.build();
		return administCodeRepository.findById(id)
				.map(this::toVO)
				.orElse(null);
	}

	/**
	 * 법정동코드수신 목록을 조회한다.
	 */
	@Override
	public List<EgovMap> selectAdministCodeRecptnList(AdministCodeRecptnVO searchVO) throws Exception {
		return administCodeRecptnLogRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage()))
				.getContent().stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("administZoneSe", e.getId().getAdministZoneSe());
					map.put("administZoneCode", e.getId().getAdministZoneCode());
					map.put("occrrncDe", e.getId().getOccrrncDe());
					map.put("opertSn", e.getId().getOpertSn());
					map.put("changeSeCode", e.getChangeSeCode());
					map.put("processSe", e.getProcessSe());
					map.put("administZoneNm", e.getAdministZoneNm());
					return map;
				}).collect(Collectors.toList());
	}

	@Override
	public int selectAdministCodeRecptnListTotCnt(AdministCodeRecptnVO searchVO) throws Exception {
		return (int) administCodeRecptnLogRepository.count();
	}

	@Override
	public List<EgovMap> selectAdministCodeList(AdministCodeRecptnVO searchVO) throws Exception {
		return administCodeRepository
				.findAll(PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage()))
				.getContent().stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("administZoneSe", e.getId().getAdministZoneSe());
					map.put("administZoneCode", e.getId().getAdministZoneCode());
					map.put("administZoneNm", e.getAdministZoneNm());
					return map;
				}).collect(Collectors.toList());
	}

	@Override
	public int selectAdministCodeListTotCnt(AdministCodeRecptnVO searchVO) throws Exception {
		return (int) administCodeRepository.count();
	}

	private AdministCodeRecptn toVO(AdministCode entity) {
		AdministCodeRecptn vo = new AdministCodeRecptn();
		vo.setAdministZoneSe(entity.getId().getAdministZoneSe());
		vo.setAdministZoneCode(entity.getId().getAdministZoneCode());
		vo.setAdministZoneNm(entity.getAdministZoneNm());
		vo.setUpperAdministZoneCode(entity.getUpperAdministZoneCode());
		vo.setCreatDe(entity.getCreatDe());
		vo.setAblDe(entity.getAblDe());
		vo.setUseAt(entity.getUseAt());
		return vo;
	}
}
