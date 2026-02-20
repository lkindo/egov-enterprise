package egovframework.com.uss.ion.wik.bmk.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.wik.bmk.service.WikiBookmark;

/**
 * ?꾪궎遺곷쭏?щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.10.20
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.10.20  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("wikiBookmarkDao")
public class WikiBookmarkDao extends EgovComAbstractDAO {
    /**
	 * ?꾪궎遺곷쭏??紐⑸줉??議고쉶?쒕떎.
	 * @param wikiBookmark -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectWikiBookmarkList(WikiBookmark wikiBookmark) throws Exception{
		return selectList("WikiBookmark.selectWikiBookmarkList", wikiBookmark);
	}

    /**
     * ?꾪궎遺곷쭏?щ?(?? 以묐났??議고쉶?쒕떎.
     * @param wikiBookmark  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectWikiBookmarkDuplicationCnt(WikiBookmark wikiBookmark) throws Exception{
    	return (Integer)selectOne("WikiBookmark.selectWikiBookmarkDuplicationCnt", wikiBookmark);
    }

    /**
     * ?꾪궎遺곷쭏?щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param wikiBookmark  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectWikiBookmarkListCnt(WikiBookmark wikiBookmark) throws Exception{
    	return (Integer)selectOne("WikiBookmark.selectWikiBookmarkListCnt", wikiBookmark);
    }

    /**
     * ?ъ슜???꾩씠?붾?  議고쉶?쒕떎.
     * @param wikiBookmark  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public String selectWikiBookmarkEmpUniqId(WikiBookmark wikiBookmark) throws Exception{
    	return (String)selectOne("WikiBookmark.selectWikiBookmarkEmpUniqId", wikiBookmark);
    }


    /**
	 * ?꾪궎遺곷쭏?щ?(?? ?깅줉?쒕떎.
	 * @param wikiBookmark -?꾪궎遺곷쭏???뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void insertWikiBookmark(WikiBookmark wikiBookmark) throws Exception{
		insert("WikiBookmark.insertWikiBookmark",wikiBookmark);
	}

     /**
	 * ?꾪궎遺곷쭏?щ?(?? ?섏젙?쒕떎.
	 * @param wikiBookmark -?꾪궎遺곷쭏???뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void deleteWikiBookmark(WikiBookmark wikiBookmark) throws Exception{
		delete("WikiBookmark.deleteWikiBookmark", wikiBookmark);
	}
}
