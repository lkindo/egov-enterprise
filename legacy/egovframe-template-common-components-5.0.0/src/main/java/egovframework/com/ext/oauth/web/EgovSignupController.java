/*
 * eGovFrame OAuth
 * Copyright The eGovFrame Open Community (http://open.egovframe.go.kr)).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author ?닿린???덊띁媛쒕컻?륦3)
 */
package egovframework.com.ext.oauth.web;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.ext.oauth.service.OAuthConfig;
import egovframework.com.ext.oauth.service.OAuthLogin;
import egovframework.com.ext.oauth.service.OAuthUniversalUser;
import egovframework.com.ext.oauth.service.OAuthVO;

/**
 * ?뚯뀥 怨꾩젙?쇰줈 ?쇰컲?뚯썝 媛?낆쓣 泥섎━?섎뒗 而⑦듃濡ㅻ윭 ?대옒??
 * @author ?닿린??
 * @since 2014.10.08
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??    	?섏젙??         ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *  2014.10.08		?닿린??	理쒖큹 ?앹꽦
 *  2018.10.02		?좎슜??	Facebook 愿??ProviderSignInUtils 珥덇린???섏젙
 *  2022.11.11      源?쒖?		?쒗걧?댁퐫??泥섎━
 *  2023.07.26		?≪씤??	?꾩슂?섏? ?딆? ?꾨뱶 媛?援먯껜 諛?援ъ“ ?⑥닚??
 *  </pre>
 */

@Controller
public class EgovSignupController {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovSignupController.class);

	@Autowired
	private OAuthVO naverAuthVO;

	@Autowired
	private OAuthVO googleAuthVO;

	@Autowired
	private OAuthVO kakaoAuthVO;

	@RequestMapping(value = "/uat/uia/oauthLoginUsr", method = RequestMethod.GET)
	public String login(Model model) throws Exception {
		LOGGER.debug("===>>> OAuth Login .....");

		OAuthLogin naverLogin = new OAuthLogin(naverAuthVO);
		LOGGER.debug("naverLogin.getOAuthURL() = "+naverLogin.getOAuthURL());
		model.addAttribute("naver_url", naverLogin.getOAuthURL());

		OAuthLogin googleLogin = new OAuthLogin(googleAuthVO);
		LOGGER.debug("googleLogin.getOAuthURL() = "+googleLogin.getOAuthURL());
		model.addAttribute("google_url", googleLogin.getOAuthURL());

		OAuthLogin kakaoLogin = new OAuthLogin(kakaoAuthVO);
		LOGGER.debug("kakaoLogin.getOAuthURL() = "+kakaoLogin.getOAuthURL());
		model.addAttribute("kakao_url", kakaoLogin.getOAuthURL());

		return "egovframework/com/uat/uia/EgovLoginUsrOauth";
	}

	@RequestMapping(value = "/auth/{oauthService}/callback", method = { RequestMethod.GET, RequestMethod.POST })
	public String oauthLoginCallback(@PathVariable String oauthService, Model model, @RequestParam String code) throws Exception {

		LOGGER.debug("oauthLoginCallback: service={}", oauthService);
		LOGGER.debug("===>>> code = "+ code);

		OAuthVO oauthVO = null;
		if (StringUtils.equals(OAuthConfig.GOOGLE_SERVICE_NAME, oauthService)) {
			oauthVO = googleAuthVO;
		} else if (StringUtils.equals(OAuthConfig.NAVER_SERVICE_NAME, oauthService)) {
			oauthVO = naverAuthVO;
		} else {
			oauthVO = kakaoAuthVO;
		}

		// 1. code瑜??댁슜?댁꽌 Access Token 諛쏄린
		// 2. Access Token???댁슜?댁꽌 ?ъ슜???쒓났?뺣낫 媛?몄삤湲?
		OAuthLogin oauthLogin = new OAuthLogin(oauthVO);

		OAuthUniversalUser oauthUser = oauthLogin.getUserProfile(code); // 1,2踰??숈떆
		LOGGER.debug("Profile ===>>" + oauthUser);

		// ========================================================================
		// ?ㅼ쓬 遺遺꾩? ?낅Т??紐⑹쟻??留욊쾶 而ㅼ뒪? 肄붾뱶瑜??묒꽦?쒕떎.
		// 3. ?대떦 ?좎?媛 DB??議댁옱?섎뒗吏 泥댄겕 (google, naver, kakao?먯꽌 ?꾨떖諛쏆? ID媛 議댁옱?섎뒗吏 泥댄겕)
//		String resultDBInfo = ""; // DB 泥댄겕 寃곌낵

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (oauthUser == null) {
			// 誘몄〈?ъ떆 媛?낇럹?댁?濡?!
			model.addAttribute("message", "This user does not exist. Please sign up.");
		} else {
			// 議댁옱??濡쒓렇??泥섎━
			model.addAttribute("message", "OAuth Sign-in succeeded.");
		}

		return "egovframework/com/uat/uia/EgovLoginUsrOauthResult";
	}

}
