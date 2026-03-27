module.exports = async (req, res) => {
  // 🛑 주의: 아래 주소를 재영님의 '구글 앱스 스크립트 배포 URL(/exec)'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxrekMu69GUi0lU8djKxRqgVSOhwEnrgS0O7g3NmMPlvGY33ClXeQpd52wItCqWGssL/exec";

  // 응답 형식을 무조건 JSON으로 강제 설정
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      redirect: "follow" // 302 리다이렉트를 끝까지 따라갑니다.
    });

    // 구글에서 보낸 답변을 텍스트로 먼저 받습니다.
    const textData = await response.text();
    
    let jsonData;
    try {
      jsonData = JSON.parse(textData);
    } catch (parseError) {
      // 구글 응답이 JSON이 아닐 경우 (디버깅용 안전장치)
      return res.status(200).json({
        version: "2.0",
        template: { outputs: [{ simpleText: { text: "구글 응답 파싱 에러. 코드를 확인해주세요." } }] }
      });
    }

    // 카카오톡으로 정상적인 JSON 전달 (200 OK)
    return res.status(200).json(jsonData);

  } catch (error) {
    // Vercel 서버 자체 에러가 날 경우
    return res.status(200).json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "Vercel 서버 통신 에러: " + error.message } }] }
    });
  }
};
