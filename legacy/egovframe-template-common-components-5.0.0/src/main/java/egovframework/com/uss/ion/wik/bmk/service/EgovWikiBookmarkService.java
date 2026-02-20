package egovframework.com.uss.ion.wik.bmk.service;

import java.util.List;

/**
 * ?꾪궎遺곷쭏?щ? 泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovWikiBookmarkService {

    /**
	 * ?꾪궎遺곷쭏??紐⑸줉??議고쉶?쒕떎.
	 * @param wikiBookmark -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectWikiBookmarkList(WikiBookmark wikiBookmark) throws Exception;

    /**
     * ?꾪궎遺곷쭏?щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param wikiBookmark  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectWikiBookmarkListCnt(WikiBookmark wikiBookmark) throws Exception;

    /**
     * ?꾪궎遺곷쭏?щ?(?? 以묐났??議고쉶?쒕떎.
     * @param wikiBookmark  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectWikiBookmarkDuplicationCnt(WikiBookmark wikiBookmark) throws Exception;

    /**
	 * ?꾪궎遺곷쭏?щ?(?? ?깅줉?쒕떎.
	 * @param wikiBookmark -?꾪궎遺곷쭏???뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  insertWikiBookmark(WikiBookmark wikiBookmark) throws Exception;

     /**
	 * ?꾪궎遺곷쭏?щ?(?? ??젣?쒕떎.
	 * @param wikiBookmark -?꾪궎遺곷쭏???뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  deleteWikiBookmark(WikiBookmark wikiBookmark) throws Exception;

}
