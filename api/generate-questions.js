app.post('/api/generate-concepts', async (req, res) => {
  try {
    const { baseQuestion, previousQuestion, userThought, history } = req.body;
    
    console.log('개념어 생성 API 요청:', { baseQuestion, previousQuestion });

    if (!process.env.CLAUDE_API_KEY) {
      console.error('Claude API key가 없습니다');
      return res.status(500).json({ error: 'API key not found' });
    }

    const prompt = `사용자가 "${baseQuestion}"에 대해 탐구 중입니다.

${userThought ? `
이전 질문: "${previousQuestion}"
사용자의 생각: "${userThought}"

이 생각을 바탕으로 더 탐구할 수 있는 개념어 8개를 제안해주세요.
` : `
"${baseQuestion}"에 대한 답을 찾기 위해 고려해야 할 개념어 8개를 제안해주세요.
`}

조건:
- 한두 단어로 간단하게
- 답을 찾는데 실제로 도움이 되는 개념
- 다양한 관점 포함
- 초등학생도 이해할 수 있는 쉬운 말

예시: "크기", "색깔", "위치", "구조", "기능", "종류"

JSON만 응답:
{"concepts": ["개념1", "개념2", "개념3", "개념4", "개념5", "개념6", "개념7", "개념8"]}`;

    console.log('개념어 생성 API 호출 시작');

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",  
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", 
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      console.error(`Claude API 오류: ${response.status}`);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.content[0].text.trim();
    
    // JSON 추출
    if (content.includes('{')) {
      content = content.substring(content.indexOf('{'));
      content = content.substring(0, content.lastIndexOf('}') + 1);
    }
    
    const result = JSON.parse(content);
    console.log('개념어 생성 성공:', result);
    
    res.json(result);

  } catch (error) {
    console.error('개념어 생성 API Error:', error);
    res.status(500).json({ 
      error: 'API 호출 실패',
      details: error.message 
    });
  }
});
