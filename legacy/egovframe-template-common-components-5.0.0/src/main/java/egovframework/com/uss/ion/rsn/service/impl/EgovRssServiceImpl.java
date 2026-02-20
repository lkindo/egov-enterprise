package egovframework.com.uss.ion.rsn.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.rsn.service.EgovRssService;
import egovframework.com.uss.ion.rsn.service.RssInfo;
import jakarta.annotation.Resource;

/**
 * RSS?쒕퉬?ㅻ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2025.08.13  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Service("egovRssService")
public class EgovRssServiceImpl extends EgovAbstractServiceImpl implements EgovRssService {

	@Resource(name = "rssInfoDao")
	private RssDao dao;

	/**
	 * RSS?쒕퉬???뚯씠釉붿쓣 議고쉶 ?쒕떎.
	 * 
	 * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
	 * @throws Exception
	 */
	@SuppressWarnings("unchecked")
	@Override
	public List<Map<String, String>> selectRssTagServiceTable(Map<?, ?> param) throws Exception {

		List<?> listResult = dao.selectRssTagServiceTable(param);
		List<Map<String, String>> listReturn = new ArrayList<Map<String, String>>();

		String sBdtTitle = (String) param.get("BDT_TITLE");
		String sBdtLink = (String) param.get("BDT_LINK");
		String sBdtDescription = (String) param.get("BDT_DESCRIPTION");
		String sBdtTag = (String) param.get("BDT_TAG");
		String sBdtEtc = (String) param.get("BDT_ETC");

		Map<String, String> mapRow;

		for (int i = 0; i < listResult.size(); i++) {

			mapRow = (Map<String, String>) listResult.get(i);
			// null 泥섎━
			String smBdtTitle = sBdtTitle == null ? "" : sBdtTitle;
			String smBdtLink = sBdtLink == null ? "" : sBdtLink;
			String smBdtDescription = sBdtDescription == null ? "" : sBdtDescription;
			String smBdtTag = sBdtTag == null ? "" : sBdtTag;
			String smBdtEtc = sBdtEtc == null ? "" : sBdtEtc;

			Object[] keys = mapRow.keySet().toArray();

			for (Object key : keys) {
				if (mapRow.get(key) instanceof String) {
					// null 泥섎━
					if (mapRow.get(key) != null && key != null) {
						smBdtTitle = smBdtTitle.replaceAll("#" + key + "#", mapRow.get(key));
						smBdtLink = smBdtLink.replaceAll("#" + key + "#", mapRow.get(key));
						smBdtDescription = smBdtDescription.replaceAll("#" + key + "#", mapRow.get(key));
						smBdtTag = smBdtTag.replaceAll("#" + key + "#", mapRow.get(key));
						smBdtEtc = smBdtEtc.replaceAll("#" + key + "#", mapRow.get(key));
					}
				}
			}

			mapRow.put("BDT_TITLE", smBdtTitle);
			mapRow.put("BDT_LINK", smBdtLink);
			mapRow.put("BDT_DESCRIPTION", smBdtDescription);
			mapRow.put("BDT_TAG", smBdtTag);
			mapRow.put("BDT_ETC", smBdtEtc);

			listReturn.add(mapRow);

		}

		return listReturn;
	}

	/**
	 * RSS?쒕퉬?ㅻ?(?? 紐⑸줉??議고쉶 ?쒕떎.
	 * 
	 * @param rssInfo -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
	 * @throws Exception
	 */
	@Override
	public List<?> selectRssTagServiceList(RssInfo rssInfo) throws Exception {
		return dao.selectRssTagServiceList(rssInfo);
	}

	/**
	 * RSS?쒕퉬?ㅻ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * 
	 * @param rssInfo -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return int -議고쉶?쒓굔?섍??닿릿Integer
	 * @throws Exception
	 */
	@Override
	public int selectRssTagServiceListCnt(RssInfo rssInfo) throws Exception {
		return dao.selectRssTagServiceListCnt(rssInfo);
	}

	/**
	 * RSS?쒕퉬?ㅻ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * 
	 * @param rssInfo -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return Map -議고쉶?쒖젙蹂닿??닿릿Map
	 * @throws Exception
	 */
	@Override
	public Map<?, ?> selectRssTagServiceDetail(RssInfo rssInfo) throws Exception {
		return dao.selectRssTagServiceDetail(rssInfo);
	}

}
