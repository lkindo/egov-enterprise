package egovframework.com.uss.ion.ntr.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.ntr.service.NoteRecptn;
/**
 * 諛쏆?履쎌??④?由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2017.09.14	 ?λ룞??	   ?쒖??꾨젅?꾩썙??3.7 媛쒖꽑
 *
 * </pre>
 */
@Repository("noteRecptnDao")
public class NoteRecptnDao extends EgovComAbstractDAO {

    /**
     * 諛쏆?履쎌??④?由щ?(?? 紐⑸줉???쒕떎.
     * @param noteRecptn  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶?쒕ぉ濡?
     * @throws Exception
     */
    public List<EgovMap> selectNoteRecptnList(NoteRecptn noteRecptn) throws Exception {
    	return selectList("NoteRecptn.selectNoteRecptn", noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param noteRecptn  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔??
     * @throws Exception
     */
    public int selectNoteRecptnListCnt(NoteRecptn noteRecptn) throws Exception {
    	return (Integer)selectOne("NoteRecptn.selectNoteRecptnCnt", noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由щ? 媛쒕큺?쇰줈 ?곹깭瑜?諛붽씔??
     * @param noteRecptn  -諛쏆?履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void updateNoteRecptnRelationOpenYn(NoteRecptn noteRecptn) throws Exception {
    	update("NoteRecptn.updateNoteRecptnRelationOpenYn" , noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param noteRecptn  -諛쏆?履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @return NoteRecptn -議고쉶?쒕컺?履쎌??④컼泥?
     * @throws Exception
     */
    public Map<?, ?> selectNoteRecptnDetail(NoteRecptn noteRecptn) throws Exception {
    	return (Map<?, ?>)selectOne("NoteRecptn.selectNoteRecptnDetail", noteRecptn);
    }

    /**
     * 履쎌?愿由?履쎌?愿由?蹂대궦蹂대궦履쎌??? 諛쏆?履쎌?????젣
     * @param noteRecptn  -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteRecptnRelation(NoteRecptn noteRecptn) throws Exception {
        delete("NoteRecptn.deleteNoteRecptnRelation" , noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由щ?(?? ??젣?쒕떎.
     * @param noteRecptn  -諛쏆?履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteRecptn(NoteRecptn noteRecptn) throws Exception {
    	delete("NoteRecptn.deleteNoteRecptn" , noteRecptn);
    }

    /**
     * 履쎌?愿由?蹂대궦議깆??⑥궘??
     * @param noteRecptn  -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteTrnsmit(NoteRecptn noteRecptn) throws Exception {
        delete("NoteRecptn.deleteNoteTrnsmit" , noteRecptn);
    }

    /**
     * 履쎌?愿由?履쎌?愿由ъ궘??
     * @param noteRecptn  -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteManage(NoteRecptn noteRecptn) throws Exception {
        delete("NoteRecptn.deleteNoteManage" , noteRecptn);
    }

    /**
     * 蹂대궦履쎌??④?由?嫄댁닔瑜?議고쉶?쒕떎.
     * @param  noteRecptn  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔??
     * @throws Exception
     */
    public int selectNoteTrnsmitRelationCnt(NoteRecptn noteRecptn) throws Exception {
    	return (Integer)selectOne("NoteRecptn.selectNoteTrnsmitRelationCnt", noteRecptn);
    }

    /**
     * 諛쏆?履쎌??④?由?嫄댁닔瑜?議고쉶?쒕떎.
     * @param noteRecptn  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔??
     * @throws Exception
     */
    public int selectNoteRecptnRelationCnt(NoteRecptn noteRecptn) throws Exception {
    	return (Integer)selectOne("NoteRecptn.selectNoteRecptnRelationCnt", noteRecptn);
    }
}
