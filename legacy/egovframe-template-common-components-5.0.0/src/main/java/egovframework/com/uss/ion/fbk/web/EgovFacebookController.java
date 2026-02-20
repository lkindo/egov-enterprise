/*
 * Copyright 2014 the original author or authors.
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
 * Simple little @Controller that invokes Facebook and renders the result.
 * The injected {@link Facebook} reference is configured with the required authorization credentials for the current user behind the scenes.
 * @author Keith Donald
 */
package egovframework.com.uss.ion.fbk.web;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import egovframework.com.cmm.annotation.IncludedInfo;

/**
 * Facebook??泥섎━?섎뒗 Controller Class 援ы쁽
 * @author ?쒖??꾨젅?꾩썙?ъ꽱??
 * @since 2014.11.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??    	?섏젙??         		      ?섏젙?댁슜
 *  -----------    --------------------    ---------------------------
 *  2014.11.10		?쒖??꾨젅?꾩썙?ъ꽱??	      理쒖큹 ?앹꽦
 *  2018.10.02		?좎슜??	      profile ?몄텧 ?섏젙
 *  </pre>
 */
@Controller
public class EgovFacebookController {
	
	/**
	 * facebook 濡쒓렇??踰꾪듉??蹂댁뿬以 ?? 濡쒓렇?몄씠 ?꾨즺?섎㈃ ?곕룞???꾪븳 紐⑸줉??蹂댁뿬以??
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name="Facebook ?곕룞",order = 831 ,gid = 50)
	@RequestMapping(value = "/uss/ion/fbk/EgovFacebookSignin.do", method = RequestMethod.GET)
	public String home() {
		return "egovframework/com/uss/ion/fbk/EgovFacebookSignin";
	}

	/**
	 * facebook ?대꼈??紐⑸줉??蹂댁뿬以??
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/fbk/feed.do", method=RequestMethod.POST)
	public String showFeed() {
		return "egovframework/com/uss/ion/fbk/EgovFacebookFeed";
	}

	/**
	 * facebook ?⑤쾾 紐⑸줉??蹂댁뿬以??
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/fbk/albums.do", method=RequestMethod.GET)
	public String showAlbums(Model model) {
		return "egovframework/com/uss/ion/fbk/EgovFacebookAlbums";
	}

	/**
	 * facebook ?⑤쾾 ?댁슜??蹂댁뿬以??
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/fbk/album/{albumId}", method=RequestMethod.GET)
	public String showAlbum(@PathVariable("albumId") String albumId, Model model) {
		model.addAttribute("albumId", albumId);
		return "egovframework/com/uss/ion/fbk/EgovFacebookAlbum";
	}

	/**
	 * facebook profile??蹂댁뿬以??
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value="/uss/ion/fbk/profile.do", method=RequestMethod.GET)
	public String profile(Model model) {
		return "egovframework/com/uss/ion/fbk/EgovFacebookProfile";
	}

}
