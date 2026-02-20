package egovframework.com.uss.ion.nts.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
/**
 * 蹂대궦履쎌??④?由щ? 泥섎━?섎뒗 Service Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovNoteTrnsmitService {

    /**
	 * 蹂대궦履쎌??④?由?紐⑸줉??議고쉶?쒕떎.
	 * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectNoteTrnsmitList(NoteTrnsmit noteTrnsmit) throws Exception;

    /**
     * 蹂대궦履쎌??④?由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    public int selectNoteTrnsmitListCnt(NoteTrnsmit noteTrnsmit) throws Exception;

     /**
	 * 蹂대궦履쎌??④?由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return Map
	 * @throws Exception
	 */
	public Map<?, ?> selectNoteTrnsmitDetail(NoteTrnsmit noteTrnsmit) throws Exception;

	/**
	 * 蹂대궦履쎌??④?由щ?(?? ??젣?쒕떎.
	 * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  deleteNoteTrnsmit(NoteTrnsmit noteTrnsmit) throws Exception;

	/**
	 * 諛쏆?履쎌??④?由щ?(?? ??젣?쒕떎.
	 * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  deleteNoteRecptn(NoteTrnsmit noteTrnsmit) throws Exception;

    /**
	 * ?섏떊?먮ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectNoteTrnsmitCnfirm(NoteTrnsmit noteTrnsmit) throws Exception;

}
