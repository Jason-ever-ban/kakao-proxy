module.exports = async (req, res) => {
  // 🛑 주의: 아래 주소를 재영님의 '구글 앱스 스크립트 배포 URL(/exec)'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxrekMu69GUi0lU8djKxRqgVSOhwEnrgS0O7g3NmMPlvGY33ClXeQpd52wItCqWGssL/exec";

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    // 1. 카카오의 요청을 구글로 전달
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      redirect: "follow"
    });

    // 2. 구글이 돌려준 답변을 텍스트로 확인
    const rawText = await response.text();

    try {
      // 3. 정상적인 JSON인지 확인해보고, 맞으면 카카오로 바로 전달!
      const jsonData = JSON.parse(rawText);
      return res.status(200).json(jsonData);
      
    } catch (parseError) {
      // 🚨 4. [범인 검거] 구글이 JSON이 아닌 HTML 에러 페이지를 보냈을 때!
      // 카카오가 1002 에러로 튕겨내지 못하게 텍스트 말풍선에 담아서 카톡방에 그대로 띄웁니다.
      return res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: "🚨 구글이 이상한 문서를 보냈습니다 (원인 파악용):\n\n" + rawText.substring(0, 400)
            }
          }]
        }
      });
    }

  } catch (error) {
    // Vercel 자체 통신 에러
    return res.status(200).json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "프록시 통신 에러: " + error.message } }] }
    });
  }
};
