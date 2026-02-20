package egovframework.com.uss.ion.wik.bmk.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.wik.bmk.service.EgovWikiBookmarkService;
import egovframework.com.uss.ion.wik.bmk.service.WikiBookmark;
import jakarta.annotation.Resource;

/**
 * ?꾪궎遺곷쭏?щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * 
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.10.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.10.20  ?λ룞??         理쒖큹 ?앹꽦
 *   2025.08.19  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UnnecessarySemicolon(?꾩슂?녿뒗 ; 臾몄옣 議댁옱)
 *
 *      </pre>
 */
@Service("egovWikiBookmarkService")
public class EgovWikiBookmarkServiceImpl extends EgovAbstractServiceImpl implements EgovWikiBookmarkService {

	/* ?꾪궎遺곷쭏??DAO */
	@Resource(name = "wikiBookmarkDao")
	private WikiBookmarkDao dao;

	/* WIKI_ID Generator Service */
	@Resource(name = "egovWikiBookmarkIdGnrService")
	private EgovIdGnrService idgenService;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovWikiBookmarkServiceImpl.class);

	/**
	 * ?꾪궎遺곷쭏??紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param wikiBookmark -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<?> selectWikiBookmarkList(WikiBookmark wikiBookmark) throws Exception {
		return dao.selectWikiBookmarkList(wikiBookmark);
	}

	/**
	 * ?꾪궎遺곷쭏?щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * 
	 * @param wikiBookmark -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return int -議고쉶?쒓굔?섍??닿릿Integer
	 * @throws Exception
	 */
	@Override
	public int selectWikiBookmarkListCnt(WikiBookmark wikiBookmark) throws Exception {
		return dao.selectWikiBookmarkListCnt(wikiBookmark);
	}

	/**
	 * ?꾪궎遺곷쭏?щ?(?? 以묐났??議고쉶?쒕떎.
	 * 
	 * @param wikiBookmark -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return int -議고쉶?쒓굔?섍??닿릿Integer
	 * @throws Exception
	 */
	@Override
	public int selectWikiBookmarkDuplicationCnt(WikiBookmark wikiBookmark) throws Exception {
		return dao.selectWikiBookmarkDuplicationCnt(wikiBookmark);
	}

	/**
	 * ?꾪궎遺곷쭏?щ?(?? ?깅줉?쒕떎.
	 * 
	 * @param wikiBookmark -?꾪궎遺곷쭏???뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	@Override
	public void insertWikiBookmark(WikiBookmark wikiBookmark) throws Exception {
		// ?꾩씠??媛?몄삤湲?

		String sUsid = dao.selectWikiBookmarkEmpUniqId(wikiBookmark);

		LOGGER.debug("EgovWikiBookmarkServiceImpl.java sUsid > {}", sUsid);

		// ?꾩씠??鍮꾧탳
		if (sUsid != null) {
			// ?꾪궎遺곷쭏?????ㅼ젙
			wikiBookmark.setWikiBkmkId(idgenService.getNextStringId());
			// ?꾩씠???ㅼ젙
			wikiBookmark.setUsid(sUsid);
			wikiBookmark.setFrstRegisterId(sUsid);
			wikiBookmark.setLastUpdusrId(sUsid);
			dao.insertWikiBookmark(wikiBookmark);
			LOGGER.debug("insertWikiBookmark > {}", sUsid);
		}
	}

	/**
	 * ?꾪궎遺곷쭏?щ?(?? ??젣?쒕떎.
	 * 
	 * @param wikiBookmark -?꾪궎遺곷쭏???뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	@Override
	public void deleteWikiBookmark(WikiBookmark wikiBookmark) throws Exception {
		dao.deleteWikiBookmark(wikiBookmark);
	}

}
