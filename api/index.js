module.exports = (req, res) => {
  // 구글 연동 다 무시하고, 카카오톡에 무조건 답장을 꽂아넣는 테스트
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(200).json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: "🎉 Vercel 연결 대성공! 드디어 프록시를 통과했습니다!"
          }
        }
      ]
    }
  });
};
