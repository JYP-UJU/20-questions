const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors());
app.use(express.json());

// 정적 파일 제공
app.use(express.static('public'));

// Claude API 엔드포인트
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { baseQuestion, previousQuestions = [], stepNumber } = req.body;

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'API key not found' });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          { 
            role: "user", 
            content: `"${baseQuestion}"에 대한 ${stepNumber}단계 탐구입니다.

이전 질문들: ${previousQuestions.length > 0 ? previousQuestions.join(', ') : '없음'}

"${baseQuestion}"와 관련된 구체적이고 흥미로운 새로운 질문 5개를 제안해주세요.

다음 JSON 형식으로만 답변해주세요:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}

JSON 외에는 다른 텍스트를 포함하지 마세요.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.content[0].text.trim();
    
    // JSON 부분만 추출
    if (content.includes('{')) {
      content = content.substring(content.indexOf('{'));
      content = content.substring(0, content.lastIndexOf('}') + 1);
    }
    
    const questions = JSON.parse(content);
    res.json(questions);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'API 호출 실패',
      details: error.message 
    });
  }
});

// 루트 경로
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
