package egovframework.com.uss.ion.nts.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.nts.service.NoteTrnsmit;
/**
 * 蹂대궦履쎌??④?由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2017.09.14	 ?λ룞??		   ?쒖??꾨젅?꾩썙??3.7 媛쒖꽑
 *
 * </pre>
 */
@Repository("noteTrnsmitDao")
public class NoteTrnsmitDao extends EgovComAbstractDAO {

    /**
     * 蹂대궦履쎌??④?由щ?(?? 紐⑸줉???쒕떎.
     * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
     * @throws Exception
     */
    public List<EgovMap> selectNoteTrnsmitList(NoteTrnsmit noteTrnsmit) throws Exception {
    	return selectList("NoteTrnsmit.selectNoteTrnsmit", noteTrnsmit);
    }

    /**
     * 蹂대궦履쎌??④?由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectNoteTrnsmitListCnt(NoteTrnsmit noteTrnsmit) throws Exception {
    	return (Integer)selectOne("NoteTrnsmit.selectNoteTrnsmitCnt", noteTrnsmit);
    }

    /**
     * 蹂대궦履쎌??④?由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @return Map -議고쉶?쒖젙蹂닿??닿릿Map
     * @throws Exception
     */
    public Map<?, ?> selectNoteTrnsmitDetail(NoteTrnsmit noteTrnsmit) throws Exception {
    	return (Map<?, ?>)selectOne("NoteTrnsmit.selectNoteTrnsmitDetail", noteTrnsmit);
    }

    /**
     * 蹂대궦履쎌??④?由щ?(?? ??젣?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteTrnsmit(NoteTrnsmit noteTrnsmit) throws Exception {
        delete("NoteTrnsmit.deleteNoteTrnsmit" , noteTrnsmit);
    }

    /**
     * 諛쏆?履쎌??⑤?(?? ??젣?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteRecptn(NoteTrnsmit noteTrnsmit) throws Exception {
        delete("NoteTrnsmit.deleteNoteRecptn" , noteTrnsmit);
    }

    /**
     * 履쎌?瑜??? ??젣?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteManage(NoteTrnsmit noteTrnsmit) throws Exception {
        delete("NoteTrnsmit.deleteNoteManage" , noteTrnsmit);
    }

    /**
     * 履쎌?愿由?蹂대궦議깆??⑥궘??
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteNoteTrnsmitRelation(NoteTrnsmit noteTrnsmit) throws Exception {
        delete("NoteTrnsmit.deleteNoteTrnsmitRelation" , noteTrnsmit);
    }

    /**
     * 諛쏆??몄???嫄댁닔瑜?議고쉶?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectTrnsmitRelationCnt(NoteTrnsmit noteTrnsmit) throws Exception {
    	return (Integer)selectOne("NoteTrnsmit.selectTrnsmitRelationCnt", noteTrnsmit);
    }


    /**
     * ?섏떊?먮ぉ濡앹쓣 議고쉶?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿? 媛앹껜
     * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
     * @throws Exception
     */
    public List<EgovMap> selectNoteTrnsmitCnfirm(NoteTrnsmit noteTrnsmit) throws Exception {
    	return selectList("NoteTrnsmit.selectNoteTrnsmitCnfirm", noteTrnsmit);
    }
}
