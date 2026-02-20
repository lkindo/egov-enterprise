package egovframework.com.uss.ion.nts.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.nts.service.EgovNoteTrnsmitService;
import egovframework.com.uss.ion.nts.service.NoteTrnsmit;
import jakarta.annotation.Resource;
/**
 * 蹂대궦履쎌??④?由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("egovNoteTrnsmitService")
public class EgovNoteTrnsmitServiceImpl extends EgovAbstractServiceImpl
        implements EgovNoteTrnsmitService {

    @Resource(name = "noteTrnsmitDao")
    private NoteTrnsmitDao dao;


    /**
     * 蹂대궦履쎌??④?由щ?(?? 紐⑸줉??議고쉶 ?쒕떎.
     * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶紐⑸줉?대떞湲퀽ist
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectNoteTrnsmitList(NoteTrnsmit noteTrnsmit) throws Exception {
    	return dao.selectNoteTrnsmitList(noteTrnsmit);
    }

    /**
     * 蹂대궦履쎌??④?由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    @Override
	public int selectNoteTrnsmitListCnt(NoteTrnsmit noteTrnsmit) throws Exception {
        return dao.selectNoteTrnsmitListCnt(noteTrnsmit);
    }

    /**
     * 蹂대궦履쎌??④?由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param noteTrnsmit -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return Map -議고쉶?뺣낫媛?닿릿Map
     * @throws Exception
     */
    @Override
	public Map<?, ?> selectNoteTrnsmitDetail(NoteTrnsmit noteTrnsmit) throws Exception {
        return dao.selectNoteTrnsmitDetail(noteTrnsmit);
    }

    /**
     * 蹂대궦履쎌??④?由щ?(?? ??젣?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void deleteNoteTrnsmit(NoteTrnsmit noteTrnsmit) throws Exception {

        //蹂대궦履쎌???嫄댁닔瑜?議고쉶??
        int nCnt = dao.selectTrnsmitRelationCnt(noteTrnsmit);

        if(nCnt == 0){
        	//諛쏆?履쎌?/履쎌?愿由???젣 泥섎━
        	dao.deleteNoteTrnsmitRelation(noteTrnsmit);
        	//履쎌??뺣낫瑜???젣?쒕떎.
        	dao.deleteNoteManage(noteTrnsmit);
        }else{
        	dao.deleteNoteTrnsmit(noteTrnsmit);
        }
    }

    /**
     * 蹂대궦履쎌??④?由щ?(?? ??젣?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void deleteNoteRecptn(NoteTrnsmit noteTrnsmit) throws Exception {

        dao.deleteNoteRecptn(noteTrnsmit);
    }


    /**
     * ?섏떊?먮ぉ濡앹쓣 議고쉶?쒕떎.
     * @param noteTrnsmit -蹂대궦履쎌??④?由??뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶紐⑸줉?대떞湲퀽ist
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectNoteTrnsmitCnfirm(NoteTrnsmit noteTrnsmit) throws Exception {
        return dao.selectNoteTrnsmitCnfirm(noteTrnsmit);
    }
}
