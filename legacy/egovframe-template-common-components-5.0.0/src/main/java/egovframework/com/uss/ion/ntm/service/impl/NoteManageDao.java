package egovframework.com.uss.ion.ntm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.ntm.service.NoteManageVO;
/**
 * 履쎌? 愿由?蹂대궡湲?瑜?泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??         ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??          理쒖큹 ?앹꽦
 *   2017.06.05   理쒕몢??         怨듯넻而댄룷?뚰듃 3.7 媛쒕컻
 *
 * </pre>
 */
@Repository("noteManageDao")
public class NoteManageDao extends EgovComAbstractDAO {

    /**
     * 履쎌?愿由??뺣낫瑜?議고쉶?쒕떎.
     * @param noteManage -履쎌? 愿由?蹂대궡湲? ?뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public Map<?, ?> selectNoteManage(NoteManageVO noteManage) throws Exception {
    	return (Map<?, ?>)selectOne("NoteManage.selectNoteManage", noteManage);
    }

    /**
     * 履쎌? 愿由?蹂대궡湲?瑜??? ?깅줉?쒕떎.
     * @param noteManage -履쎌? 愿由?蹂대궡湲? ?뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void insertNoteManage(NoteManageVO noteManage) throws Exception {
    	insert("NoteManage.insertNoteManage", noteManage);
    }


    /**
     * 蹂대궦履쎌?瑜??깅줉?쒕떎.
     * @param noteManage -履쎌? 愿由?蹂대궡湲? ?뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void insertNoteTrnsmit(NoteManageVO noteManage) throws Exception {
    	insert("NoteManage.insertNoteTrnsmit", noteManage);
    }


    /**
     * 諛쏆?履쎌?瑜??깅줉?쒕떎.
     * @param noteManage -履쎌? 愿由?蹂대궡湲? ?뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void insertNoteRecptn(NoteManageVO noteManage) throws Exception {
    	insert("NoteManage.insertNoteRecptn", noteManage);
    }

    /**
	 * ?섏떊??李몄“?먯꽑?앺뙘??紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO -議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List -?뚯썝?뺣낫 由ъ뒪??
	 * @throws Exception
	 */
	public List<EgovMap> selectNoteEmpListPopup(ComDefaultVO searchVO) throws Exception {
		return selectList("NoteManage.EovNoteEmpListPopup", searchVO);
	}

    /**
	 * ?섏떊??李몄“?먯꽑?앺뙘??嫄댁닔瑜?議고쉶?쒕떎.
	 * @param searchVO -議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int -議고쉶???곗씠??媛쒖닔
	 * @throws Exception
	 */
	public int selectNoteEmpListPopupCnt(ComDefaultVO searchVO) throws Exception{
		 return (Integer)selectOne("NoteManage.EovNoteEmpListPopupCnt", searchVO);
	}
}
