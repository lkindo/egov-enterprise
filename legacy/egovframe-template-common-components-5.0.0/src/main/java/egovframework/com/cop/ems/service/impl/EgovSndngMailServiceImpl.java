package egovframework.com.cop.ems.service.impl;

import org.apache.commons.mail.EmailAttachment;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailParseException;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Service;

import egovframework.com.cop.ems.service.EgovMultiPartEmail;
import egovframework.com.cop.ems.service.EgovSndngMailService;
import egovframework.com.cop.ems.service.SndngMailVO;
import jakarta.annotation.Resource;

/**
 * 硫붿씪 ?붾（?섍낵 ?곕룞?댁꽌 ?댁슜?댁꽌 硫붿씪??蹂대궡???쒕퉬??援ы쁽 ?대옒??
 * @since 2011.09.09
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2011.09.09  ?쒖???      理쒖큹 ?묒꽦
 *  2011.12.06  ?닿린??      硫붿씪 泥⑤??뚯씪??湲곕뒫 異붽?
 *  2013.05.23  ?닿린??      硫붿씪 泥⑤??뚯씪???놁쓣 ??濡쒖쭅 異붽?
 *
 *  </pre>
 */
@Service("egovSndngMailService")
public class EgovSndngMailServiceImpl extends EgovAbstractServiceImpl implements EgovSndngMailService {

	@Resource(name = "egovMultiPartEmail")
	private EgovMultiPartEmail egovMultiPartEmail;

	/** SndngMailRegistDAO */
	@Resource(name = "sndngMailRegistDAO")
	private SndngMailRegistDAO sndngMailRegistDAO;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSndngMailServiceImpl.class);

	/**
	 * 硫붿씪??諛쒖넚?쒕떎
	 * @param vo SndngMailVO
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	@SuppressWarnings("unused")
	public boolean sndngMail(SndngMailVO sndngMailVO) throws Exception {

		String recptnPerson = (sndngMailVO.getRecptnPerson() == null) ? "" : sndngMailVO.getRecptnPerson(); // ?섏떊??
		String subject = (sndngMailVO.getSj() == null) ? "" : sndngMailVO.getSj(); // 硫붿씪?쒕ぉ
		String emailCn = (sndngMailVO.getEmailCn() == null) ? "" : sndngMailVO.getEmailCn(); // 硫붿씪?댁슜
		String atchmnFileNm = (sndngMailVO.getOrignlFileNm() == null) ? "" : sndngMailVO.getOrignlFileNm(); // 泥⑤??뚯씪?대쫫
		String atchmnFilePath = (sndngMailVO.getFileStreCours() == null) ? "" : sndngMailVO.getFileStreCours(); // 泥⑤??뚯씪寃쎈줈

		try {
			EmailAttachment attachment = new EmailAttachment();
			// 泥⑤??뚯씪???덉쓣 ??
			if (atchmnFileNm != "" && atchmnFileNm != null && atchmnFilePath != "" && atchmnFilePath != null) {
				// 泥⑤???attachment ?뺣낫瑜??앹꽦?⑸땲??
				attachment.setPath(atchmnFilePath);
				attachment.setDisposition(EmailAttachment.ATTACHMENT);
				attachment.setDescription("泥⑤??뚯씪?낅땲??);
				//attachment.setName(new String(atchmnFileNm.getBytes("UTF-8"),"latin1")); // 援щ쾭?꾩쓽 寃쎌슦 ?꾩슂
				attachment.setName(atchmnFileNm);

				// 2015.05.08 二쇱꽍?섏젙 - 泥⑤??뚯씪 ?뺣낫瑜??ы븿??硫붿씪???꾩넚?⑸땲??
				egovMultiPartEmail.send(recptnPerson, subject, emailCn, attachment);
			}
			else
			{
				// 硫붿씪???꾩넚?⑸땲??
				egovMultiPartEmail.send(recptnPerson, subject, emailCn);
			}

			Throwable t = new Throwable();

		} catch (MailParseException ex) {
			sndngMailVO.setSndngResultCode("F"); // 諛쒖넚寃곌낵 ?ㅽ뙣
			sndngMailRegistDAO.updateSndngMail(sndngMailVO); // 諛쒖넚?곹깭瑜?DB???낅뜲?댄듃 ?쒕떎.
			LOGGER.error("Sending Mail Exception : {} [failure when parsing the message]", ex.getCause());
			return false;
		} catch (MailAuthenticationException ex) {
			sndngMailVO.setSndngResultCode("F"); // 諛쒖넚寃곌낵 ?ㅽ뙣
			sndngMailRegistDAO.updateSndngMail(sndngMailVO); // 諛쒖넚?곹깭瑜?DB???낅뜲?댄듃 ?쒕떎.
			LOGGER.error("Sending Mail Exception : {} [authentication failure]", ex.getCause());
			return false;
		} catch (MailSendException ex) {
			sndngMailVO.setSndngResultCode("F"); // 諛쒖넚寃곌낵 ?ㅽ뙣
			sndngMailRegistDAO.updateSndngMail(sndngMailVO); // 諛쒖넚?곹깭瑜?DB???낅뜲?댄듃 ?쒕떎.
			LOGGER.error("Sending Mail Exception : {} [failure when sending the message]", ex.getCause());
			return false;
		}

		return true;
	}

}
