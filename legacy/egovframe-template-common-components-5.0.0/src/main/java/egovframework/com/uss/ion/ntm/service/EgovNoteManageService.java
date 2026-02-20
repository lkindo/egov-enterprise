package egovframework.com.uss.ion.ntm.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultVO;
/**
 * 履쎌? 愿由?蹂대궡湲?瑜?泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovNoteManageService {

    /**
     * 履쎌?愿由??뺣낫瑜?議고쉶?쒕떎.
     * @param noteManage -履쎌? 愿由?蹂대궡湲? ?뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public Map<?, ?> selectNoteManage(NoteManageVO noteManage) throws Exception;

     /**
	 * 履쎌? 愿由?蹂대궡湲?瑜??? ?깅줉?쒕떎.
	 * @param noteManage  履쎌? 愿由?蹂대궡湲? ?뺣낫 ?닿? 媛앹껜
	 * @param commandMap -Request 蹂??
	 * @throws Exception
	 */
	void  insertNoteManage(NoteManageVO noteManage, @RequestParam Map<?, ?> commandMap) throws Exception;

    /**
	 * ?섏떊??李몄“?먯꽑?앺뙘??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO -議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List -?뚯썝?뺣낫 由ъ뒪??
	 * @throws Exception
	 */
	public List<EgovMap> selectNoteEmpListPopup(ComDefaultVO searchVO) throws Exception;

    /**
	 *  ?섏떊??李몄“?먯꽑?앺뙘??媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO -議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int -議고쉶???곗씠??嫄댁닔
	 * @throws Exception
	 */
	public int selectNoteEmpListPopupCnt(ComDefaultVO searchVO) throws Exception;

}
